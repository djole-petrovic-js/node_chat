const 
  JwtStrategy = require('passport-jwt').Strategy,
  opts        = require('./passport-jwt-config'),
  UserModel   = require('../../models/userModel');

const Strategy = new JwtStrategy(opts,async (jwt_payload,done) => {
  const { id } = jwt_payload;

  const User = new UserModel();

  try {
    const [ user ] = await User.select({
      columns:['id_user','email','username'],
      limit:1,
      where:{ id_user : id }
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