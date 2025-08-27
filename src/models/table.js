const db = require('../config/connect-promise');

function createPatternYearMonth(){
    let date = new Date();
    let year = date.getFullYear().toString().slice(-2);
    let month = ('0' + (date.getMonth() + 1)).slice(-2);
    return year + month;
}

async function getTableName(tableName) {
  const sql = "SHOW TABLES LIKE ?";

  try {
    const pool = db._getPool();

    // If we have a pool, use prepared statement via execute
    if (pool) {
      const [rows] = await pool.query(sql, [tableName]);
      return rows.length > 0;
    }

    // No pool: obtain a connection and use query (prepared statement)
    const conn = await db.getConnection();
    try {
      const [rows] = await conn.query(sql, [tableName]);
      return rows.length > 0;
    } finally {
      try { conn.release(); } catch (e) { /* ignore release errors */ }
    }
  } catch (error) {
    console.error('Error checking table existence:', error);
  }
}






module.exports = { createPatternYearMonth, getTableName };