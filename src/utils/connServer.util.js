const { Client } = require("ssh2");
const config = require("../config/config");

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


function runCommandAndProcessLogs(options = {}) {
  const conn = new Client();

  const command = options.command;
//   const tableName = options.tableName ?? LOG_TABLE;

  return new Promise((resolve, reject) => {
    let leftover = "";

    conn
      .on("ready", () => {
        conn.exec(command, (err, stream) => {
          if (err) {
            conn.end();
            return reject(err);
          }

          stream
            .on("close", (code, signal) => {
              conn.end();
              resolve({ status: true, code, signal });
            })
            .on("data", async (chunk) => {
              // handle partial lines across chunks
              const text = leftover + chunk.toString();
              const parts = text.split("\n");
              leftover = parts.pop(); // last may be incomplete
              stream.pause();

              // process each complete line in sequence
              for (const line of parts) {
                // console.log(line);
                try {
                  const logData = processLogEntry(line);
                  console.log(logData);
                //   if (!logData) continue;
                //   if (logData.error === "Connection timed out") continue;
                //   if (checkDataRootTemp(logData)) continue;

                //   const mailid = logData.mailid;
                //   const dbResult = await queryDatabase(mailid, tableName);

                //   if (dbResult && dbResult.length > 0) {
                //     const merged = mergeData(dbResult[0], logData);
                //     await updateDataLog(merged, tableName);
                //   } else {
                //     await insertDataLog(logData, tableName);
                //   }
                } catch (e) {
                  console.error("Processing error:", e);
                  // continue processing next lines
                }
              }

              stream.resume();
            })
            .stderr.on("data", (data) => {
              console.error("STDERR:", data.toString());
            });
        });
      })
      .on("error", (err) => {
        reject(err);
      })
      .connect(config.email.smtp_5);
  });
}

module.exports = {
  runCommandAndProcessLogs
};
