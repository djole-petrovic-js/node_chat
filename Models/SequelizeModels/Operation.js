const initOperationModel = (sequelize,DataTypes) => {
  const Operation = sequelize.define('Operation',{
    id_operation:{
      primaryKey:true,
      type:DataTypes.INTEGER,
      autoIncrement:true
    },
    name:{
      type:DataTypes.STRING(100),
      allowNull:false,
      allowEmpty:false
    },
    data:{
      type:DataTypes.TEXT,
      allowEmpty:false,
      allowNull:false
    }
  },{
    timestamps:false,
    freezeTableName:true,
    tableName:'Operation'
  });

  Operation.associate = (models) => {
    Operation.belongsTo(models.User,{
      foreignKey:{
        name:'id_user',
        targetKey: 'id_user',
        allowNull:false
      },
      onDelete:'cascade'
    });
  }

  return Operation;
}

module.exports = initOperationModel;