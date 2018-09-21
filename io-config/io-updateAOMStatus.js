/* User maybe is not online, have to update manualy */
// For a user with ID, find his friends, and notify them about
// allow offline messages status.
const updateAOMStatus = (io,Friend) => async(userID,value) => {
  try {
    if ( io.users[userID] ) {
      io.users[userID].user.allow_offline_messages = value;
    }

    const friends = await Friend.getFriendsForUserWithID(userID);

    for ( friend of friends ) {
      if ( io.users[friend.id_user] ) {
        const userToChangeStatus = io.users[friend.id_user].friends.find(
          x => x.id_user === userID
        );

        if ( userToChangeStatus ) {
          userToChangeStatus.allow_offline_messages = value;
        }
      }
    }
  } catch(e) {
    global.Logger.log(e,'socket_io:updateAOMStatus');
  }
}

module.exports = updateAOMStatus;
