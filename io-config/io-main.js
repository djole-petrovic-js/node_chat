module.exports = (io) => {
  const { db:{ User,Friend,Message } } = require('../Models/Models');
  const users = {};
  const FCM = require('../libs/FCM');

  io.users = users;
  io.updateFriends = require('./io-updateFriends')(io,Friend);
  io.updateAOMstatus = require('./io-updateAOMStatus')(io,Friend);
  io.emitOrSaveOperation = require('./io-emitOrSaveOperation')(io,User);
  io.updateOnlineStatus = require('./io-updateOnlineStatus')(io,Friend);
  io.socketLockdown = require('./io-socketLockdown');

  io.on('connection',async(socket) => {
    console.log('connected');
    const userID = socket.request.user.id;

    await io.socketLockdown.wait(userID);

    io.socketLockdown.lock(userID);

    socket.emit('success', { message:'success logged in!' });

    if ( socket.request.user.newToken ) {
      socket.emit('new_token',{ token:socket.request.user.newToken });
    }

    const [ userFriends,user ] = await Promise.all([
      Friend.getFriendsForUserWithID(userID),
      User.findOne({
        attributes:[
          'id_user','online','username','push_registration_token',
          'push_notifications_enabled'
        ],
        where:{ id_user:userID },
      }),
    ]);

    users[userID] = {
      socketID:socket.id,
      friends:userFriends,
      user:user.get(),
      socket,
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
            friend
          );

          if ( user.push_notifications_enabled && user.push_registration_token ) {
            if ( !(user.online === 0 && user.allow_offline_messages === 0) ) {
              try {
                await FCM.send(user.push_registration_token,{
                  notification:{
                    sound:'default',
                    title:senderUsername,
                    body:message,
                    tag:senderUsername
                  },
                  data:{
                    username:senderUsername,
                    message
                  }
                },{
                  sound:'default',
                  priority:'high',
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
      console.log('disconected');
      try {
        const userID = socket.request.user.id;

        delete users[userID];
      } catch(e) {
        global.Logger.log(e,'socket_io:main');
      } finally {
        io.socketLockdown.unlock(userID,'disconnect');
      }
    });
  });
}