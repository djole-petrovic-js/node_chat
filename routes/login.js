const 
  express    = require('express'),
  passport   = require('passport'),
  UserModel  = require('../models/userModel'),
  Password   = require('../libs/password'),
  jwt        = require('jsonwebtoken'),
  jwtOptions = require('../utils/passport/passport-jwt-config'),
  genError   = require('../utils/generateError'),
  Validator  = require('jsonschema').Validator,
  Logger     = require('../libs/Logger'),
  randtoken  = require('rand-token'),
  moment     = require('moment'),
  Auth       = require('../libs/Auth'),
  router     = express.Router();

const validateDeviceInfo = require('../utils/validateDeviceInfo');

const emailPasswordSchema = {
  type:'object',
  properties:{
    email:{ type:'string' },
    password:{ type:'string' },
    deviceInfo:{
      type:'object',
      properties:{
        uuid:{ type:['string',null] },
        serial:{ type:['string',null] },
        manufacturer:{ type:['string',null] }
      },
      required:['uuid','serial','manufacturer'],
      additionalProperties:false
    }
  },
  additionalProperties:false,
  required:['email','password','deviceInfo']
};

const pinSchema = {
  type:'object',
  additionalProperties:false,
  required:['deviceInfo','pin'],
  properties:{
    pin:{ type:'string' },
    deviceInfo:{
      type:'object',
      properties:{
        uuid:{ type:['string',null] },
        serial:{ type:['string',null] },
        manufacturer:{ type:['string',null] }
      },
      required:['uuid','serial','manufacturer'],
      additionalProperties:false
    }
  }
};

router.post('/',async (req,res,next) => {
  try {
    const validEmailPasswordRequest = new Validator().validate(
      req.body,emailPasswordSchema
    ).valid;

    const validPinRequest = new Validator().validate(
      req.body,pinSchema
    ).valid;

    if ( !validEmailPasswordRequest && !validPinRequest ) {
      return res.json({
        error:true,
        errorMessage:'Missing credentials',
        errorCode:'MISSING_CREDENTIALS'
      });
    }

    // data from Auth output, contains user, error and wheather to log error or not
    const data = await (validPinRequest
      ? Auth.loginWithPin(req.body) 
      : Auth.loginWithEmailPassword(req.body)
    );

    if ( !data.success ) {
      if ( data.logError ) {
        Logger.log(data.logError,'login');
      }

      return next(data.error);
    }

    const refreshToken = randtoken.uid(256);

    await new UserModel().update({
      columns:[
        'refresh_token','refresh_token_date',
        'refresh_device_info_json'
      ],
      values:[
        refreshToken,
        moment().toISOString(),
        JSON.stringify(req.body.deviceInfo)
      ],
      where:{ id_user:data.user.id_user }
    });

    return res.json({
      success:true,
      refreshToken,
      token:jwt.sign(
        { id:data.user.id_user,username:data.user.username },
        jwtOptions.secretOrKey ,
        { expiresIn: '25m' }
      )
    });
  } catch(e) {
    Logger.log(e,'login:root');

    return next(genError('LOGIN_FATAL_ERROR'));
  }
});

router.post('/refresh_token',passport.authenticate('jwt',{ session:false }),async(req,res,next) => {
  try {
    res.json({
      success:true,
      token:jwt.sign(
        { id:req.user.id_user , username:req.user.username },
        jwtOptions.secretOrKey ,
        { expiresIn: '25m' }
      )
    });
  } catch(e) {
    Logger.log(e,'login:refresh_token');

    return next(genError('LOGIN_FATAL_ERROR'));
  }
});

// refresh a token if user is not logged in
router.post('/grant_access_token',async(req,res,next) => {
  try {
    const isValidRequest = new Validator().validate(req.body,{
      type:'object',
      additionalProperties:false,
      required:['deviceInfo','refreshToken'],
      properties:{
        refreshToken:{ type:'string' },
        deviceInfo:{
          type:'object',
          properties:{
            uuid:{ type:['string',null] },
            serial:{ type:['string',null] },
            manufacturer:{ type:['string',null] }
          },
          required:['uuid','serial','manufacturer'],
          additionalProperties:false
        }
      }
    });

    if ( !isValidRequest.valid ) {
      return next(genError('LOGIN_FATAL_ERROR'));
    }

    const User = new UserModel();

    const [ user ] = await User.select({
      where:{ refresh_token:req.body.refreshToken }
    });

    // check if token exists
    if ( !user ) {
      return next(genError('LOGIN_FATAL_ERROR'));
    }

    const refreshTokenDate = moment(user.refresh_token_date);

    // refresh token lasts for 24 hours
    if ( moment().diff(refreshTokenDate,'hours') >= 24 ) {
      return next(genError('LOGIN_FATAL_ERROR'));
    }
    
    // if user has unique device enabled
    // check if request comes from that device
    // else check the device user has logged in from last time
    const userDeviceInfo = user.unique_device
      ? user
      : JSON.parse(user.refresh_device_info_json);

    if ( !validateDeviceInfo(userDeviceInfo,req.body.deviceInfo) ) {
      return next(genError('LOGIN_FATAL_ERROR'));
    }

    return res.json({
      success:true,
      token:jwt.sign(
        { id:user.id_user , username:user.username },
        jwtOptions.secretOrKey ,
        { expiresIn: '25m' }
      )
    });
  } catch(e) {
    Logger.log(e,'login:grant_access_token');

    return next(genError('LOGIN_FATAL_ERROR'));
  }
})




router.post('/logout',passport.authenticate('jwt',{ session:false }),async(req,res,next) => {
  try {
    const User = new UserModel();

    await User.update({
      columns:['refresh_token','refresh_token_date','refresh_device_info_json'],
      values:[null,null,null],
      where:{ id_user:req.user.id_user }
    });

    return res.json({ success:true });
  } catch(e) {
    Logger.log(e,'login:logout');

    return next(genError('LOGIN_FATAL_ERROR'));
  }
});




router.get('/check_login',passport.authenticate('jwt',{ session:false }),async(req,res) => {
  res.json({
    isLoggedIn:!!req.user
  });
});

module.exports = router;