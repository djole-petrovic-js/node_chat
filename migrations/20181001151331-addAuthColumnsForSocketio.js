'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.addColumn('User','socket_io_token',{
        type:Sequelize.STRING(255),
        allowNull:true,
        defaultValue:null
      }),
      queryInterface.addColumn('User','socket_io_token_date',{
        type:Sequelize.STRING(30),
        allowNull:true,
        defaultValue:null
      })
    ])
  },

  down: (queryInterface) => {
    return Promise.all([
      queryInterface.removeColumn('User','socket_io_token'),
      queryInterface.removeColumn('User','socket_io_token_date')
    ])
  }
};
