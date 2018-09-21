const initNotificationTypeModel = (sequelize,DataTypes) => {
  const NotificationType = sequelize.define('Notification_type',{
    id_notification_type:{
      primaryKey:true,
      autoIncrement:true,
      type:DataTypes.INTEGER
    },
    notification_name:{
      type:DataTypes.STRING(45),
      allowNull:false,
      allowEmpty:false
    }
  },{
    timestamps:false,
    freezeTableName:true,
    tableName:'Notification_type'
  });

  return NotificationType;
}

module.exports = initNotificationTypeModel;