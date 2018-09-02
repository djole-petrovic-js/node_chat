const Model = require('./model');

class TokenModel extends Model {
  constructor(tableName = 'token') {
    super();

    this.tableName = tableName;
  }

  async insertOrUpdateToken({ userID:id_user,token }) {
    try {
      await this.deleteMultiple({
        confirm:true,
        where:{ id_user }
      });
      
      return await this.insert({ token,id_user });
    } catch(e) {
      throw e;
    }
  }
}

module.exports = TokenModel;