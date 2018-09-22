const path = require('path');
const bluebird = require('bluebird');
const fs = bluebird.promisifyAll(require('fs'));

const deleteFolder = async(dirname) => {
  try {
    const files = await fs.readdirAsync(dirname);

    for ( const file of files ) {
      const p = path.join(dirname,file);

      const stat = await fs.statAsync(p);

      if ( stat.isDirectory() ) {
        await deleteFolder(p);
      } else {
        await fs.unlinkAsync(p);
      }
    }

    await fs.rmdirAsync(dirname);
  } catch(e) {
    throw e;
  }
}

module.exports = deleteFolder;