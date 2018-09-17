const cron = require('node-cron');
const UserModel = require('../models/userModel');
const Logger = require('../libs/Logger');

/*
 * Find all users that didnt activate their accounts
 * after seven days, and delete them.
*/
cron.schedule('* * 0,12 * * *',async() => {
  try {
    const User = new UserModel();

    const sql = `
      SELECT id_user,email FROM user
      WHERE account_activated = 0
      AND DATEDIFF(now(),date_created) > 7
    `;
  
    const usersToDelete = await User.executeCustomQuery(sql,[]);  

    if ( usersToDelete.length === 0 ) return;
  
    const allUsersIDs = [] , allUsersPlaceholder = [];
  
    for ( const { id_user } of usersToDelete ) {
      allUsersIDs.push(id_user);
      allUsersPlaceholder.push('?');
    }
  
    const deleteNotActivatedAccountsSQL = `
      DELETE FROM user
      WHERE id_user IN (${ allUsersPlaceholder.join(',') })
    `;

    const deleteNotActivatedAccounts = await User.executeCustomQuery(
      deleteNotActivatedAccountsSQL,allUsersIDs
    );

    if ( deleteNotActivatedAccounts.affectedRows !== usersToDelete.length ) {
      Logger.log('Could not delete all user accounts','cron');
    }

    Logger.log(`Removed ${usersToDelete.length} accounts.`,'cron');
  } catch(e) {
    Logger.log(e,'cron');
  }
},true);

module.exports = cron;