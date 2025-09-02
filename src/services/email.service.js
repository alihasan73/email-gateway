const nodemailer = require('nodemailer');
const config = require('../config/config')
const {runCommandAndProcessLogs} = require('../utils/connServer.util');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const sgMail = require('@sendgrid/mail')
const client = require('@sendgrid/client');

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

const sendEmailWithSendGrid = async (nameUser, addressUser, options = {}) => {
    // ensure API key set
    sgMail.setApiKey(config.sendgrid.apiKey);

    const toAddress = addressUser || options.to || 'hasansanad73@gmail.com';
    const fromAddress = config.sendgrid.fromEmail;

    // default tracking settings (open & click enabled)
    const tracking_settings = {
        click_tracking: { enable: true, enable_text: true },
        open_tracking: { enable: true, substitution_tag: '' },
    };

    const mailOptions = {
        to: toAddress,
        from: fromAddress,
        subject: options.subject || 'Sending with SendGrid is Fun',
        text: options.text || 'and easy to do anywhere, even with Node.js',
        html: options.html || '<strong>and easy to do anywhere, even with Node.js</strong>',
        tracking_settings,
    };

    try {
        const response = await sgMail.send(mailOptions);
        console.log('Email sent via SendGrid', Array.isArray(response) ? response[0].statusCode : response.statusCode);
        return response;
    } catch (error) {
        console.error('SendGrid send error:', error && error.message ? error.message : error);
        // surface the full error for callers
        throw error;
    }
};

const webhookHandler = async (data) => {
    // console.log('Webhook data received:', data);
    client.setApiKey(config.sendgrid.apiKey);
    

}

module.exports = {
    sendEmail,
    checkEmailStatus,
    sendEmailWithSendGrid,
    sendBulkEmails,
    trackEmail,
    webhookHandler
}