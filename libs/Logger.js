const bluebird = require('bluebird');
const fs = bluebird.promisifyAll(require('fs'));
const path = require('path');
const PATH = path.join(__dirname,'../','logs');
const DEFAULT_NAME = 'main';
const EXTENSION = '.log';

class Logger {
  static async log(error,location = null) {
    console.log(error);
    try {
      const timestamp = new Date().toLocaleString();

      const content = `
        *******************************************
        Date : ${ timestamp }
        ${ error } \n
        Stack trace : ${ error.stack || 'none' } \n
        *******************************************
      `;

      const logPath = path.join(PATH,(location ? location : DEFAULT_NAME)  + EXTENSION);

      await fs.writeFileAsync(logPath,content,{ flag:'a' });
    } catch(e) {
      console.error('Could not logg error ' + e);
    }
  }
}

module.exports = Logger;