const {tokenTypes} = require('../config/token.config');
const db = require('../config/connect-promise');
const table = require('./table');

async function tokenModel() {
  // Token model logic will go here
  const sql = `CREATE TABLE tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(255) NOT NULL,
    type ENUM('${tokenTypes.ACCESS}', '${tokenTypes.REFRESH}', '${tokenTypes.RESET_PASSWORD}', '${tokenTypes.VERIFY_EMAIL}') NOT NULL,
    expires TIMESTAMP NOT NULL,
    blacklisted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`;
  let conn;
  try {
      // prefer using the pool directly for a single statement
      const pool = db._getPool();
        if (pool) {
            const result = await table.getTableName(`tokens`);
            if (!result) {
                const [rows] = await pool.query(sql);
                return rows.length > 0;
            } else {
                return true;
            }
        }

        conn = await db.getConnection();
        const result = await table.getTableName(`tokens`);
        if (!result) {
            const [rows] = await conn.query(sql);
            // console.log('Tabel berhasil dibuat');
            return rows.length > 0;
        } else {
            // console.log('Tabel sudah ada');
            return true;
        }
      
    } catch (err) {
      // log error instead of throwing to avoid crashing the app during startup
      console.error('Gagal membuat tabel users:', err.message || err);
    } finally {
        if (conn) {
            try { conn.release(); } catch (e) { /* ignore */ }
        }
    }
}



async function getProcess(query,  value){
  let conn;
  try {
     const pool = db._getPool();
     if (pool) {
       const [rows] = await pool.query(query, value);
       return  rows.length > 0;
     }

    conn = await db.getConnection();
    const [rows] = await conn.query(query, value);
    return rows.length > 0;

  } catch (error) {
     console.error('Error processing data :', error);
  } finally {
    if (conn) {
      try { conn.release(); } catch (e) { /* ignore release errors */ }
    }
  }
}


module.exports = {tokenModel, getProcess};