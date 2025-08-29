const nodemailer = require('nodemailer');
const config = require('../config/config')
const {runCommandAndProcessLogs} = require('../utils/connServer.util');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const transporter = nodemailer.createTransport(config.email.smtp);
const mailTrapTransporter = nodemailer.createTransport(config.mailtrap);

const sendEmail = async (nameUser, addressUser, subject, text, html = null, options = {}) => {
    const mid = crypto.randomBytes(12).toString('hex');
    const pixelUrl = `http://localhost:3000/api/v1/email/track?mid=${encodeURIComponent(mid)}`;
    const htmlWithPixel = html || `<a href="${pixelUrl}">Click here to track your email</a>`;
    const mailOptions = {
        from: { name: config.email.fromService, address: config.email.from },
        to: { name: nameUser, address: addressUser },
        subject,
        text,
        html: htmlWithPixel,
    };
    await transporter.sendMail(mailOptions);

};

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

const trackEmail = async (mid, req, type = 'open') => {
    const eventsFile = path.resolve(__dirname, '../../data/email_events.json');
    let events = [];
    try {
        if (fs.existsSync(eventsFile)) {
            const raw = fs.readFileSync(eventsFile, 'utf8') || '[]';
            events = JSON.parse(raw || '[]');
        }
    } catch (e) {
        // ignore parse errors and continue with empty events
        events = [];
    }

    const event = {
        mid,
        type,
        ts: new Date().toISOString(),
        ip: req && req.ip,
        ua: req && (req.get && req.get('user-agent') || ''),
    };
    events.push(event);
    try {
        // atomic-ish write
        const tmp = eventsFile + '.tmp';
        fs.writeFileSync(tmp, JSON.stringify(events, null, 2), 'utf8');
        fs.renameSync(tmp, eventsFile);
    } catch (e) {
        // best-effort: ignore write errors to not break tracking
    }

    const pixel = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=',
        'base64'
    );
    const headers = {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        Pragma: 'no-cache',
        Expires: '0',
    };

    return { pixel, headers };
}

const sendEmailWithMailTrap = async (nameUser, addressUser) => {
    const mailOptions = {
        from: `${nameUser} <${config.mailtrap_from || config.email.from}>`,
        to: addressUser,
        subject: 'MailTrap Test Email',
        text: 'This is a test email sent via MailTrap',
        html: '<p>This is a test email sent via MailTrap</p>',
    };
    await mailTrapTransporter.verify();
    // console.log('Mailtrap connection OK');
    let info = await mailTrapTransporter.sendMail(mailOptions);
    console.log('sendMail info:', info);
    // return info;
}

module.exports = {
    sendEmail,
    checkEmailStatus,
    sendEmailWithMailTrap,
    sendBulkEmails,
    trackEmail
}