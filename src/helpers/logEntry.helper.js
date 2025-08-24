const { Client } = require("ssh2");
const table = require("../models/table");
const {logEmailEstatement} = require("../models/logEstatment.model");
const {
  queryDatabase,
  checkDataRootTemp,
  updateDataLog,
  insertDataLog
} = require("./query.helper");


function processLogEntry(logEntry) {
  const defaultData = {
    date: null,
    server: null,
    mailid: null,
    messageid: null,
    mailfrom: null,
    mailto: null,
    statuss: null,
    relay: null,
    host: null,
    hostip: null,
    delayy: null,
    dsn: null,
    reason: null,
    service: null,
    error: null,
  };

  // patterns
  const msgid = /(\w+\s+\d+\s+\d+:\d+:\d+)\s+(\S+)\s+postfix\/(\w+)\[\d+\]:\s+([0-9A-F]+):\s*?message-id=<([^>]+)>?/;
  const from2 = /^(\w+\s+\d+\s+\d+:\d+:\d+)\s+(\S+)\s+postfix\/\w+\[\d+\]:\s+([0-9A-F]+):\s+from=<([^>]+)>,\s+size=(\d+),\s+nrcpt=(\d+)\s+\(queue active\)$/;
  const from = /(\w+\s+\d+\s+\d+:\d+:\d+)\s+(\S+)\s+postfix\/(\w+)\[\d+\]:\s+([0-9A-F]+):\s*?from=<([^>]+)>,?\s*?size=\d+,?\s*?nrcpt=\d+\s+\(queue active\)?/;
  const logRegex = /(\w+\s+\d+\s+\d+:\d+:\d+)\s+(\S+)\s+postfix\/(\w+)\[\d+\]:\s+([0-9A-F]+):\s+to=<([^>]+)>,?\s+relay=(\S+)(?:\[(\d+\.\d+\.\d+\.\d+)\]):\d+,\s+delay=(\S+)?,\s+delays=\S+,\s+dsn=(\S+),\s+status=(\w+)\s+\(([^)]+)\)/;
  const logRegex2 = /(\w+\s+\d+\s+\d+:\d+:\d+)\s+(\S+)\s+postfix\/(\w+)\[\d+\]:\s+([0-9A-F]+):\s+to=<([^>]+)>,\s+relay=(\S+),\s+delay=(\d+),\s+delays=([\d/.]+),\s+dsn=(\d+\.\d+\.\d+),\s+status=(\w+)\s+\(([^)]+)\)/;
  const logRegex3 = /(\w+\s+\d+\s+\d+:\d+:\d+)\s+(\S+)\s+postfix\/(\w+)\[\d+\]:\s+([0-9A-F]+):\s+to=<([^>]+)>,\s+relay=(\S+),\s+delay=(\d+\.?\d*),\s+delays=([\d/.]+),\s+dsn=(\d+\.\d+\.\d+),\s+status=(\w+)\s+\(([^)]+)\)/;
  const logRegex4 = /^(\w+\s+\d+\s+\d+:\d+:\d+)\s+(\S+)\s+postfix\/\w+\[\d+\]:\s+([0-9A-F]+):\s+to=<([^>]+)>,\s+relay=([\w\.\-]+)\[(\d+\.\d+\.\d+\.\d+)\]:\d+,\s+delay=(\d+),\s+delays=([\d\.\/]+),\s+dsn=(\S+),\s+status=(\w+)\s+\(([^)]+)\)$/;
  const logRegex5 = /^(\w{3}\s+\d+\s+\d{2}:\d{2}:\d{2})\s+(\S+)\s+postfix\/(\w+)\[\d+\]:\s+(\w+): to=<([^>]+)>, relay=([^\s]+)\[([\d.:]+)\]:(\d+), delay=([\d.]+), delays=[\d./]+, dsn=([\d.]+), statuss=(\w+) \((.*)\)$/;
  const errorRegex = /connect to (\S+)\[(\d+\.\d+\.\d+\.\d+)\]:\d+:\s+(Connection timed out)/;

  let m = msgid.exec(logEntry);
  if (m) return { ...defaultData, date: m[1], server: m[2], mailid: m[4], messageid: m[5] };

  m = from.exec(logEntry);
  if (m) return { ...defaultData, date: m[1], server: m[2], mailid: m[4], mailfrom: m[5] };

  m = from2.exec(logEntry);
  if (m) return { ...defaultData, date: m[1], server: m[2], mailid: m[3], mailfrom: m[4] };

  m = logRegex4.exec(logEntry);
  if (m)
    return {
      ...defaultData,
      date: m[1],
      server: m[2],
      mailid: m[3],
      mailto: m[4],
      relay: m[5],
      hostip: m[6],
      delayy: m[7],
      dsn: m[9],
      statuss: m[10],
      reason: m[11],
    };

  m = logRegex.exec(logEntry);
  if (m)
    return {
      ...defaultData,
      date: m[1],
      server: m[2],
      mailid: m[4],
      mailto: m[5],
      statuss: m[10],
      relay: m[6],
      delayy: m[8],
      host: m[6],
      hostip: m[7],
      reason: m[11],
    };

  m = logRegex2.exec(logEntry);
  if (m)
    return {
      ...defaultData,
      date: m[1],
      server: m[2],
      service: m[3],
      mailid: m[4],
      mailto: m[5],
      relay: m[6],
      hostip: m[7],
      delayy: m[8],
      dsn: m[9],
      statuss: m[10],
      reason: m[11],
    };

  m = logRegex3.exec(logEntry);
  if (m)
    return {
      ...defaultData,
      date: m[1],
      server: m[2],
      service: m[3],
      mailid: m[4],
      mailto: m[5],
      delayy: m[6],
      hostip: m[7],
      delay: m[8],
      dsn: m[9],
      statuss: m[10],
      reason: m[11],
    };

  m = logRegex5.exec(logEntry);
  if (m)
    return {
      ...defaultData,
      date: m[1],
      server: m[2],
      service: m[3],
      mailid: m[4],
      mailto: m[5],
      relay: m[6],
      hostip: m[7],
      delayy: m[9],
      statuss: m[11],
      reason: m[12],
    };

  m = errorRegex.exec(logEntry);
  if (m) return { ...defaultData, server: m[1], hostip: m[2], error: m[3] };

  return null;
}

