const { db:{ User } } = require('../Models/Models');

const ioAuth = (io) => async(payload,done) => {
  await io.socketLockdown.wait(payload.id);

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

    return done(null,user);
  } catch(e) {
    return done(e);
  }
}

module.exports = ioAuth;