const bluebird = require('bluebird');
const bcrypt = bluebird.promisifyAll(require('bcrypt-nodejs'));

class Password {
  constructor(password) {
    if ( !password ) {
      throw new Error('Password : Invalid password...');
    }

    this.password = password;
  }

  async comparePasswords(hash) {
    const isMatched = await bcrypt.compareAsync(this.password,hash);

    return { isMatched };
  }

  async hashPassword() {
    const salt = await bcrypt.genSaltAsync(10);

    return await bcrypt.hashAsync(this.password,salt,null);
  }
}

module.exports = Password;