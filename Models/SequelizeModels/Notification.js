const initNotificationModel = (sequelize,DataTypes) => {
  const Notification = sequelize.define('Notification',{
    id_notification:{
      primaryKey:true,
      autoIncrement:true,
      type:DataTypes.INTEGER
    },
    id_notification_type:{
      type:DataTypes.INTEGER,
      allowNull:false
    },
    notification_from:{
      type:DataTypes.INTEGER,
      allowNull:false
    },
    notification_to:{
      type:DataTypes.INTEGER,
      allowNull:false
    }
  },{
    timestamps:false,
    freezeTableName:true,
    tableName:'Notification'
  });

  return Notification;
}

module.exports = initNotificationModel;