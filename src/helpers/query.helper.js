
const db = require("../config/connect-promise");

async function acquireConnectionWithRetry(retries = 2, delay = 1000) {
  for (let i = 0; i <= retries; i++) {
    try {
      const conn = await db.getConnection();
      return conn;
    } catch (err) {
      // If ETIMEDOUT or other transient, retry a few times
      const retryable = ['ETIMEDOUT','PROTOCOL_CONNECTION_LOST','ECONNRESET','ECONNREFUSED'];
      console.error(`getConnection failed (attempt ${i}):`, err.code || err.message);
      if (retryable.includes(err.code) && i < retries) {
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
}

async function queryDatabase(mailid, tableName) {
  let connectionAsync;
  try {
    connectionAsync = await acquireConnectionWithRetry(3, 1500);
    await connectionAsync.beginTransaction();
    const sql = `SELECT * FROM ${tableName} WHERE mailid = ? `;
    const [results] = await connectionAsync.execute(sql, [mailid]);
    await connectionAsync.commit();
    return results;
  } catch (error) {
    if (connectionAsync) {
      try { await connectionAsync.rollback(); } catch (e) { /* ignore */ }
      console.error("Transaksi di-rollback karena kesalahan:", error.message);
    }
    console.error("Terjadi kesalahan saat memperbarui data:", error);
    throw error;
  } finally {
    if (connectionAsync) {
      try { connectionAsync.release(); } catch (e) { /* ignore */ }
    }
  }
}
function checkDataRootTemp(logData) {
  // console.log(logData);
  if (logData) {
    if (logData.messageid) {
      let server = logData.server;
      let mailid = logData.mailid;
      let pattern = `${mailid}@${server}`;
      let arr = logData.messageid.split(".");
      let check = arr[1] === pattern;
      let result = check ? true : true;
      return result;
    }
     
    let rootEmails = ["root@smtpgateway2.bankmega.com","root@smtpgateway3.bankmega.com","root@smtpgateway1.bankmega.com","root@smtpgateway5.bankmega.com", "root@smtpgateway4.www.megasyariah.co.id"];
     if (
      rootEmails.includes(logData.mailto) ||
      rootEmails.includes(logData.mailfrom)
    ) {
      return true;
    }

    let toEmail = ["noreply@bankmega.com","collection-syariahcard@megasyariah.co.id"];
    if (toEmail.includes(logData.mailto)) {
      return true;
    } 


    return false;
  }
}

async function updateDataLog(data, tableName){
  let connectionAsync; 
  try {
  connectionAsync = await acquireConnectionWithRetry(3, 1500);
    // console.log("Koneksi database didapatkan dari pool.");

    await connectionAsync.beginTransaction();
    // console.log("Transaksi dimulai.");

    const sql = `
    UPDATE ${tableName}
    SET mailid=?, server=?, messageid=?, mailfrom=?, mailto=?, datesent=?, statuss=?, relay=?, delayy=?, host=?, hostip=?, reason=?, updated_date=NOW()
    WHERE mailid=?`;
    
    const values = [data.mailid, data.server, data.messageid, data.mailfrom, data.mailto, data.date, data.statuss, data.relay, data.delayy, data.host, data.hostip, data.reason, data.mailid];

    const [results] = await connectionAsync.execute(sql, values); 
    // console.log("Query UPDATE berhasil dijalankan.");
    await connectionAsync.commit();    
    // console.log("Transaksi update di-commit.");

    return results;
  } catch (error) {
    if (connectionAsync) {
      try { await connectionAsync.rollback(); } catch (e) { /* ignore */ }
      console.error("Transaksi di-rollback karena kesalahan:", error.message);
    }
    console.error("Terjadi kesalahan saat memperbarui data:", error);
    throw error;
  } finally { 
    if (connectionAsync) {
      try { connectionAsync.release(); } catch (e) { /* ignore */ }
      // console.log("Koneksi database dilepaskan kembali ke pool.");
    }
  }
}
async function insertDataLog(data, tableName) {
  let connectionAsync; 
  try {
    connectionAsync = await acquireConnectionWithRetry(3, 1500);
    // console.log("Koneksi database didapatkan dari pool.");

    await connectionAsync.beginTransaction();
    // console.log("Transaksi dimulai.");

    const sql = `
      INSERT INTO ${tableName} (mailid, server, messageid, mailfrom, mailto, datesent, statuss, relay, delayy, host, hostip, reason)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        server = VALUES(server),
        messageid = VALUES(messageid),
        mailfrom = VALUES(mailfrom),
        mailto = VALUES(mailto),
        datesent = VALUES(datesent),
        statuss = VALUES(statuss),
        relay = VALUES(relay),
        delayy = VALUES(delayy),
        host = VALUES(host),
        hostip = VALUES(hostip),
        reason = VALUES(reason)`;

    const values = [
      data.mailid,
      data.server,
      data.messageid,
      data.mailfrom,
      data.mailto,
      data.date, // Perhatikan ini, Anda menggunakan 'data.date' sebelumnya
      data.statuss,
      data.relay,
      data.delayy,
      data.host,
      data.hostip,
      data.reason
    ];

      const [results] = await connectionAsync.execute(sql, values);
      // console.log("Query INSERT/UPDATE berhasil dijalankan.");

      await connectionAsync.commit();
    //   console.log("Transaksi insert di-commit.");
    
      return results;
  } catch (error) {
    if (connectionAsync) {
        try { await connectionAsync.rollback(); } catch (e) { /* ignore */ }
            console.error("Transaksi di-rollback karena kesalahan:", error.message);
    }
    console.error("Terjadi kesalahan saat memasukkan/memperbarui data:", error);
    throw error;
  } finally {
    if (connectionAsync) {
        try { connectionAsync.release(); } catch (e) { /* ignore */ }
            // console.log("Koneksi database dilepaskan kembali ke pool.");
    }
  }
}


module.exports = {
  queryDatabase,
  checkDataRootTemp,
  updateDataLog,
  insertDataLog
};
