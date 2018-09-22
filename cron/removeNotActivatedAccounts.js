const cron = require('node-cron');
const { sequelize,db:{ User } } = require('../Models/Models');
const Logger = require('../libs/Logger');
/*
 * Find all users that didnt activate their accounts
 * after seven days, and delete them.
*/
const task = cron.schedule('0 0,12 * * *',async() => {
  try {
    await Logger.log('Started removing expired accounts.','cron');

    const sql = `
      SELECT id_user,email FROM User
      WHERE account_activated = 0
      AND DATEDIFF(now(),date_created) > 7
    `;  

    const usersToDelete = await sequelize.query(sql,{
      type: sequelize.QueryTypes.SELECT
    });

    if ( usersToDelete.length === 0 ) return;

    await User.destroy({
      where:{
        id_user:usersToDelete.map(x => x.id_user)
      }
    });

    Logger.log(`Removed ${usersToDelete.length} accounts.`,'cron');
  } catch(e) {
    Logger.log(e,'cron');
  }
},true);

module.exports = task;