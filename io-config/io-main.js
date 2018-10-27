module.exports = (io) => {
  const { db:{ User,Friend,Message,Operation } } = require('../Models/Models');
  const users = {};
  const FCM = require('../libs/FCM');

  io.users = users;
  io.updateFriends = require('./io-updateFriends')(io,Friend);
  io.updateAOMstatus = require('./io-updateAOMStatus')(io,Friend);
  io.emitOrSaveOperation = require('./io-emitOrSaveOperation')(io,User,Operation);
  io.updateOnlineStatus = require('./io-updateOnlineStatus')(io,Friend);
  io.socketLockdown = require('./io-socketLockdown');

  io.on('connection',async(socket) => {
    const userID = socket.request.user.id;

    await io.socketLockdown.wait(userID);

    io.socketLockdown.lock(userID);

    socket.emit('success', { message:'success logged in!' });

    if ( socket.request.user.newToken ) {
      socket.emit('new_token',{ token:socket.request.user.newToken });
    }

    let [ userFriends,user,operations ] = await Promise.all([
      Friend.getFriendsForUserWithID(userID),
      User.findOne({
        attributes:[
          'id_user','online','username','push_registration_token',
          'push_notifications_enabled'
        ],
        where:{ id_user:userID },
      }),
      Operation.findAll({
        where:{ id_user:userID }
      })
    ]);

    users[userID] = {
      socketID:socket.id,
      friends:userFriends,
      user:user.get(),
      socket,
      tempOperations:[]
    }

    if ( operations.length > 0 ) {
      Operation.destroy({ where:{ id_operation:operations.map(x => x.id_operation) } });

      let lastLoginLogoutID = null;

      for ( let i = operations.length - 1 ; i >= 0 ; i-- ) {
        if ( ['friend:login','friend:logout'].indexOf(operations[i].name) !== -1 ) {
          lastLoginLogoutID = operations[i].id_operation;
          break;
        }
      }
  
      if ( lastLoginLogoutID ) {
        operations = operations.filter(op => {
          if ( op.name === 'friend:login' || op.name === 'friend:logout' ) {
            return op.id_operation === lastLoginLogoutID;
          }

          return true;
        });
      }

      socket.emit('operations:new_operations', { operations });
    }

    io.socketLockdown.unlock(userID,'connect');

    socket.on('new:message',async({ userID,message }) => {
      try {
        const { id:senderID, username:senderUsername } = socket.request.user;
        const friend = users[senderID].friends.find(x => x.id_user === userID);
        // if user is in his friends list, we are ready to sent
        // if user is online, attempt to send him message, or save operation
        // else store it in db so he can read it when online, if enabled
        if ( friend ) {
          if ( friend.online === 0 && friend.allow_offline_messages === 0 ) {
            return;
          }

          try {
            await Message.create({
              id_sending:senderID,
              id_receiving:userID,
              message
            });
          } catch(e) {
            return io.to(users[senderID].socketID).emit('message:error');
          }

          const { emited,user } = await io.emitOrSaveOperation(
            userID,
            'message:new-message',
            { senderID,senderUsername,message,id_sending:senderID },
          );

          if ( user.push_notifications_enabled && user.push_registration_token ) {
            if ( !(user.online === 0 && user.allow_offline_messages === 0) ) {
              try {
                await FCM.send(user.push_registration_token,{
                  notification:{
                    sound:'default',
                    title:senderUsername,
                    body:message,
                    tag:senderUsername,
                    icon:'icon'
                  },
                  data:{
                    username:senderUsername,
                    message
                  }
                },{
                  sound:'default',
                  priority:'high',
                  icon:'icon',
                  collapseKey:socket.request.user.username,
                });
              } catch(e) {
                global.Logger.log(e,'socket_io:main');
              }
            }
          }

          if ( emited ) { return; } 

          if ( !user.online ) {
            io.to(users[senderID].socketID).emit('message:user-not-online');
          }
        } else {
          io.to(users[senderID].socketID).emit('message:not-in-friends-list');
        }
      } catch(e) {
        global.Logger.log(e,'socket_io:main');
      }
    });

    socket.on('disconnect',async() => {
      try {
        const userID = socket.request.user.id;

        if ( users[userID].tempOperations.length > 0 ) {
          await Promise.all(users[userID].tempOperations.map(op => {
            return Operation.create({
              name:op.operationName,
              data:JSON.stringify(op.data),
              id_user:op.id_user
            });
          }));
        }

        delete users[userID];
      } catch(e) {
        global.Logger.log(e,'socket_io:main');
      } finally {
        io.socketLockdown.unlock(userID,'disconnect');
      }
    });
  });
}