const UserModel = require('../models/userModel');
const moment = require('moment');

const ioAuth = async(payload,done) => {
  if ( payload.id ) {
    return done(null,{ id:payload.id, username:payload.username });
  }

  if ( !payload.refreshToken ) {
    return done(new Error('Not Authorized'));
  }

  try {
    const [ user ] = await new UserModel().select({
      columns:['id_user as id','username'],
      where:{ refresh_token_socket:payload.refreshToken }
    });
  
    if ( !user ) {
      return done(new Error('Not Authorized'));
    }

    return done(null,user);
  } catch(e) {
    return done(e);
  }
}

module.exports = ioAuth;