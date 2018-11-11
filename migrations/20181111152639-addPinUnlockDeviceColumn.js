'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn('User','pin_unlock_device_enabled',{
      type:Sequelize.BOOLEAN,
      defaultValue: 0,
    })
  },

  down: (queryInterface) => {
    return queryInterface.removeColumn('User','pin_unlock_device_enabled');
  }
};
