const Model = require('./model');
const Password = require('../libs/password');

class UserModel extends Model {
  constructor(tableName) {
    super();

    this.tableName = tableName || 'user';
  }

  async insertNewUser(userOptions) {
    try {
      const password = new Password(userOptions.password);

      userOptions.password = await password.hashPassword();

      return await this.insert(userOptions);
    } catch(e) {
      throw e;
    }
  }
}

module.exports = UserModel;