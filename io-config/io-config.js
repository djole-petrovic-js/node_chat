module.exports = (io) => {
  const 
    UserModel     = require('../models/userModel'),
    FriendsModel  = require('../models/friendsModel'),
    MessagesModel = require('../models/messagesModel'),
    User          = new UserModel(),
    Friend        = new FriendsModel(),
    users         = {};

  io.users = users;

  io.updateFriends = async(friend1,friend2) => {
    if ( users[friend1] ) {
      users[friend1].friends = await Friend.getFriendsForUserWithID(friend1);
    }

    if ( users[friend2] ) {
      users[friend2].friends = await Friend.getFriendsForUserWithID(friend2);
    }
  }

  io.updateAOMstatus = async(userID,value) => {
    if ( users[userID] ) {
      users[userID].user.allow_offline_messages = value;
    }

    const friends = await Friend.getFriendsForUserWithID(userID);

    for ( friend of friends ) {
      if ( users[friend.id_user] ) {
        const userToChangeStatus = users[friend.id_user].friends.find(
          x => x.id_user === userID
        );

        if ( userToChangeStatus ) {
          userToChangeStatus.allow_offline_messages = value;
        }
      }
    }
  }

  io.on('connection', async(socket) => {
    const userID = socket.decoded_token.id;

    const [userFriends,user] = await Promise.all([
      Friend.getFriendsForUserWithID(userID),
      User.select({
        where:{ id_user:userID },
        limit:1
      }),
      User.update({
        columns:['online'],
        values:[1],
        where:{
          id_user:userID
        }
      })
    ]);

    users[userID] = {
      socketID:socket.id,
      friends:userFriends,
      user
    };

    users[userID].friends.filter(x => !!users[x.id_user]).forEach(x => {
      io.to(users[x.id_user].socketID).emit('friend:login',{ friendID:userID });
    });

    socket.on('new:message',async({ userID,message }) => {
      const { id:senderID, username:senderUsername } = socket.decoded_token;

      const friend = users[senderID].friends.find(
        ({ id_user }) => id_user === userID
      );

      if ( friend ) {
        if ( users[userID] ) {
          io.to(users[userID].socketID).emit('message:new-message',{
            senderID,
            senderUsername,
            message
          });
        } else {
          io.to(users[senderID].socketID).emit('message:user-not-online');

          if ( friend.allow_offline_messages ) {
            try {
              const Messages = new MessagesModel();
  
              await Messages.insert({
                id_sending:senderID,
                id_receiving:userID,
                message
              });
  
            } catch(e) { } 
          }
        }
      } else {
        io.to(users[senderID].socketID).emit('message:not-in-friends-list');
      }
    });

    socket.on('disconnect', async() => {
      const userID = socket.decoded_token.id;

      await User.update({
        columns:['online'],
        values:[0],
        where:{
          id_user:userID
        }
      });

      for ( let { id_user } of users[userID].friends ) {
        if ( users[id_user] ) {
          io.to(users[id_user].socketID).emit('friend:logout',{
            friendID:userID
          });
        }
      }

      delete users[userID];
    });
  });
}