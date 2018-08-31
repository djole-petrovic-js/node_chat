const 
  bluebird = require('bluebird'),
  Types    = require('../libs/types'),
  pool     = bluebird.promisifyAll(require('../config/connection'));

class Model {
  constructor() {}

  buildSelectString(selectArray) {
    return !selectArray || selectArray.length === 0
      ? '*'
      : selectArray.join(',');
  }

  buildWhereSQLAndValues(where) {
    if ( !where || Types.isObjectEmpty(where) ) {
      return '';
    }

    const output = {
      where:'',
      whereValues:[]
    };

    let skipAndOperator = 0;

    output.where = 'WHERE';

    for ( let [ key , value ] of Object.entries(where) ) {
      if ( skipAndOperator !== 0 ) output.where += ' AND ';

      output.where += ` ${ key } = ? `;
      output.whereValues.push(value);
      skipAndOperator = 1;
    }

    return output;
  }

  buildInsertSQLAndValues(insertOptions) {
    const 
      columns                = Object.keys(insertOptions),
      skipTrailingComaIndex  = columns.length - 1,
      placeHolders           = [];

    const output = {
      insertSQL:`INSERT INTO ${ this.tableName }(`,
      values:[]
    };

    let currentIndex = 0;
 
    for ( const [ column , value ] of Object.entries(insertOptions) ) {
      output.insertSQL += `\`${ column }\``;

      if ( currentIndex !== skipTrailingComaIndex ) output.insertSQL += ',';

      placeHolders.push('?');
      output.values.push(value);
      currentIndex++;
    }

    output.insertSQL += `) VALUES (${ placeHolders.join(',') })`;

    return output;
  }

  select(options) {
    return new Promise(async (resolve,reject) => {
      const 
        columns = this.buildSelectString(options.columns),
        limit   = options.limit ? `LIMIT ${ options.limit }` : '',
        offset  = options.offset ? `OFFSET ${ options.offset }` : '';

      let
        where = '',
        from  = '',
        whereValues = [];

      if ( options.where ) {
        ({ where,whereValues } = this.buildWhereSQLAndValues(options.where));
       }

      if ( options.innerJoin ) {
        for ( const [ tableToJoin , condition ] of Object.entries(options.innerJoin) ) {
          const [ alias , criteria1 , criteria2 ] = condition;

          from += `
            FROM ${ this.tableName } as ${ options.alias }
            INNER JOIN ${ tableToJoin } as ${ alias }
            ON ${ criteria1 } = ${ criteria2 }
          `;
        }
      } else {
        from += `FROM ${ this.tableName }`
      }

      const sql = `
        SELECT ${ columns }
        ${ from }
        ${ where }
        ${ limit }
        ${ offset }
      `;

      try {
        const result = await this.executeQuery(sql,whereValues);

        resolve(result);
      } catch(e) {
        reject(e);
      }
    });
  }

  update(updateOptions) {
    return new Promise(async (resolve,reject) => {
      let updateSQL = `UPDATE ${ this.tableName } SET `;

      for ( let i = 0 , len = updateOptions.columns.length ; i < len ; i++ ) {
        if ( i !== 0 ) updateSQL += ' ,';

        updateSQL += ` ${ updateOptions.columns[i] } = ? `;
      }

      const 
        { where:whereSQL , whereValues } = this.buildWhereSQLAndValues(updateOptions.where),
        values = [...updateOptions.values,...whereValues];

      updateSQL += whereSQL;

      try {
        const result = await this.executeQuery(updateSQL,values);

        resolve(result);
      } catch(e) {
        reject(e);
      }
    }); 
  }

  insert(insertOptions) {
    return new Promise(async (resolve,reject) => {
      try {
        const { insertSQL , values } = this.buildInsertSQLAndValues(insertOptions);

        const result = await this.executeQuery(insertSQL,values);

        resolve(result);
      } catch(e) {
        reject(e);
      }
    });
  }

  //Nije dobro treba da se doradi...
  // ne radi definitivno :D
  deleteOne(options) {
    const tableName = this.tableName;

    return new Promise(async (resolve,reject) => {
      const where = options.where;

      /*
       * Preventiva da bi se obrisao samo jedan red u bazi...
      */

      // || Object.keys(where).length !== 1

      if ( !where || Object.keys(where).length !== 1) {
        reject('No where criteria is specified or is greater than one...');
      }

      const [ whereColumn , whereValue ] = Object.entries(where)[0];

      const sql = `
        DELETE 
        FROM ${ tableName }
        WHERE ${ whereColumn } = ?
        LIMIT 1
      `;

      try {
        const result = await this.executeQuery(sql,[whereValue]);

        resolve(result);
      } catch(e) {
        reject(e);
      }
    });
  }

  deleteMultiple(options) {
     return new Promise(async(resolve,reject) => {
      /*
      ** Kao sigurnosna mera , mora da se stavi options.confirm da bude true
      ** posto se brisu vise redova , da ne dodje do greske...
      */
      if ( options.confirm !== true ) {
        return reject('As a safety mesure, please set confirm property to true');
      }

      const { where , whereValues } = this.buildWhereSQLAndValues(options.where);

      const sql = `
        DELETE
        FROM ${ this.tableName }
        ${ where }
      `;

      try {
        const result = await this.executeQuery(sql,whereValues);

        resolve(result);
      } catch(e) {
        reject(e);
      }
    });
  }

  executeCustomQuery(sql,values) {
    return new Promise(async(resolve,reject) => {
      if ( !sql || !values ) {
        return reject('Model Execute custom query: Arguments missing');
      }

      try {
        const result = await this.executeQuery(sql,values);

        resolve(result);
      } catch(e) {
        reject(e);
      }
    });
  }

  executeQuery(sql,values = []) {
    if ( !Types.isString(sql) || !Types.isArray(values) ) {
      throw new Error('Sql not a string or values not an array...');
    }

    return new Promise(async (resolve,reject) => {
      try {
        const connection = bluebird.promisifyAll(await pool.getConnectionAsync());

        try {
          const stmt = bluebird.promisifyAll(await connection.prepareAsync(sql));

          const result = await stmt.executeAsync(values);

          connection.release();

          resolve(result);
        } catch(e) {
          connection.release();

          reject(e);
        }
      } catch(e) {
        reject('Could not get connection');
      }
    });
  }
}

module.exports = Model;