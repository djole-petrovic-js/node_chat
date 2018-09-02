const UserModel = require('../../models/userModel');

const checkIfUsernameOrEmailExists = async({ username,email }) => {
  try {
    const User = new UserModel()

    const [ [resultUsername],[resultEmail] ] = await Promise.all([
      User.select({
        limit:1,
        where:{ username }
      }),
      User.select({
        limit:1,
        where:{ email }
      })
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