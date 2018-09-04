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
  router     = express.Router();

const validateDeviceInfo = require('../utils/validateDeviceInfo');

router.post('/',async (req,res,next) => {
  try {
    const isValid = new Validator().validate(req.body,{
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
    }).valid;
  
    if ( !isValid ) {
      return res.json({
        error:true,
        errorMessage:'Missing credentials',
        errorCode:'MISSING_CREDENTIALS'
      });
    }
  
    const { email,password,deviceInfo } = req.body;
    const User = new UserModel();
    const UserPassword = new Password(password);

    const [ user ] = await User.select({
      columns:[
        'id_user','email',
        'username','password',
        'account_activated',
        'unique_device','device_uuid',
        'device_serial','device_manufacturer'
      ],
      limit:1,
      where:{ email }
    });

    if ( !user ) {
      return res.json({
        error:true,
        errorMessage:'Email or password is incorect',
        errorCode:'EMAIL_PASSWORD_INCORRECT'
      });
    }

    const { isMatched } = await UserPassword.comparePasswords(user.password);

    if ( !isMatched ) {
      return res.json({
        error:true,
        errorMessage:'Email or password is incorect',
        errorCode:'EMAIL_PASSWORD_INCORRECT'
      });
    }

    if ( user.account_activated !== 1 ) {
      return res.json({
        error:true,
        errorMessage:'Your account is not activated',
        errorCode:'ACCOUNT_NOT_ACTIVATED'
      });
    }

    if ( user.unique_device ) {
      if ( !validateDeviceInfo(user,deviceInfo) ) {
        return next(genError('LOGIN_FATAL_ERROR'));
      }
    }

    const refreshToken = randtoken.uid(256);
    const isoStr = moment().toISOString();

    await User.update({
      columns:['refresh_token','refresh_token_date'],
      values:[refreshToken,isoStr],
      where:{ email }
    });

    return res.json({
      success:true,
      refreshToken,
      token:jwt.sign(
        { id:user.id_user , username:user.username },
        jwtOptions.secretOrKey ,
        { expiresIn: '25m' }
      )
    });

  } catch(e) {
    Logger.log(e,'login');

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
    Logger.log(e,'login');

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
    
    // check the user device
    if ( user.unique_device && !validateDeviceInfo(user,req.body.deviceInfo) ) {
      return next(genError('LOGIN_FATAL_ERROR'));
    }

    // if everything is fine, send a new access token
    return res.json({
      success:true,
      token:jwt.sign(
        { id:user.id_user , username:user.username },
        jwtOptions.secretOrKey ,
        { expiresIn: '25m' }
      )
    });
  } catch(e) {
    Logger.log(e,'login');

    return next(genError('LOGIN_FATAL_ERROR'));
  }
})

router.get('/check_login',passport.authenticate('jwt',{ session:false }),async(req,res) => {
  res.json({
    isLoggedIn:!!req.user
  });
});

module.exports = router;