const Model = require('./model');

class TokenModel extends Model {
  constructor(tableName = 'token') {
    super();

    this.tableName = tableName;
  }

  insertOrUpdateToken({ userID:id_user , token }) {
    return new Promise(async(resolve,reject) => {
      try {
        const [ tokenExists ] = await this.select({
          where:{ id_user }
        });

        if ( tokenExists ) {
          const updateToken = await this.update({
            columns:['token','token_date'],
            values:[token,'now()'],
            where:{ id_user }
          });

          resolve(updateToken);
        } else {
          const insertNewToken = await this.insert({
            token,
            id_user
          });

          resolve(insertNewToken);
        }
      } catch(e) {
        reject(e);
      }
    });
  }
}

module.exports = TokenModel;