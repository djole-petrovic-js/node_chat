const UserModel = require('../models/userModel');
const genError  = require('../utils/generateError');
const validateDeviceInfo = require('../utils/validateDeviceInfo');
const Password = require('../libs/password');

class Auth {
  static async loginWithEmailPassword(body) {
    try {
      const [ user ] = await new UserModel().select({
        limit:1,
        columns:[
          'id_user','email',
          'username','password',
          'account_activated',
          'unique_device','device_uuid',
          'device_serial','device_manufacturer'
        ],
        where:{ email:body.email }
      });

      if ( !user ) {
        return { success:false,error:genError('EMAIL_PASSWORD_INCORRECT') }
      }

      const { isMatched } = await new Password(body.password).comparePasswords(user.password);

      if ( !isMatched ) {
        return { success:false,error:genError('EMAIL_PASSWORD_INCORRECT') }
      }
  
      if ( user.account_activated !== 1 ) {
        return { success:false, error:genError('ACCOUNT_NOT_ACTIVATED') }
      }

      if ( user.unique_device ) {
        if ( !validateDeviceInfo(user,body.deviceInfo) ) {
          return { success:false, error:genError('LOGIN_FATAL_ERROR') }
        }
      }

      return {
        success:true,
        user:{
          id_user:user.id_user,
          username:user.username
        }
      };
    } catch(e) {
      return {
        success:false,
        error:genError('LOGIN_FATAL_ERROR'),
        logError:e
      }
    }
  }

  static async loginWithPin(body) {
    try {
      const User = new UserModel();

      const [ user ] = await User.select({
        columns:[
          'id_user','username',
          'unique_device','device_uuid',
          'device_serial','device_manufacturer',
          'pin_login_enabled','pin'
        ],
        limit:1,
        where:{
          device_uuid:body.deviceInfo.uuid,
          device_serial:body.deviceInfo.serial,
          device_manufacturer:body.deviceInfo.manufacturer
        }
      });

      if ( !user ) {
        return { success:false,error:genError('LOGIN_FATAL_ERROR') }
      }

      if ( !(user.unique_device && user.pin_login_enabled && user.pin) ) {
        return { success:false,error:genError('LOGIN_FATAL_ERROR') }
      }

      if ( !validateDeviceInfo(user,body.deviceInfo) ) {
        return { success:false,error:genError('LOGIN_FATAL_ERROR') }
      }

      const { isMatched } = await new Password(body.pin).comparePasswords(user.pin);

      if ( !isMatched ) {
        return { success:false,error:genError('LOGIN_INVALID_PIN') }
      }

      return {
        success:true,
        user:{
          id_user:user.id_user,
          username:user.username
        }
      };
    } catch(e) {
      return {
        success:false,
        error:genError('LOGIN_FATAL_ERROR'),
        logError:e
      }
    }
  }
}

module.exports = Auth;