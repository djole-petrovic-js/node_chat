const Password = require('../../libs/password');

const initUserModel = (sequelize,DataTypes) => {
  const User = sequelize.define('User',{
    id_user:{
      primaryKey:true,
      autoIncrement:true,
      type:DataTypes.INTEGER
    },
    username:{
      type:DataTypes.STRING(16),
      unique:true,
      allowNull:false,
      allowEmpty:false
    },
    email:{
      type:DataTypes.STRING(255),
      unique:true,
      allowNull:false,
      allowEmpty:false
    },
    password:{
      type:DataTypes.STRING(255),
      allowNull:false
    },
    account_activated:{
      type:DataTypes.BOOLEAN,
      defaultValue: 0,
    },
    account_deleted:{
      type:DataTypes.BOOLEAN,
      defaultValue: 0,
    },
    online:{
      type:DataTypes.BOOLEAN,
      defaultValue: 0,
    },
    date_created:{
      type:DataTypes.DATE,
      defaultValue:DataTypes.NOW
    },
    allow_offline_messages:{
      type:DataTypes.BOOLEAN,
      defaultValue: 1,
    },
    unique_device:{
      type:DataTypes.BOOLEAN,
      defaultValue: 1,
    },
    device_uuid:{
      type:DataTypes.STRING(50),
      allowNull:true,
      defaultValue:null
    },
    device_serial:{
      type:DataTypes.STRING(50),
      allowNull:true,
      defaultValue:null
    },
    device_manufacturer:{
      type:DataTypes.STRING(30),
      allowNull:true,
      defaultValue:null
    },
    refresh_token:{
      type:DataTypes.STRING(255),
      allowNull:true,
      defaultValue:null
    },
    refresh_token_date:{
      type:DataTypes.STRING(30),
      allowNull:true,
      defaultValue:null
    },
    pin_login_enabled:{
      type:DataTypes.BOOLEAN,
      defaultValue: 0,
    },
    pin:{
      type:DataTypes.STRING(255),
      allowNull:true,
      defaultValue:null
    },
    refresh_device_info_json:{
      type:DataTypes.TEXT,
      allowNull:true,
      defaultValue:null
    },
    push_registration_token:{
      type:DataTypes.STRING(255),
      allowNull:true,
      defaultValue:null
    }
  },{
    freezeTableName:true,
    tableName:'User',
    timestamps:false
  });

  User.beforeCreate(async(user) => {
    user.password = await new Password(user.password).hashPassword();
  });

  User.associate = (models) => {
    User.hasMany(models.Operation,{
      foreignKey:{
        name:'id_user',
        targetKey: 'id_user',
        allowNull:false
      },
      onDelete:'cascade'
    });
  }

  return User;
}

module.exports = initUserModel;