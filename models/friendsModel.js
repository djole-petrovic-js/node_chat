const Model = require('./model');

class FriendsModel extends Model {
  constructor(tableName) {
    super();

    this.tableName = tableName || 'friend';
  }

  async getFriendsForUserWithID(id) {
    try {
      return await this.select({
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
    } catch(e) {
      throw e;
    }
  }

  async insertNewFriend(friendsOptions) {
    try {
      return await this.insert(friendsOptions);
    } catch(e) {
      throw e;
    }
  }

  async confirmFriends(userIDsOptions) {
    try {
      const [ userID1 , userID2 ] = userIDsOptions.userIDs;

      const [ update1 , update2 ] = await Promise.all([
        this.update({
          columns:['confirmed'],
          values:[ 1 ],
          where:{
            id_friend_is:userID1,
            id_friend_with:userID2
          }
        }),
        this.update({
          columns:['confirmed'],
          values:[ 1 ],
          where:{
            id_friend_is:userID2,
            id_friend_with:userID1
          }
        })
      ]);

      return {
        updateFriend1:update1,
        updateFriend2:update2
      };
    } catch(e) {
      throw e;
    }
  }
}

module.exports = FriendsModel;