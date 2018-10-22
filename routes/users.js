module.exports = function(io) {
  const
    router       = require('express').Router(),
    passport     = require('passport'),
    Form         = require('../libs/Form'),
    Password     = require('../libs/password'),
    Validator    = require('jsonschema').Validator,
    genError     = require('../utils/generateError'),
    Logger       = require('../libs/Logger');

  const validateDeviceInfo = require('../utils/validateDeviceInfo');
  const deviceInfoRules = require('../config/deviceInfo');

  const { sequelize,db:{ User,Friend,BannedEmail,Operation } } = require('../Models/Models');

  router.use(passport.authenticate('jwt',{ session:false }));

  router.get('/userinfo',async(req,res,next) => {
    try {
      const user = await User.findOne({
        attributes:[
          'username','date_created',
          'allow_offline_messages','pin',
          'unique_device','pin_login_enabled',
          'push_notifications_enabled'
        ],
        where:{ id_user:req.user.id_user },
      });
      // notifify that user has set his pin, so he can change it
      const settings = await user.get();

      settings.pin = !!user.pin;

      return res.json(settings);
    } catch(e) {
      Logger.log(e,'users:userinfo');

      return next(genError('USERS_FETCH_INFO_FAILED'));
    }
  });



  router.get('/bundled_data',async(req,res,next) => {
    try {
      const sqlPending = `
        SELECT id_user,username
        FROM Friend f
        INNER JOIN User u
        ON f.id_friend_with = u.id_user
        WHERE id_friend_is = ? AND confirmed = 0
      `;

      const sqlNotifications = `
        SELECT id_notification,id_notification_type,username,id_user
        FROM Notification n
        INNER JOIN User u
        ON n.notification_from = u.id_user
        WHERE notification_to = ?
      `;

      const [ friends,pendingRequests,notifications,settings ] = await Promise.all([
        Friend.getFriendsForUserWithID(req.user.id_user),
        sequelize.query(sqlPending,{
          replacements:[req.user.id_user],
          type: sequelize.QueryTypes.SELECT
        }),
        sequelize.query(sqlNotifications,{
          replacements:[req.user.id_user],
          type: sequelize.QueryTypes.SELECT
        }),
        User.findOne({
          raw:true,
          attributes:[
            'username','date_created',
            'allow_offline_messages','pin',
            'unique_device','pin_login_enabled',
            'push_notifications_enabled'
          ],
          where:{ id_user:req.user.id_user },
        })
      ]);

      settings.pin = !!settings.pin;

      return res.json({
        friends,
        pendingRequests,
        notifications,
        settings
      });
    } catch(e) {
      Logger.log(e,'users:bundled_data');

      return next(genError('USERS_FATAL_ERROR'));
    }
  });



  router.post('/delete_operations',async(req,res,next) => {
    try {
      // if operation id is not sent, delete all operations
      // else delete just one operation
      const where = req.body.id_operation
        ? { id_operation:req.body.id_operation,id_user:req.user.id_user }
        : { id_user:req.user.id_user };

      await Operation.destroy({ where });

      return res.json({ success:true });
    } catch(e) {
      Logger.log(e,'users:delete_operations');

      return next(genError('USERS_FATAL_ERROR'));
    }
  });



  router.post('/set_fcm_token',async(req,res,next) => {
    try {
      const token = req.body.token;

      if ( !token ) {
        return next(genError('USERS_FATAL_ERROR'));
      }

      await User.update({
        push_registration_token:token
      },{
        where:{ id_user:req.user.id_user }
      });

      return res.json({ success:true });
    } catch(e) {
      Logger.log(e,'users:set_fcm_token');

      return next(genError('USERS_FATAL_ERROR'));
    }
  });




  router.post('/set_binary_settings',async(req,res,next) => {
    try {
      const isValidRequest = new Validator().validate(req.body,{
        type:'object',
        additionalProperties:false,
        required:['setting','value'],
        properties:{
          setting:{ type:'string' },
          value:{ type:'number' }
        }
      }).valid;

      if ( !(isValidRequest && [0,1].includes(req.body.value)) ) {
        return next(genError('USERS_FATAL_ERROR'));
      }

      if ( req.body.setting === 'unique_device' ) {
        if ( req.body.value === 0 ) {
          await User.update({
            pin_login_enabled:0
          },{
            where:{ id_user:req.user.id_user }
          });
        }
      }

      if ( req.body.setting === 'pin_login_enabled' ) {
        const user = await User.findOne({ where:{ id_user:req.user.id_user } });

        if ( !user.unique_device ) {
          return next(genError('PIN_UNIQUE_DEVICE_OFF'));
        }

        if ( !user.pin ) {
          return next(genError('PIN_SETTING_FIRST_TIME'));
        }
      }

      if ( req.body.setting === 'push_notifications_enabled' ) {
        if ( io.users[req.user.id_user] ) {
          io.users[req.user.id_user].user.push_notifications_enabled = req.body.value;
        }
      }

      if ( req.body.setting === 'allow_offline_messages' ) {
        await io.updateAOMstatus(req.user.id_user,req.body.value);
      }

      await User.update({
        [req.body.setting]:req.body.value
      },{
        where:{ id_user:req.user.id_user }
      });

      return res.json({ success:true });
    } catch(e) {
      Logger.log(e,'users:set_binary_settings');

      return next(genError('USERS_FATAL_ERROR'));
    }
  });


  // if user pin is null, use this setting it for the first time
  // if exists, ask for his old pin
  router.post('/change_pin',async(req,res,next) => {
    try {
      const isValidRequest = new Validator().validate(req.body,{
        type:'object',
        additionalProperties:false,
        required:['pin','deviceInfo'],
        properties:{
          pin:{ type:'string' },
          pinConfirmed:{ type:'string' },
          oldPin:{ type:'string' },
          deviceInfo:deviceInfoRules
        }
      }).valid;

      if ( !isValidRequest ) {
        return next(genError('USERS_FATAL_ERROR'));
      }

      const { pin } = req.body;

      const user = await User.findOne({
        where:{ id_user:req.user.id_user }
      });

      if ( !validateDeviceInfo(user,req.body.deviceInfo) ) {
        return next(genError('UNIQUE_DEVICE_ERROR'));
      }

      const form = new Form({ pin:'bail|required|regex:^[1-9][0-9]{3}$' });

      form.bindValues({ pin });
      form.validate();

      if ( !form.isValid() ) {
        return next(genError('USERS_FATAL_ERROR'));
      }

      // if pin is null, it is being set for the first time
      if ( !user.pin ) {
        const hashedPin = await new Password(pin).hashPassword();

        await User.update({
          pin:hashedPin
        },{
          where:{ id_user:req.user.id_user }
        });

        return res.json({ success:true });
      }
      // pin is already set, now we need to change it.
      // pin is already verified, so compare it to confirm PIN
      // and verify old pin
      const { pin:newPIN,pinConfirmed,oldPin } = req.body;

      if ( newPIN !== pinConfirmed ) {
        return next(genError('USERS_FATAL_ERROR'));
      }

      const { isMatched } = await new Password(oldPin).comparePasswords(user.pin);

      if ( !isMatched ) {
        return res.json({
          error:true,
          errorCode:'USERS_PIN_INVALID'
        })
      }

      const hashedPin =  await new Password(newPIN).hashPassword();

      await User.update({
        pin:hashedPin
      },{
        where:{ id_user:req.user.id_user }
      });

      return res.json({ success:true });
    } catch(e) {
      Logger.log(e,'users:change_pin');

      return next(genError('USERS_FATAL_ERROR'));
    }
  });



  router.post('/changepassword',async(req,res,next) => {
    try {
      const isValid = new Validator().validate(req.body,{
        type:'object',
        additionalProperties:false,
        required:['currentPassword','newPassword','confirmNewPassword'],
        properties:{
          currentPassword:{ type:'string' },
          newPassword:{ type:'string' },
          confirmNewPassword:{ type:'string' },
          deviceInfo:deviceInfoRules
        }
      }).valid;

      if ( !isValid ) {
        return next(genError('USERS_INVALID_DATA'));
      }

      const user = await User.findOne({ where:{ id_user:req.user.id_user } });

      if ( !validateDeviceInfo(user,req.body.deviceInfo) ) {
        return next(genError('UNIQUE_DEVICE_ERROR'));
      }

      const passwordRegex = '^(?=.*\\d)(?=.*[a-z])(?=.*[A-Z])[0-9a-zA-Z._]{8,25}$';

      const form = new Form({
        currentPassword:'bail|required',
        newPassword:`bail|required|minlength:8|maxlength:16|regex:${passwordRegex}:g|same:confirmNewPassword`,
        confirmNewPassword:'bail|required'
      });

      form.bindValues(req.body);
      form.validate();

      if ( !form.isValid() ) {
        return next(genError('USERS_INVALID_DATA'));
      }

      const { isMatched } = await new Password(req.body.currentPassword).comparePasswords(user.password);

      if ( !isMatched ) {
        return next(genError('USERS_PASSWORD_INVALID'));
      }

      const hash = await new Password(req.body.newPassword).hashPassword();

      await User.update({
        password:hash
      },{
        where:{ id_user:req.user.id_user }
      });

      return res.json({ success:true });
    } catch(e) {
      Logger.log(e,'users:changepassword');
    
      return next(genError('USERS_FATAL_ERROR'));
    }
  });




  router.post('/delete_account',async(req,res,next) => {
    try {
      const isValidRequest = new Validator().validate(req.body,{
        type:'object',
        additionalProperties:false,
        required:['password','deviceInfo'],
        properties:{
          password:{ type:'string' },
          deviceInfo:deviceInfoRules
        }
      }).valid;

      if ( !isValidRequest ) {
        return next(genError('USERS_DELETE_ACCOUNT_FATAL_ERROR'));
      }

      const user = await User.findOne({
        where:{ id_user:req.user.id_user }
      });

      if ( !user ) {
        return next(genError('USERS_DELETE_ACCOUNT_FATAL_ERROR'));
      }

      if ( !validateDeviceInfo(user,req.body.deviceInfo) ) {
        return next(genError('UNIQUE_DEVICE_ERROR'));
      }

      const { isMatched } = await new Password(req.body.password).comparePasswords(user.password);

      if ( !isMatched ) {
        return res.json({
          error:true,
          errorCode:'USERS_DELETE_ACCOUNT_WRONG_PASSWORD'
        });
      }

      const friends = await Friend.getFriendsForUserWithID(req.user.id_user);

      await BannedEmail.create({ banned_email:user.email });

      await Promise.all([
        User.destroy({
          where:{ id_user:req.user.id_user }
        }),
        ...friends.map(friend => io.emitOrSaveOperation(
          friend.id_user,
          'friends:friend-you-removed',
          { IdUserRemoving:req.user.id_user },
          friend
        ))
      ]);

      for ( const friend of friends ) {
        if ( io.users[friend.id_user] ) {
          const friendIndex = io.users[friend.id_user].friends.findIndex(x => {
            return x.id_user === req.user.id_user
          });

          if ( friendIndex !== -1 ) {
            io.users[friend.id_user].friends.splice(friendIndex,1);
          }
        }
      }

      return res.json({ success:true });
    } catch(e) {
      Logger.log(e,'users:delete_account');
    
      return next(genError('USERS_DELETE_ACCOUNT_FATAL_ERROR'));
    }
  });

  return router;
};