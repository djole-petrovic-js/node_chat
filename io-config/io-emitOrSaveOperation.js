const FCM = require('../libs/FCM');

const emitOrSaveOperation = (io,User) => async(userID,operationName,data,user) => {
  try {
    if ( io.users[userID] ) {
      io.users[userID].socket.emit(operationName,data);

      return { emited:true,saved:false,user:io.users[userID].user };
    }

    const tempOperation = { operationName, data:JSON.stringify(data) };

    if ( !user || !user.push_registration_token ) {
      user = await User.findOne({
        attributes:[
          'id_user','online','push_registration_token',
          'push_notifications_enabled'
        ],
        where:{ id_user:userID }
      });
    }

    if ( user.online && user.push_registration_token) {
      await FCM.send(user.push_registration_token,{
        data:tempOperation
      },{
        priority:'high'
      });
    }

    return { emited:false,saved:true,user };
  } catch(e) {
    await global.Logger.log(e,'socket_io:emit_or_save');
    await global.Logger.log('For op : ' + operationName,'socket_io:emit_or_save');
    await global.Logger.log('For user : ' + userID,'socket_io:emit_or_save');

    return { emited:false,saved:false,user:{},error:true };
  }
}

module.exports = emitOrSaveOperation;