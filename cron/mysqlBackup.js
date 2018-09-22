const cron = require('node-cron');
const Logger = require('../libs/Logger');
const randtoken = require('rand-token');
const { MAX_BACKUP_FILES } = require('../config/config');
const bluebird = require('bluebird');
const path = require('path');
const fs = bluebird.promisifyAll(require('fs'));
const deleteFolder = require('../utils/deleteFolder');
const moment = require('moment');
const backupsPath = path.join(__dirname,'../','backups');
const mysqldump = require('mysqldump');

const task = cron.schedule('10 0 * * *',async() => {
  try {
    const backups = await fs.readdirAsync(backupsPath);

    //delete oldest backup
    if ( backups.length >= MAX_BACKUP_FILES ) {
      const backupsWithBirthtime = []

      for ( const dir of backups ) {
        const { birthtime } = await fs.statAsync(path.join(backupsPath,dir));

        backupsWithBirthtime.push({ birthtime,dir });
      }

      const oldest = backupsWithBirthtime.sort((a,b) => {
        return moment(a.birthtime).diff(moment(b.birthtime),'seconds')
      })[0];

      await deleteFolder(path.join(backupsPath,oldest.dir));
    }

    const newBackupDir = moment().toISOString() + '_' + randtoken.uid(6) + '_backup';

    await fs.mkdirAsync(path.join(backupsPath,newBackupDir));

    mysqldump({
      connection: {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      },
      dumpToFile:path.join(backupsPath,newBackupDir,'dump.sql')
    });
  } catch(e) {
    Logger.log(e,'cron');
  }
},true);

module.exports = task;