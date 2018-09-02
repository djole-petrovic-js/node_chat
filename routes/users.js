module.exports = function(io) {
  const
    router    = require('express').Router(),
    passport  = require('passport'),
    mailer    = require('nodemailer'),
    bluebird  = require('bluebird'),
    Form      = require('../libs/Form'),
    Password  = require('../libs/password'),
    Validator = require('jsonschema').Validator,
    genError  = require('../utils/generateError'),
    Logger    = require('../libs/Logger'),
    UserModel = require('../models/userModel');

  const validateDeviceInfo = require('../utils/validateDeviceInfo');

  router.use(passport.authenticate('jwt',{ session:false }));

  router.get('/userinfo',async(req,res,next) => {
    try {
      const User = new UserModel();

      const [user] = await User.select({
        columns:[
          'username','email',
          'date_created','allow_offline_messages',
          'unique_device'
        ],
        where:{ id_user:req.user.id_user },
        limit:1
      });

      return res.json(user);
    } catch(e) {
      Logger.log(e,'users');

      return next(genError('USERS_FETCH_INFO_FAILED'));
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

      const User = new UserModel();

      await User.update({
        columns:[req.body.setting],
        values:[req.body.value],
        where:{ id_user:req.user.id_user }
      });

      if ( req.body.setting === 'allow_offline_messages' ) {
        await io.updateAOMstatus(req.user.id_user,req.body.value);
      }

      return res.json({ success:true });
    } catch(e) {
      Logger.log(e,'users');

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
          confirmNewPassword:{ type:'string' }
        }
      }).valid;

      if ( !isValid ) {
        return next(genError('USERS_INVALID_DATA'));
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

      const User = new UserModel();
      const [ user ] = await User.select({ where:{ id_user:req.user.id_user } });
      const { isMatched } = await new Password(req.body.currentPassword).comparePasswords(user.password);

      if ( !isMatched ) {
        return next(genError('USERS_PASSWORD_INVALID'));
      }

      const hash = await new Password(req.body.newPassword).hashPassword();

      await User.update({
        columns:['password'],
        values:[hash],
        where:{ id_user:req.user.id_user }
      });

      const mailOptions = {
        to:user.email,
        from:process.env.EMAIL,
        subject:'Password Change.',
        html:`
          <h1>NHC | Password has changed</h1>
          <p>Your password has been changed.</p>
          <p>If this wasn't you, please reply to this email.</p>
          <p>If this email is not expected, please just ignore it.</p>
        `
      };

      const transporter = bluebird.promisifyAll(mailer.createTransport(
        `smtps://${ process.env.EMAIL }:${ process.env.EMAIL_PASSWORD }@smtp.gmail.com`
      ));

      try { await transporter.sendMail(mailOptions); } catch(e) { }

      return res.json({ success:true });
    } catch(e) {
      Logger.log(e,'users');
    
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
          deviceInfo:{
            type:'object',
            additionalProperties:false,
            requred:['uuid','serial','manufacturer'],
            properties:{
              uuid:{ type:['string',null] },
              serial:{ type:['string',null] },
              manufacturer:{ type:['string',null] }
            }
          }
        }
      }).valid;

      if ( !isValidRequest ) {
        return next(genError('USERS_DELETE_ACCOUNT_FATAL_ERROR'));
      }

      const User = new UserModel();

      const [ user ] = await User.select({
        where:{ id_user:req.user.id_user }
      });

      if ( !user ) {
        return next(genError('USERS_DELETE_ACCOUNT_FATAL_ERROR'));
      }

      if ( user.unique_device && !validateDeviceInfo(user.device_info,req.body.deviceInfo) ) {
        return next(genError('USERS_DELETE_ACCOUNT_FATAL_ERROR'))
      }

      const { isMatched } = await new Password(req.body.password).comparePasswords(user.password);

      if ( !isMatched ) {
        return res.json({
          error:true,
          errorCode:'USERS_DELETE_ACCOUNT_WRONG_PASSWORD'
        });
      }

      await User.deleteMultiple({
        confirm:true,
        where:{ id_user:req.user.id_user }
      });

      return res.json({ success:true });
    } catch(e) {
      Logger.log(e,'users');
    
      return next(genError('USERS_DELETE_ACCOUNT_FATAL_ERROR'));
    }
  });

  return router;
};