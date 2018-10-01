const { db:{ User } } = require('../Models/Models');
const randtoken  = require('rand-token');
const moment = require('moment');

const ioAuth = (io) => async(socket,next) => {
  try {
    const { id:uuid,auth_token } = socket.handshake.query;

    if ( !uuid || !auth_token ) {
      return next(new Error('Error occured'));
    }

    const user = await User.findOne({
      raw:true,
      attributes:[
        ['id_user','id'],'email','username',
        'allow_offline_messages',
        'socket_io_token_date'
      ],
      where:{
        socket_io_token:auth_token,
        device_uuid:uuid
      }
    });

    if ( !user ) {
      return next(new Error('token expired'));
    }

    socket.request.user = { id:user.id,username:user.username };

    const socketIoTokenDate = moment(user.socket_io_token);

    if ( moment().diff(socketIoTokenDate,'hours') >= 24 ) {
      const socketIoToken = randtoken.uid(255);

      await User.update({
        socket_io_token:socketIoToken,
        socket_io_token_date:moment().toISOString()
      },{
        where:{ id_user:user.id }
      });

      socket.request.user.newToken = socketIoToken;
    }

    await io.socketLockdown.wait(user.id);

    return next();
  } catch(e) {
    global.Logger.log(e,'socket_io:io_auth');

    return next(new Error('Error occured'));
  }
}

module.exports = ioAuth;