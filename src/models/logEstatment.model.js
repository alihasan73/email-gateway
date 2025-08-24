const db = require('../config/connect-promise');
const table = require('./table');

async function logEmailEstatement(tableName) {
  let date = tableName || createPatternYearMonth();
  let sql = `CREATE TABLE tb_log_email_estatement_${date} (
            tb_log_email_estatement_${date}_id int(11) NOT NULL AUTO_INCREMENT,
            tb_email_estatement_${date}_id int(11) DEFAULT NULL,
            mailid varchar(50) DEFAULT NULL,
            server varchar(100) DEFAULT NULL,
            messageid text DEFAULT NULL,
            mailfrom varchar(100) DEFAULT NULL,
            mailto varchar(200) DEFAULT NULL,
            datesent varchar(100) DEFAULT NULL,
            statuss varchar(50) DEFAULT NULL,
            relay text DEFAULT NULL,
            delayy text DEFAULT NULL,
            host varchar(100) DEFAULT NULL,
            hostip varchar(100) DEFAULT NULL,
            reason text DEFAULT NULL,
            created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_date TIMESTAMP NULL,
            PRIMARY KEY (tb_log_email_estatement_${date}_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`;
  
    let conn;
    try {
        const pool = db._getPool();

        if (pool) {
            const result = await table.getTableName(`tb_log_email_estatement_${date}`);
            if (!result) {
                const [rows] = await pool.query(sql);
                // console.log('Tabel berhasil dibuat');
                return rows.length > 0;
            } else {
                // console.log('Tabel sudah ada');
                return true;
            }
        }

        // No pool: obtain a connection and remember to release it
        conn = await db.getConnection();
        const result = await table.getTableName(`tb_log_email_estatement_${date}`);
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

module.exports = { logEmailEstatement };