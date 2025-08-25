
const db = require('../config/connect-promise');
const table = require('./table');
const bcrypt = require('bcrypt');

async function userModel() {
  const sql = `CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
    isEmailVerified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`;

  let conn;
  try {
    // prefer using the pool directly for a single statement
    const pool = db._getPool();
    if (pool) {
      const result = await table.getTableName('users');
      if (!result) {
        const [rows] = await pool.query(sql);
        // console.log('Tabel berhasil dibuat:', rows);
      } else {
        console.log('Tabel sudah ada');
      }
    } 
    
    conn = await db.getConnection();
    const result = await table.getTableName(`users`);
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

async function isEmailTaken(email) {
    let conn;
    try {
        const pool = db._getPool();
        let sql = "SELECT * FROM users WHERE email = ?";
        if (pool) {
            const [rows] = await pool.query(sql, [email]);
            return rows[0];
        }

        conn = await db.getConnection();
        const [rows] = await conn.query(sql, [email]);
        if (rows) {
            return true;
        } else {
            return false;
        }
    } catch (error) {
        console.error('Error checking email:', error);
        return false;
    } finally {
        if (conn) {
            try { conn.release(); } catch (e) { /* ignore */ }
        }
    }
}

async function getProcess(query, data){
    let conn;
    try {
         const pool = db._getPool();
         if (pool) {
         const [rows] = await pool.query(query, data);
         return  rows;
         }
    
        conn = await db.getConnection();
        const [rows] = await conn.query(query, data);
        return rows;
    
    } catch (error) {
         console.error('Error processing data :', error);
    } finally {
        if (conn) {
        try { conn.release(); } catch (e) { /* ignore release errors */ }
        }
   }
}

async function comparePassword(plainPassword, hashedPassword) {
  return await bcrypt.compare(plainPassword, hashedPassword);
}

async function getUserId(id){
    let conn;
    try {
         const pool = db._getPool();
         let sql = "SELECT * FROM users WHERE id = ?";
         if (pool) {
         const [rows] = await pool.query(sql, [id]);
         return  rows[0];
         }

        conn = await db.getConnection();
        const [rows] = await conn.query(sql, [id]);
        return rows[0];

    } catch (error) {
         console.error('Error processing data :', error);
    } finally {
        if (conn) {
        try { conn.release(); } catch (e) { /* ignore release errors */ }
        }
   }
}

module.exports = { userModel, isEmailTaken, getProcess, comparePassword, getUserId };