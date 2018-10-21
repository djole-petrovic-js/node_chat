const cron = require('node-cron');
const { sequelize,db:{ Message } } = require('../Models/Models');
const Logger = require('../libs/Logger');

const task = cron.schedule('0 0,12 * * *',async() => {
  try {
    const sql = `
      SELECT *
      FROM Message
      WHERE num_of_deletions >= 2
        OR datediff(NOW(), date) >= 7
    `;

    const messagesToDelete = await sequelize.query(sql,{
      type:sequelize.QueryTypes.SELECT
    });

    if ( messagesToDelete.length > 0 ) {
      await Message.destroy({
        where:{ id_message:messagesToDelete.map(x => x.id_message) }
      });
    }
  } catch(e) {
    Logger.log(e,'cron');
  }
},true);

module.exports = task;