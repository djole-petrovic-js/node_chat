// for a use with userID, try to send him some message
// if he is not connected to the socket save it as operation
// if he is offline, he will get updated data when logging in.
const emitOrSaveOperation = (io,User,Operation) => async(userID,operationName,data,user) => {
  try {
    if ( io.users[userID] ) {
      const tempOperation = { operationName, data, id_user:userID };
  
      io.users[userID].tempOperations.push(tempOperation);
  
      io.users[userID].socket.emit(operationName,data,() => {
        const index = io.users[userID].tempOperations.findIndex(x => {
          return x === tempOperation;
        });
  
        io.users[userID].tempOperations.splice(index,1);
      });
  
      return { emited:true,saved:false,user:io.users[userID].user };
    }
  
    if ( !user ) {
      [ user ] = await User.select({
        columns:['id_user','online'],
        limit:1,
        where:{ id_user:userID }
      });
    }
  
    if ( user.online ) {
      await Operation.insert({
        name:operationName,
        data:JSON.stringify(data),
        id_user:user.id_user
      });

      return { emited:false,saved:true,user };
    }
  
    return { emited:false,saved:false,user };
  } catch(e) {
    global.Logger.log(e,'socket_io');
    return { emited:false,saved:false,user:{} };
  }
}

module.exports = emitOrSaveOperation;