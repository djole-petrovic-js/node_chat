'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn('User','push_notifications_enabled',{
      type:Sequelize.BOOLEAN,
      defaultValue: 1,
    })
  },

  down: (queryInterface) => {
    return queryInterface.removeColumn('User','push_notifications_enabled');
  }
};
