const { db:{ User } } = require('../Models/Models');

const ioAuth = (io) => async(payload,done) => {
  try {
    const user = await User.findOne({
      raw:true,
      attributes:[
        ['id_user','id'],'email','username',
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