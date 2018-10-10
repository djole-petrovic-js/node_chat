const initBannedEmailModel = (sequelize,DataTypes) => {
  const BannedEmail = sequelize.define('BannedEmail',{
    id_bannedemail:{
      type:DataTypes.INTEGER,
      primaryKey:true,
      autoIncrement:true
    },
    banned_email:{
      type:DataTypes.STRING(255),
      unique:true,
      allowNull:false,
      allowEmpty:false
    }
  },{
    freezeTableName:true,
    tableName:'BannedEmail',
    timestamps:false
  });

  return BannedEmail;
}

module.exports = initBannedEmailModel;