const Model = require('./model');

class FriendsModel extends Model {
  constructor(tableName) {
    super();

    this.tableName = tableName || 'friend';
  }

  getFriendsForUserWithID(id) {
    return new Promise(async(resolve,reject) => {
      try {
        const friends = await this.select({
          columns:['id_user','username','online','allow_offline_messages'],
          alias:'f',
          innerJoin:{
            user:['u','f.id_friend_with','u.id_user']
          },
          where:{
            id_friend_is:id,
            confirmed:1
          }
        });

        resolve(friends);
      } catch(e) {
        reject(e);
      }
    });
  }

  insertNewFriend(friendsOptions) {
    return new Promise(async(resolve,reject) => {
      try {
        const result = await this.insert(friendsOptions);

        resolve(result);
      } catch(e) {
        reject(e);
      }
    });
  }

  confirmFriends(userIDsOptions) {
    return new Promise(async (resolve,reject) => {
      const [ userID1 , userID2 ] = userIDsOptions.userIDs;

      try {
        const updateFriend1 = this.update({
          columns:['confirmed'],
          values:[ 1 ],
          where:{
            id_friend_is:userID1,
            id_friend_with:userID2
          }
        });

        const updateFriend2 = this.update({
          columns:['confirmed'],
          values:[ 1 ],
          where:{
            id_friend_is:userID2,
            id_friend_with:userID1
          }
        });

        const [ update1 , update2 ] = await Promise.all(
          [updateFriend1,updateFriend2]
        );

        resolve({
          updateFriend1:update1,
          updateFriend2:update2
        });

      } catch(e) {
        console.log(e);
        reject(e);
      }
    });
  }
}

module.exports = FriendsModel;