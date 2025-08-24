const mysql = require('mysql2');
const configDb = require('./database');
const pool = mysql.createPool(configDb);


module.exports = pool;