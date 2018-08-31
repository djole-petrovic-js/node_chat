const UserModel = require('../../models/userModel');

const checkIfUsernameOrEmailExists = ({ username,email }) => {
  return new Promise(async(resolve,reject) => {
    const User = new UserModel();

    try {
      const [ resultUsername ] = await User.select({
        limit:1,
        where:{ username }
      });

      const [ resultEmail ] = await User.select({
        limit:1,
        where:{ email }
      });

      resolve({
        usernameAlreadyExists:!!resultUsername,
        emailAlreadyExists:!!resultEmail
      });
      
    } catch(e) {
      reject(e);
    }
  });
}

module.exports = checkIfUsernameOrEmailExists;