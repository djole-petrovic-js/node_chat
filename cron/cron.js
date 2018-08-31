const cron = require('node-cron');
const ErrorsModel = require('../models/errorsModel');

/*
 * Naci sve korisnike koji nisu aktivirali nalog
 * posle sedam dana i obrisati njihove naloge
*/
cron.schedule('* */1 * * *',async() => {
  const 
    UserModel = require('../models/userModel'),
    User = new UserModel();

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
  
  try {
    const deleteNotActivatedAccounts = await User.executeCustomQuery(
      deleteNotActivatedAccountsSQL,allUsersIDs
    );

    if ( deleteNotActivatedAccounts.affectedRows !== usersToDelete.length) {
      const Errors = new ErrorsModel();
    
      const insertError = await Errors.insertNewError(
        'Cound not delete user accounts... ','Some of accounts had not been deleted'
      );
    }
  } catch(e) {
    const Errors = new ErrorsModel();
    
    try {
      await Errors.insertNewError(
        'Cound not delete user accounts... ',e
      );

    } catch(e) { }
  }

},false);

module.exports = cron;