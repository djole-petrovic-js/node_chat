const initFriendsModel = (sequelize,DataTypes) => {
  const Friend = sequelize.define('Friend',{
    id_friend_is:{
      primaryKey:true,
      type:DataTypes.INTEGER
    },
    id_friend_with:{
      primaryKey:true,
      type:DataTypes.INTEGER
    },
    confirmed:{
      type:DataTypes.BOOLEAN,
      defaultValue:0,
      allowNull:false
    }
  },{
    timestamps:false,
    freezeTableName:true,
    tableName:'Friend'
  });

  Friend.associate = (models) => {
    Friend.belongsTo(models.User,{
      foreignKey:{
        name:'id_friend_with',
        targetKey: 'id_user',
        allowNull:false
      },
      onDelete:'cascade'
    });

    Friend.belongsTo(models.User,{
      foreignKey:{
        name:'id_friend_is',
        targetKey: 'id_user',
        allowNull:false
      },
      onDelete:'cascade'
    });
  }

  Friend.confirmFriends = async function(userIDsOptions) {
    const [ userID1 , userID2 ] = userIDsOptions.userIDs;

    const [ update1, update2 ] = await Promise.all([
      this.update({ confirmed:1 },{
        where:{ id_friend_is:userID1, id_friend_with:userID2 }
      }),
      this.update({ confirmed:1 },{
        where:{ id_friend_is:userID2, id_friend_with:userID1 }
      })
    ]);
    
    return {
      updateFriend1:update1,
      updateFriend2:update2
    };
  }

  Friend.insertNewFriend = async function(friend) {
    return await this.create(friend);
  }

  Friend.getFriendsForUserWithID = async(id) => {
    const query = `
      SELECT id_user, username, online, allow_offline_messages
      FROM Friend f
      INNER JOIN User u
      ON f.id_friend_with = u.id_user
      WHERE id_friend_is = ? AND confirmed = 1
    `;

    return await sequelize.query(query,{
      replacements:[id],
      type: sequelize.QueryTypes.SELECT
    });
  }

  return Friend;
}

module.exports = initFriendsModel;