const Model = require('./model');

class MessagesModel extends Model {
  constructor(tableName = 'Operation') {
    super();

    this.tableName = tableName;
  }
}

module.exports = MessagesModel;