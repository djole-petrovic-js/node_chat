const bluebird = require('bluebird'),
      bcrypt   = bluebird.promisifyAll(require('bcrypt-nodejs'));

class Password {
  constructor(password) {
    if ( !password ) {
      throw new Error('Password : Invalid password...');
    }

    this.password = password;
  }

  comparePasswords(hash) {
    return new Promise(async (resolve,reject) => {
      try {
        const isMatched = await bcrypt.compareAsync(this.password,hash);

        resolve({ isMatched });
      } catch(e) {
        reject(e);
      }
    });
  }

  hashPassword() {
    return new Promise(async (resolve,reject) => {
      try {
        const 
          salt = await bcrypt.genSaltAsync(10),
          hash = await bcrypt.hashAsync(this.password,salt,null);

        resolve(hash);
      } catch(e) {
        reject(e);
      }
    });
  }
}

module.exports = Password;