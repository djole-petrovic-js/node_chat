const Model = require('./model');

class NotificationsModel extends Model {
  constructor(tableName) {
    super();

    this.tableName = tableName || 'notification';
  }
}

module.exports = NotificationsModel;