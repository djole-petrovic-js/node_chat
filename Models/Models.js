const Sequelize = require('sequelize');
const fs = require('fs');
const path = require('path');
const Op = Sequelize.Op;
const db = {};

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,{
    operatorsAliases: Op,
    dialect:'mysql',
    logging:false
  },
);

fs
  .readdirSync(path.join(__dirname,'SequelizeModels'))
  .filter(x => x !== '.' && x !=='..' && x !== 'Models.js')
  .map(x => x.replace('.js',''))
  .forEach(model => {
    db[model] = sequelize.import(path.join(__dirname,'SequelizeModels',model));
  });

Object.keys(db).forEach(model => db[model].associate && db[model].associate(db));

sequelize.sync().then(async() => {
  console.log('Sequelize successfully started.');
}).catch(e => {
  console.error(e);
})

module.exports = { db,sequelize };