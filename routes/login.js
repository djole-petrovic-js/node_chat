module.exports = (io) => {
  const 
    express    = require('express'),
    passport   = require('passport'),
    jwt        = require('jsonwebtoken'),
    jwtOptions = require('../utils/passport/passport-jwt-config'),
    genError   = require('../utils/generateError'),
    Validator  = require('jsonschema').Validator,
    Logger     = require('../libs/Logger'),
    randtoken  = require('rand-token'),
    moment     = require('moment'),
    Auth       = require('../libs/Auth'),
    bluebird   = require('bluebird'),
    router     = express.Router();

  const validateDeviceInfo = require('../utils/validateDeviceInfo');
  const deviceInfoRules = require('../config/deviceInfo');

  const { db:{ User } } = require('../Models/Models');

  const emailPasswordSchema = {
    type:'object',
    properties:{
      email:{ type:'string' },
      password:{ type:'string' },
      deviceInfo:deviceInfoRules
    },
    additionalProperties:false,
    required:['email','password','deviceInfo']
  };

  const pinSchema = {
    type:'object',
    properties:{
      pin:{ type:'string' },
      deviceInfo:deviceInfoRules
    },
    additionalProperties:false,
    required:['deviceInfo','pin']
  };

  const initDetectLoginMethod = (body) => (schema) => {
    return new Validator().validate(body,schema).valid;
  }

  router.post('/',async (req,res,next) => {
    try {
      const detectLoginMethod = initDetectLoginMethod(req.body);
      
      const loginMethod = detectLoginMethod(emailPasswordSchema)
        ? 'loginWithEmailPassword'
        : detectLoginMethod(pinSchema)
        ? 'loginWithPin'
        : null;

      if ( !loginMethod ) {
        return res.json({
          error:true,
          errorMessage:'Missing credentials',
          errorCode:'MISSING_CREDENTIALS'
        });
      }

      const data = await Auth[loginMethod](req.body);

      if ( !data.success ) {
        if ( data.logError ) {
          Logger.log(data.logError,'login');
        }

        return next(data.error);
      }

      const refreshToken = randtoken.uid(255);
      const date = moment().toISOString();

      await User.update({
        online:1,
        refresh_token:refreshToken,
        refresh_token_date:date,
        refresh_device_info_json:JSON.stringify(req.body.deviceInfo)
      },{
        where:{ id_user:data.user.id_user }
      });

      await io.updateOnlineStatus(data.user.id_user,1);

      return res.json({
        success:true,
        refreshToken,
        token:jwt.sign(
          { id:data.user.id_user,username:data.user.username, date },
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
          { id:req.user.id_user , username:req.user.username,date:moment().toISOString() },
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
        required:['deviceInfo','refreshToken','token'],
        properties:{
          refreshToken:{ type:'string' },
          token:{ type:'token' },
          deviceInfo:deviceInfoRules
        }
      });

      if ( !isValidRequest.valid ) {
        return next(genError('LOGIN_FATAL_ERROR'));
      }

      const verify = bluebird.promisify(jwt.verify);

      try {
        const decoded = await verify(req.body.token,jwtOptions.secretOrKey);
        // verify token comes from the device user owns
        const user = await User.findOne({
          raw:true,
          attributes:[
            'id_user',
            'device_uuid',
            'device_serial',
            'device_manufacturer',
            'unique_device',
            'refresh_device_info_json'
          ],
          where:{ id_user:decoded.id }
        });

        if ( !user ) {
          return next(genError('LOGIN_FATAL_ERROR'));
        }

        const userDeviceInfo = user.unique_device
          ? user
          : JSON.parse(user.refresh_device_info_json);

        if ( !validateDeviceInfo(userDeviceInfo,req.body.deviceInfo) ) {
          return next(genError('LOGIN_FATAL_ERROR'));
        }

        const tokenDate = moment(decoded.date);
        const minutesExpired = moment().diff(tokenDate,'minutes');
        let token;

        if ( minutesExpired >= 14 ) {
          token = jwt.sign(
            { id:decoded.id,username:decoded.username,date:moment().toISOString() },
            jwtOptions.secretOrKey ,
            { expiresIn: '25m' }
          );
        }

        return res.json({
          success:true,
          token
        });
      } catch(e) {
        console.log(e);
        // it error occures, its because token validation failed (most likely expired)
        // and process needs to move on to grant new token via refresh token
        // so its okay to just do nothing in catch.
      }

      const user = await User.findOne({
        where:{ refresh_token:req.body.refreshToken }
      });
      // check if token exists
      if ( !user ) {
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

      const refreshTokenDate = moment(user.refresh_token_date);
      let refreshToken = null;
      // refresh token lasts for 24 hours
      // if it is expired, send a new one
      if ( moment().diff(refreshTokenDate,'hours') >= 24 ) {
        refreshToken = randtoken.uid(255);

        await User.update({
          refresh_token:refreshToken,
          refresh_token_date:moment().toISOString(),
        },{
          where:{ id_user:user.id_user }
        });
      }
      
      return res.json({
        success:true,
        refreshToken,
        token:jwt.sign(
          { id:user.id_user , username:user.username,date:moment().toISOString() },
          jwtOptions.secretOrKey ,
          { expiresIn: '25m' }
        )
      });
    } catch(e) {
      Logger.log(e,'login:grant_access_token');

      return next(genError('LOGIN_FATAL_ERROR'));
    }
  });




  router.post('/logout',passport.authenticate('jwt',{ session:false }),async(req,res,next) => {
    try {
      await User.update({
        online:0,
        refresh_token:null,
        refresh_token_date:null,
        refresh_device_info_json:null
      },{
        where:{ id_user:req.user.id_user }
      });

      await io.updateOnlineStatus(req.user.id_user,0);

      return res.json({ success:true });
    } catch(e) {
      Logger.log(e,'login:logout');

      return next(genError('LOGIN_FATAL_ERROR'));
    }
  });




  router.post('/change_login_status',passport.authenticate('jwt',{ session:false }),async(req,res,next) => {
    try {
      await User.update({
        online:req.body.status
      },{
        where:{ id_user:req.user.id_user }
      });

      await io.updateOnlineStatus(req.user.id_user,req.body.status);

      return res.send({ success:true });
    } catch(e) {
      Logger.log(e,'login:change_login_status');

      return next(genError('LOGIN_FATAL_ERROR'));
    }
  });



  router.get('/heartbeat',(req,res) => {
    res.status(200).json({ success:true });
  });


  return router;
}