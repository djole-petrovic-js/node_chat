const ExtractJwt = require('passport-jwt').ExtractJwt;

const jwtOptions = {
  jwtFromRequest:ExtractJwt.fromAuthHeader(),
  secretOrKey:process.env.JWT_SECRET
};

module.exports = jwtOptions;