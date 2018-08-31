const
  Model = require('./model');

class MessagesModel extends Model {
  constructor(tableName = 'messages') {
    super();

    this.tableName = tableName;
  }
}

module.exports = MessagesModel;