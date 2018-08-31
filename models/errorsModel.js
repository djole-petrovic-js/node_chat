const Model = require('./model');

class Errors extends Model {
  constructor(tableName = 'error') {
    super();
    this.tableName = tableName;
  }

  insertNewError(error,generatedError) {
    return new Promise(async (resolve,reject) => {
      try {
        const insertError = await this.insert({
          error,
          generated_error:generatedError
        });

        resolve(insertError);
      } catch (e) {
        reject(e);
      }
    });
  }
}

module.exports = Errors;