module.exports = function(io) {
  const
  router    = require('express').Router(),
  passport  = require('passport'),
  Form      = require('../libs/Form'),
  Password  = require('../libs/password'),
  Validator = require('jsonschema').Validator,
  genError  = require('../utils/generateError'),
  Logger    = require('../libs/Logger'),
  UserModel = require('../models/userModel');

  router.get('/userinfo',passport.authenticate('jwt',{ session:false }),async(req,res,next) => {
    try {
      const id_user = req.user.id_user;
      const User = new UserModel();

      const [user] = await User.select({
        columns:[
          'username','email','date_created','allow_offline_messages',
          'unique_device'
        ],
        where:{ id_user },
        limit:1
      });

      return res.json(user);
    } catch(e) {
      Logger.log(e,'users');

      return next(genError('USERS_FETCH_INFO_FAILED'));
    }
  });



  router.post('/set_binary_settings',passport.authenticate('jwt',{ session:false }),async(req,res,next) => {
    try {
      const isValid = new Validator().validate(req.body,{
        type:'object',
        additionalProperties:false,
        required:['setting','value'],
        properties:{
          setting:{ type:'string' },
          value:{ type:'number' }
        }
      }).valid;

      if ( !(isValid && [0,1].includes(req.body.value)) ) {
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

      return res.json({
        success:true
      })
    } catch(e) {
      Logger.log(e,'users');

      return next(genError('USERS_FATAL_ERROR'));
    }
  });



  router.post('/changepassword',passport.authenticate('jwt',{ session:false }),async(req,res,next) => {
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
        const error = new Error();
        error.errorCode = 'USERS_INVALID_DATA';

        return next(error);
      }

      const id_user = req.user.id_user;
      const User = new UserModel();
      const [user] = await User.select({ where:{ id_user } });
      const password = new Password(req.body.currentPassword);
      const { isMatched } = await password.comparePasswords(user.password);

      if ( !isMatched ) {
        const error = new Error();
        error.errorCode = 'USERS_PASSWORD_INVALID';

        return next(error);
      }

      const hash = await new Password(req.body.newPassword).hashPassword();

      await User.update({
        columns:['password'],
        values:[hash],
        where:{ id_user }
      });

      return res.json({
        success:true
      });

    } catch(e) {
      Logger.log(e,'users');
    
      return next(genError('USERS_FATAL_ERROR'));
    }
  });

  return router;
};