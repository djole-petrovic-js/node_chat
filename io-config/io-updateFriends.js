const updateFriends = (io,Friend) => async(friend1,friend2) => {
  try {
    if ( io.users[friend1] ) {
      io.users[friend1].friends = await Friend.getFriendsForUserWithID(friend1);
    }

    if ( io.users[friend2] ) {
      io.users[friend2].friends = await Friend.getFriendsForUserWithID(friend2);
    }
  } catch(e) {
    global.Logger.log(e,'socket_io:updateFriends');
  }
}

module.exports = updateFriends;