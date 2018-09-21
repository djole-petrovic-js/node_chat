const 
  JwtStrategy = require('passport-jwt').Strategy,
  opts = require('./passport-jwt-config');

const { db:{ User } } = require('../../Models/Models');

const Strategy = new JwtStrategy(opts,async(jwt_payload,done) => {
  try {
    const user = await User.findOne({
      attributes:['id_user','email','username'],
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