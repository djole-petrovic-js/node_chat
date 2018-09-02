const 
  JwtStrategy = require('passport-jwt').Strategy,
  opts        = require('./passport-jwt-config'),
  UserModel   = require('../../models/userModel');

const Strategy = new JwtStrategy(opts,async(jwt_payload,done) => {
  try {
    const User = new UserModel();

    const [ user ] = await User.select({
      columns:['id_user','email','username'],
      limit:1,
      where:{ id_user:jwt_payload.id }
    });

    if ( !user ) {
      return done(null,false);
    }

    return done(null,user);
  } catch(e) {
    return done(e);
  }
});

module.exports = Strategy;