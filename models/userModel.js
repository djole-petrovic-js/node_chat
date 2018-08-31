const 
  Model = require('./model'),
  Password = require('../libs/password');

class UserModel extends Model {
  constructor(tableName) {
    super();

    this.tableName = tableName || 'user';
  }

  insertNewUser(userOptions) {
    return new Promise(async (resolve,reject) => {
      try {
        const password = new Password(userOptions.password);

        userOptions.password = await password.hashPassword();

        const newInsertedUser = await this.insert(userOptions);

        resolve(newInsertedUser);
      } catch(e) {
        return reject(e);
      }
    });
  }
}

module.exports = UserModel;