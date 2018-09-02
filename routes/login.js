const 
  express    = require('express'),
  passport   = require('passport'),
  UserModel  = require('../models/userModel'),
  Password   = require('../libs/password'),
  jwt        = require('jsonwebtoken'),
  jwtOptions = require('../utils/passport/passport-jwt-config'),
  genError   = require('../utils/generateError'),
  validator  = require('jsonschema').Validator,
  Logger     = require('../libs/Logger'),
  router     = express.Router();

const validateDeviceInfo = require('../utils/validateDeviceInfo');

router.post('/',async (req,res,next) => {
  try {
    const isValid = new validator().validate(req.body,{
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
        'account_activated','device_info',
        'unique_device'
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
      if ( !validateDeviceInfo(user.device_info,deviceInfo) ) {
        return next(genError('LOGIN_FATAL_ERROR'));
      }
    }

    res.json({
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

router.get('/check_login',passport.authenticate('jwt',{ session:false }),async(req,res) => {
  res.json({
    isLoggedIn:!!req.user
  });
});

module.exports = router;