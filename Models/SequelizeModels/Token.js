const initTokenModel = (sequelize,DataTypes) => {
  const Token = sequelize.define('Token',{
    id_token:{
      primaryKey:true,
      autoIncrement:true,
      type:DataTypes.INTEGER
    },
    token:{
      type:DataTypes.STRING(100),
      allowNull:false,
      allowEmpty:false
    },
    token_date:{
      type:DataTypes.DATE,
      allowNull:false,
      defaultValue:DataTypes.NOW
    },
  },{
    timestamps:false,
    freezeTableName:true,
    tableName:'Token'
  });

  Token.insertOrUpdateToken = async function({ userID:id_user,token }) {
    await this.destroy({ where:{ id_user } });

    return await this.create({ token,id_user });
  }

  Token.associate = (models) => {
    Token.belongsTo(models.User,{
      foreignKey:{
        name:'id_user',
        targetKey: 'id_user',
        allowNull:false
      },
      onDelete:'cascade'
    });
  }

  return Token;
}

module.exports = initTokenModel;