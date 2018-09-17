const updateOnlineStatus = (io,Friend) => async(userID,value) => {
  try {
    const friends = await Friend.getFriendsForUserWithID(userID);

    await Promise.all(friends.map(friend => io.emitOrSaveOperation(
      friend.id_user,
      value === 1 ? 'friend:login' : 'friend:logout',
      { friendID:userID },
      friend
    )));
  } catch(e) {
    global.Logger.log(e,'socket_io');
  }
}

module.exports = updateOnlineStatus;