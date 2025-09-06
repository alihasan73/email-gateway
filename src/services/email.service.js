const nodemailer = require('nodemailer');
const config = require('../config/config')
const {runCommandAndProcessLogs} = require('../utils/connServer.util');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const sgMail = require('@sendgrid/mail')
const client = require('@sendgrid/client');
const { status } = require('http-status');
const logger = require('../config/logger.config');

const transporter = nodemailer.createTransport(config.email.smtp);

const { EventWebhook } = require('@sendgrid/eventwebhook');
const eventWebhook = new EventWebhook();

const sendEmail = async (nameUser, addressUser, subject, text, html = null, options = {}) => {
    const mid = crypto.randomBytes(12).toString('hex');
    const pixelUrl = `http://localhost:3000/api/v1/email/track?mid=${encodeURIComponent(mid)}`;
    const htmlWithPixel = html || `<a href="${pixelUrl}">Click here to track your email</a>`;

    const messageId = `<${mid}@local>`;
    const mailOptions = {
        from: { name: config.email.fromService, address: config.email.from },
        to: { name: nameUser, address: addressUser },
        subject,
        text,
        html: htmlWithPixel,
        headers: {
            'X-Internal-MID': mid,
            'Message-ID': messageId,
        },
    };

    const info = await transporter.sendMail(mailOptions);

    // persist mapping for later webhook correlation
    try {
        const sentFile = path.resolve(__dirname, '../../data/sent_messages.json');
        let sent = [];
        if (fs.existsSync(sentFile)) {
            const raw = fs.readFileSync(sentFile, 'utf8') || '[]';
            sent = JSON.parse(raw || '[]');
        }
        const entry = {
            mid,
            messageId: info && info.messageId ? info.messageId : messageId,
            to: addressUser,
            name: nameUser,
            subject,
            sentAt: new Date().toISOString(),
            provider: 'smtp',
            info: info || null,
        };
        sent.push(entry);
        const tmp = sentFile + '.tmp';
        fs.writeFileSync(tmp, JSON.stringify(sent, null, 2), 'utf8');
        fs.renameSync(tmp, sentFile);
    } catch (e) {
        // best-effort: ignore write errors
    }

    return info;

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



const sendEmailWithSendGrid = async (nameUser, addressUser, options = {}) => {
    sgMail.setApiKey(config.sendgrid.apiKey);

    const toAddress = addressUser;
    const fromAddress = config.sendgrid.fromEmail;

    // default tracking settings (open & click enabled)
    const tracking_settings = {
        click_tracking: { enable: true, enable_text: true },
        open_tracking: { enable: true, substitution_tag: '' },
    };

    const mid = crypto.randomBytes(12).toString('hex');

    const mailOptions = {
        to: toAddress,
        from: fromAddress,
        subject: options.subject || 'Sending with SendGrid is Fun',
        text: options.text || 'and easy to do anywhere, even with Node.js',
        html: options.html || '<strong>and easy to do anywhere, even with Node.js</strong>',
        tracking_settings,
        customArgs: { mid },
    };

    try {
        const response = await sgMail.send(mailOptions);
        // try to extract a message id from response headers if present
        let messageId = null;
        try {
            const r = Array.isArray(response) ? response[0] : response;
            if (r && r.headers) {
                // common header keys
                messageId = r.headers['x-message-id'] || r.headers['message-id'] || null;
            }
        } catch (e) {
            messageId = null;
        }

        // persist mapping
        try {
            const sentFile = path.resolve(__dirname, '../../data/sent_messages.json');
            let sent = [];
            if (fs.existsSync(sentFile)) {
                const raw = fs.readFileSync(sentFile, 'utf8') || '[]';
                sent = JSON.parse(raw || '[]');
            }
            const entry = {
                mid,
                messageId,
                to: toAddress,
                name: nameUser,
                subject: mailOptions.subject,
                sentAt: new Date().toISOString(),
                provider: 'sendgrid',
                info: response || null,
            };
            sent.push(entry);
            const tmp = sentFile + '.tmp';
            fs.writeFileSync(tmp, JSON.stringify(sent, null, 2), 'utf8');
            fs.renameSync(tmp, sentFile);
        } catch (e) {
            // ignore write errors
        }

        // // console.log'Email sent via SendGrid', Array.isArray(response) ? response[0].statusCode : response.statusCode);
        return response;
    } catch (error) {
        // console.error('SendGrid send error:', error && error.message ? error.message : error);
        // surface the full error for callers
        throw error;
    }
};

const webhookHandler = async (data) => {
    // Accept array or single event object
    const events = Array.isArray(data) ? data : [data];

    // load sent messages mapping
    const sentFile = path.resolve(__dirname, '../../data/sent_messages.json');
    let sent = [];
    try {
        if (fs.existsSync(sentFile)) {
            const raw = fs.readFileSync(sentFile, 'utf8') || '[]';
            sent = JSON.parse(raw || '[]');
        }
    } catch (e) {
        sent = [];
    }

    const eventsFile = path.resolve(__dirname, '../../data/email_events.json');
    let existing = [];
    try {
        if (fs.existsSync(eventsFile)) {
            const raw = fs.readFileSync(eventsFile, 'utf8') || '[]';
            existing = JSON.parse(raw || '[]');
        }
    } catch (e) {
        existing = [];
    }

    for (const ev of events) {
        // try to find mid in common places
        let mid = null;
        if (ev && ev.custom_args && ev.custom_args.mid) mid = ev.custom_args.mid;
        if (!mid && ev && ev.custom_args && ev.custom_args.MID) mid = ev.custom_args.MID;
        if (!mid && ev && ev.mid) mid = ev.mid;
        if (!mid && ev && ev.sg_message_id) mid = ev.sg_message_id;
        // check headers if present
        if (!mid && ev && ev.headers) {
            mid = ev.headers['X-Internal-MID'] || ev.headers['x-internal-mid'] || ev.headers['X-Internal-Mid'] || null;
            if (!mid) {
                // sometimes message-id contains our mid
                const msgid = ev.headers['Message-ID'] || ev.headers['message-id'] || ev.headers['messageId'];
                if (msgid) {
                    const m = msgid.match(/<?([a-f0-9]{24,})@/i);
                    if (m) mid = m[1];
                }
            }
        }

        // fallback: attempt to infer by smtp-id or message id fields
        let found = null;
        if (mid) {
            found = sent.find(s => s.mid === mid || s.messageId === mid);
        }
        if (!found) {
            // match by sg_message_id or message id
            const candidateIds = [ev.sg_message_id, ev['message-id'], ev['messageId'], ev.smtp_id, ev['smtp-id']].filter(Boolean);
            for (const cid of candidateIds) {
                found = sent.find(s => s.messageId && s.messageId.indexOf && s.messageId.indexOf(cid) !== -1 || s.messageId === cid);
                if (found) break;
            }
        }

        const record = {
            ts: new Date().toISOString(),
            event: ev,
            mid: mid || null,
            matched: !!found,
            mapping: found || null,
        };
        existing.push(record);
    }

    try {
        const tmp = eventsFile + '.tmp';
        fs.writeFileSync(tmp, JSON.stringify(existing, null, 2), 'utf8');
        fs.renameSync(tmp, eventsFile);
    } catch (e) {
        // ignore
    }

    return { ok: true, processed: events.length };
}

// register or update SendGrid Event Webhook settings via SendGrid API

const registerWebhook = async (webhookUrl, friendlyName) => {
    const apiKey = config.sendgrid?.apiKey || process.env.SENDGRID_API_KEY;
    if (!apiKey) {
        const err = new Error('SendGrid API Key not configured');
        err.statusCode = status.INTERNAL_SERVER_ERROR ;
        throw err;
    }
    client.setApiKey(apiKey);
    if (!webhookUrl) {
        const err = new Error('webhookUrl is required');
        err.statusCode = status.BAD_REQUEST ;
        throw err;
    }
    const data = {
        enabled: true,
        url: webhookUrl,
        group_resubscribe: true,
        delivered: true,
        group_unsubscribe: true,
        spam_report: true,
        bounce: true,
        deferred: true,
        unsubscribe: true,
        processed: true,
        open: true,
        click: true,
        dropped: true,
        friendly_name: friendlyName,
    };
    const request = {
        url: `/v3/user/webhooks/event/settings`,
        method: 'POST',
        body: data,
    };
    const [response, body] = await client.request(request);
    return {
        message: 'Webhook configured successfully',
        statusCode: response.statusCode,
        webhookUrl,
        configuration: data,
        response: body,
    };
};

const eventSendgrid = async (req) => {
    // console.log'\n=== SendGrid Webhook Event Received ===');
    // console.log'Timestamp:', new Date().toISOString());
    if (!req.body) {
        // console.log'❌ Empty payload received');
        return { code: status.BAD_REQUEST, message: 'empty payload' };
    }

    const raw = Buffer.isBuffer(req.body) ? req.body.toString() : (typeof req.body === 'string' ? req.body : JSON.stringify(req.body));
    const signature = req.get ? req.get('x-twilio-email-event-webhook-signature') : null;
    const timestamp = req.get ? req.get('x-twilio-email-event-webhook-timestamp') : null;

    // console.log'Headers received:');
    // console.log'- Signature:', signature ? 'Present' : 'Missing');
    // console.log'- Timestamp:', timestamp || 'Missing');

    const publicKey = config.sendgrid?.publicKey || process.env.SENDGRID_PUBLIC_KEY;
    if (publicKey) {
        try {
            const verified = eventWebhook.verify(signature, raw, timestamp, publicKey);
            // console.log'- Signature verification:', verified ? 'passed' : 'FAILED');
            if (!verified) {
                console.error('❌ Event webhook signature verification failed');
                return { code: status.UNAUTHORIZED, message: 'signature verification failed' };
            }
        } catch (err) {
            console.error('❌ Error during signature verification:', err && err.message ? err.message : err);
            return { code: status.INTERNAL_SERVER_ERROR, message: 'verification error' };
        }
    } else {
        // console.warn('⚠️ No SendGrid public key configured — skipping signature verification. Set SENDGRID_PUBLIC_KEY in env/config to enable verification.');
    }

    let events;
    try {
        events = JSON.parse(raw);
    } catch (err) {
        console.error('❌ Invalid JSON payload:', err.message);
        return { code: status.BAD_REQUEST, message: 'invalid payload' };
    }

    try {
        await webhookHandler(events);
        // console.log'✅ Events processed and persisted by emailService');
    } catch (e) {
        console.error('❌ Failed to process events via service:', e && e.message ? e.message : e);
        return { code: status.INTERNAL_SERVER_ERROR, message: 'failed to process events' };
    }

    // Display event details
    if (Array.isArray(events)) {
        // console.log`📧 Received ${events.length} event(s)`);
        events.forEach((event, index) => {
            // console.log`\n--- Event ${index + 1} ---`);
            // console.log'Event Type:', event.event || 'Unknown');
            // console.log'Email:', event.email || 'Unknown');
            // console.log'Timestamp:', event.timestamp ? new Date(event.timestamp * 1000).toISOString() : 'Unknown');
            // console.log'Message ID:', event.sg_message_id || 'Unknown');
            // console.log'Event ID:', event.sg_event_id || 'Unknown');
            switch(event.event) {
                case 'delivered':
                    // console.log'✅ Email delivered successfully');
                    if (event.response) // console.log'Response:', event.response);
                    break;
                case 'bounce':
                    // console.log'❌ Email bounced');
                    // console.log'Reason:', event.reason || 'Unknown');
                    // console.log'Type:', event.type || 'Unknown');
                    break;
                case 'open':
                    // console.log'👁️ Email opened');
                    // console.log'User Agent:', event.useragent || 'Unknown');
                    // console.log'IP:', event.ip || 'Unknown');
                    break;
                case 'click':
                    // console.log'🔗 Link clicked');
                    // console.log'URL:', event.url || 'Unknown');
                    // console.log'User Agent:', event.useragent || 'Unknown');
                    // console.log'IP:', event.ip || 'Unknown');
                    break;
                case 'spam':
                    // console.log'🚫 Email marked as spam');
                    break;
                case 'unsubscribe':
                    // console.log'🚪 User unsubscribed');
                    break;
                case 'dropped':
                    // console.log'🗑️ Email dropped');
                    // console.log'Reason:', event.reason || 'Unknown');
                    break;
                case 'deferred':
                    // console.log'⏳ Email deferred');
                    // console.log'Reason:', event.reason || 'Unknown');
                    if (event.attempt) // console.log'Attempt:', event.attempt);
                    break;
                case 'processed':
                    // console.log'⚙️ Email processed by SendGrid');
                    break;
                default:
                    // console.log'🔍 Other event type');
            }
            if (event.category && event.category.length > 0) {
                // console.log'Categories:', event.category.join(', '));
            }
            if (event.asm_group_id) {
                // console.log'ASM Group ID:', event.asm_group_id);
            }
            if (event.marketing_campaign_id) {
                // console.log'Campaign ID:', event.marketing_campaign_id);
            }
            if (event.marketing_campaign_name) {
                // console.log'Campaign Name:', event.marketing_campaign_name);
            }
            // console.log'Raw Event Data:', JSON.stringify(event, null, 2));
        });
    } else {
        // console.log'📧 Received single event');
        // console.log'Raw Data:', JSON.stringify(events, null, 2));
    }
    // console.log'=== End of SendGrid Webhook Event ===\n');
    return { code: status.OK, message: 'events processed' };
};

const webhookInfo = (req) => {
    const { protocol, hostname } = req;
    const port = req.get('host').split(':')[1];
    const baseUrl = `${protocol}://${hostname}${port ? ':' + port : ''}`;
    const webhookEndpoint = `${baseUrl}/api/v1/email/events-sendgrid`;
    logger.info(`Akses endpoint /webhook-info oleh ${req.ip || req.connection.remoteAddress}`);
    return {
        message: 'SendGrid Webhook Information',
        endpoints: {
            webhook_receiver: {
                url: webhookEndpoint,
                method: 'POST',
                description: 'Receives real-time events from SendGrid',
                content_type: 'application/json',
                note: 'Events will be displayed in the server console'
            },
            webhook_setup: {
                url: `${baseUrl}/api/v1/email/webhook-sendgrid`,
                method: 'POST',
                description: 'Configure SendGrid webhook settings',
                body_example: {
                    webhookUrl: webhookEndpoint,
                    friendlyName: 'My Email Gateway Webhook'
                }
            }
        },
        supported_events: [
            'delivered',
            'bounce',
            'open',
            'click',
            'spam',
            'unsubscribe',
            'dropped',
            'deferred',
            'processed'
        ],
        setup_instructions: [
            '1. Make sure your SendGrid API key is configured in environment variables',
            '2. Use the webhook_setup endpoint to register your webhook with SendGrid',
            '3. Send test emails through SendGrid',
            '4. Monitor the server console for real-time event logs'
        ]
    };
};

module.exports = {
    sendEmail,
    checkEmailStatus,
    sendEmailWithSendGrid,
    sendBulkEmails,
    webhookHandler,
    registerWebhook,
    eventSendgrid,
    webhookInfo
}

