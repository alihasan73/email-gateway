const nodemailer = require('nodemailer');
const config = require('../config/config')
const {runCommandAndProcessLogs} = require('../utils/connServer.util');

const transporter = nodemailer.createTransport(config.email.smtp);

const sendEmail = async (nameUser, addressUser, subject, text) => {
    const mailOptions = {
        from: {name: config.email.fromService , address: config.email.from},
        to : {name: nameUser, address: addressUser},
        subject,
        text,
        html: '<p>Halo <b>Testing</b></p><img src="cid:logo@cid"/>',
    };

    await transporter.sendMail(mailOptions); 
}

const checkEmailStatus = async (mailid) => {
    const command = `grep ${mailid} /home/sample/log/08-07-2025_FROM_SMTP5.txt`;
    const result = await runCommandAndProcessLogs({ command });
    return result;
}

const sendBulkEmails = async (messages = [], options = {}) => {
    const concurrency = Math.max(1, options.concurrency || 5);
    const queue = Array.from(messages || []);
    const results = [];

    if (queue.length === 0) return results;

    const worker = async () => {
        while (queue.length > 0) {
            const msg = queue.shift();
            if (!msg || !msg.to) {
                results.push({ to: msg && msg.to, success: false, error: 'invalid message' });
                continue;
            }
            try {
                const info = await sendEmail(msg.name || '', msg.to, msg.subject || '', msg.text || '');
                results.push({ to: msg.to, success: true, info });
            } catch (err) {
                results.push({ to: msg.to, success: false, error: String(err) });
            }
        }
    };

    const workers = Array.from({ length: Math.min(concurrency, queue.length) }).map(() => worker());
    await Promise.all(workers);
    return results;
};

module.exports = {
    sendEmail,
    checkEmailStatus,
    sendBulkEmails
}