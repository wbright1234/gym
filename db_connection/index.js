if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}
const mysql = require('mysql');
const options = {
  multipleStatements: true,
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  charset : 'utf8mb4'
};

const pool = mysql.createPool(options);
exports.pool = pool;
