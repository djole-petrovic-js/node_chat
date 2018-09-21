const initMessageModel = (sequelize,DataTypes) => {
  const Message = sequelize.define('Message',{
    id_message:{
      primaryKey:true,
      autoIncrement:true,
      type:DataTypes.INTEGER
    },
    id_sending:{
      type:DataTypes.INTEGER,
      allowNull:false
    },
    id_receiving:{
      type:DataTypes.INTEGER,
      allowNull:false
    },
    message:{
      type:DataTypes.STRING(255),
      allowNull:false,
      allowEmpty:false,
    },
    date:{
      type:DataTypes.DATE,
      defaultValue:DataTypes.NOW,
      allowNull:false
    }
  },{
    timestamps:false,
    freezeTableName:true,
    tableName:'Message'
  });

  return Message;
}

module.exports = initMessageModel;