const { db:{ User } } = require('../../Models/Models');

const checkIfUsernameOrEmailExists = async({ username,email }) => {
  try {
    const [ resultUsername,resultEmail ] = await Promise.all([
      User.findOne({ where:{ username } }),
      User.findOne({ where:{ email } })
    ]);

    return {
      usernameAlreadyExists:!!resultUsername,
      emailAlreadyExists:!!resultEmail
    };
  } catch(e) {
    throw e;
  }
}

module.exports = checkIfUsernameOrEmailExists;