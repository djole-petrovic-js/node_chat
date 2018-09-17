const UserModel = require('../models/userModel');
const User = new UserModel();

const ioAuth = (io) => async(payload,done) => {
  try {
    const [ user ] = await User.select({
      limit:1,
      columns:[
        'id_user as id','email','username',
        'allow_offline_messages'
      ],
      where:{ id_user:payload.id }
    });

    if ( !user ) {
      return done(new Error('User does not exist.'));
    }

    await io.socketLockdown.wait(user.id);

    return done(null,user);
  } catch(e) {
    return done(e);
  }
}

module.exports = ioAuth;