function mergeData(existing, update) {
  const merged = { ...existing };
  for (const k in update) {
    if (Object.prototype.hasOwnProperty.call(update, k)) {
      if (update[k] !== null && update[k] !== undefined) merged[k] = update[k];
    }
  }
  return merged;
}

function runRealtimeTail(options = {}) {
  const conn = new Client();
  const cmd = options.command || 'tail -F /var/log/mail.log';
  let leftover = '';
  let closed = false;
  let resolveClose;

  console.log("Client :: ready");
  console.log("SMTP E-statement");
  let date = table.createPatternYearMonth();
       
  logEmailEstatement(date).then((res) => {
    // console.log(res);
  }).catch((err) => {
    console.log("Error:", err);
  });


  const onClose = new Promise((r) => { resolveClose = r; });

  conn.on('ready', () => {
    conn.exec(cmd, (err, stream) => {
      if (err) { conn.end(); resolveClose(err); return; }

      stream.on('close', (code, signal) => {
        closed = true;
        resolveClose({ code, signal });
        conn.end();
      });

      stream.on('data', async (chunk) => {
        const text = leftover + chunk.toString();

        const lines = text.split("\n");
        leftover = lines.pop(); // simpan potongan akhir untuk chunk berikut
        stream.pause();

        for (const line of lines) {
          try {
            const logData = processLogEntry(line);
            if (!logData) continue;
            if (logData.error === "Connection timed out") continue;
            if (checkDataRootTemp(logData)) continue;

            const mailid = logData.mailid;
            const dbResult = await queryDatabase(mailid, tableName);

            if (dbResult && dbResult.length > 0) {
              const merged = mergeData(dbResult[0], logData);
              await updateDataLog(merged, tableName);
            } else {
              await insertDataLog(logData, tableName);
            }
          } catch (e) {
            console.error("Processing error:", e);
          }
        }

        stream.resume();
      });

      stream.stderr.on('data', (d) => console.error('tail stderr:', d.toString()));
    });
  }).on('error', (e) => {
    console.error('SSH error', e);
    resolveClose(e);
  }).connect({
    host: options.host, 
    port: options.port, 
    username: options.username, 
    password: options.password,
    keepaliveInterval: 20000,
  });

  return {
    stop() {
      if (closed) return;
      closed = true;
      try { conn.end(); } catch (e) { /* log if needed */ }
    },
    onClose
  };
}

module.exports = {runRealtimeTail};
