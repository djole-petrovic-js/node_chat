const mysql = require('mysql2');

const poll = mysql.createPool({
  host     : process.env.HOST_NAME,
  user     : process.env.USER,
  password : process.env.PASSWORD,
  database : process.env.DATABASE,
  connectionLimit : 100,
});

module.exports = poll;