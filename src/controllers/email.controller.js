
const { status } = require('http-status');
const {catchAsync} = require('../utils/catchAsync.util');
const {emailService, scheduleService} = require('../services');
// const e = require('express');
const client = require('@sendgrid/client');
const config = require('../config/config');
const { EventWebhook } = require('@sendgrid/eventwebhook'); // install dulu
const eventWebhook = new EventWebhook();


const sendEmail = catchAsync(async (req, res) => {
    const {name, to, subject, text, html, track } = req.body;
    await emailService.sendEmail(name, to, subject, text, html, track);
    res.status(status.OK).json({ message: 'Email sent successfully' });
});
const checkStatus = catchAsync(async (req, res) => {
    const { mailid } = req.body;
    const respon = await emailService.checkEmailStatus(mailid);
    res.status(status.OK).json({ respon });
});
const scheduleEmail = catchAsync(async (req, res) => {
    const job = scheduleService.scheduleEmail(req.body);
    res.status(status.OK).json({ job });
});

const bulkEmails = catchAsync(async (req, res) => {
    const results = await emailService.sendBulkEmails(req.body.emails);
    res.status(status.OK).json({ results });
});

const subscribeEmail = catchAsync(async (req, res) => {
    const { name, to } = req.body;
    await emailService.subscribeEmail(name, to);
    res.status(status.OK).json({ message: 'Subscription successful' });
});

const emailSendGrid = catchAsync(async (req, res) => {
    // const { name, to } = req.body;
    await emailService.sendEmailWithSendGrid();
    res.status(status.OK).json({ message: 'Email sent successfully via SendGrid' });
});

const emailEventSendgrid = catchAsync(async (req, res) => {
    console.log('\n=== SendGrid Webhook Event Received ===');
    console.log('Timestamp:', new Date().toISOString());
    
    // pastikan route menggunakan express.raw({ type: '*/*' })
    if (!req.body) {
        console.log('❌ Empty payload received');
        return res.status(400).send('empty payload');
    }

    const raw = Buffer.isBuffer(req.body) ? req.body.toString() : (typeof req.body === 'string' ? req.body : JSON.stringify(req.body));
    const signature = req.get('x-twilio-email-event-webhook-signature');
    const timestamp = req.get('x-twilio-email-event-webhook-timestamp');

    console.log('Headers received:');
    console.log('- Signature:', signature ? 'Present' : 'Missing');
    console.log('- Timestamp:', timestamp || 'Missing');

    // Verify signature if public key configured
    const publicKey = config.sendgrid?.publicKey || process.env.SENDGRID_PUBLIC_KEY;
    if (publicKey) {
        try {
            const verified = eventWebhook.verify(signature, raw, timestamp, publicKey);
            console.log('- Signature verification:', verified ? 'passed' : 'FAILED');
            if (!verified) {
                console.error('❌ Event webhook signature verification failed');
                return res.status(401).send('signature verification failed');
            }
        } catch (err) {
            console.error('❌ Error during signature verification:', err && err.message ? err.message : err);
            return res.status(500).send('verification error');
        }
    } else {
        console.warn('⚠️ No SendGrid public key configured — skipping signature verification. Set SENDGRID_PUBLIC_KEY in env/config to enable verification.');
    }

    

    // Parse events
    let events;
    try {
        events = JSON.parse(raw);
    } catch (err) {
        console.error('❌ Invalid JSON payload:', err.message);
        return res.status(400).send('invalid payload');
    }

    // persist/enrich events via service
    try {
        await emailService.webhookHandler(events);
        console.log('✅ Events processed and persisted by emailService');
    } catch (e) {
        console.error('❌ Failed to process events via service:', e && e.message ? e.message : e);
    }

    // Display event details
    if (Array.isArray(events)) {
        console.log(`📧 Received ${events.length} event(s)`);
        
        events.forEach((event, index) => {
            console.log(`\n--- Event ${index + 1} ---`);
            console.log('Event Type:', event.event || 'Unknown');
            console.log('Email:', event.email || 'Unknown');
            console.log('Timestamp:', event.timestamp ? new Date(event.timestamp * 1000).toISOString() : 'Unknown');
            console.log('Message ID:', event.sg_message_id || 'Unknown');
            console.log('Event ID:', event.sg_event_id || 'Unknown');
            
            // Display specific event data based on event type
            switch(event.event) {
                case 'delivered':
                    console.log('✅ Email delivered successfully');
                    if (event.response) console.log('Response:', event.response);
                    break;
                    
                case 'bounce':
                    console.log('❌ Email bounced');
                    console.log('Reason:', event.reason || 'Unknown');
                    console.log('Type:', event.type || 'Unknown');
                    break;
                    
                case 'open':
                    console.log('👁️ Email opened');
                    console.log('User Agent:', event.useragent || 'Unknown');
                    console.log('IP:', event.ip || 'Unknown');
                    break;
                    
                case 'click':
                    console.log('🔗 Link clicked');
                    console.log('URL:', event.url || 'Unknown');
                    console.log('User Agent:', event.useragent || 'Unknown');
                    console.log('IP:', event.ip || 'Unknown');
                    break;
                    
                case 'spam':
                    console.log('🚫 Email marked as spam');
                    break;
                    
                case 'unsubscribe':
                    console.log('🚪 User unsubscribed');
                    break;
                    
                case 'dropped':
                    console.log('🗑️ Email dropped');
                    console.log('Reason:', event.reason || 'Unknown');
                    break;
                    
                case 'deferred':
                    console.log('⏳ Email deferred');
                    console.log('Reason:', event.reason || 'Unknown');
                    if (event.attempt) console.log('Attempt:', event.attempt);
                    break;
                    
                case 'processed':
                    console.log('⚙️ Email processed by SendGrid');
                    break;
                    
                default:
                    console.log('🔍 Other event type');
            }
            
            // Display additional common fields
            if (event.category && event.category.length > 0) {
                console.log('Categories:', event.category.join(', '));
            }
            if (event.asm_group_id) {
                console.log('ASM Group ID:', event.asm_group_id);
            }
            if (event.marketing_campaign_id) {
                console.log('Campaign ID:', event.marketing_campaign_id);
            }
            if (event.marketing_campaign_name) {
                console.log('Campaign Name:', event.marketing_campaign_name);
            }
            
            // Display raw event data for debugging
            console.log('Raw Event Data:', JSON.stringify(event, null, 2));
        });
    } else {
        console.log('📧 Received single event');
        console.log('Raw Data:', JSON.stringify(events, null, 2));
    }
    
    console.log('=== End of SendGrid Webhook Event ===\n');
    
    // Respond quickly to SendGrid
    return res.sendStatus(200);
});

const trackEmail = catchAsync(async (req, res) => {
    // serve a tracking pixel and persist event via service
    const mid = req.query.mid || req.params.mid || null;
    const result = await emailService.trackEmail(mid, req, 'open');
    // result should contain { pixel, headers }
    if (result && result.headers) {
        Object.entries(result.headers).forEach(([k, v]) => {
            try { res.set(k, v); } catch (e) { /* ignore header set errors */ }
        });
    }
    const pixel = result && result.pixel ? result.pixel : Buffer.from('');
    return res.status(200).send(pixel);
});

const handleWebhook = catchAsync(async (req, res) => {
    console.log('\n=== Setting up SendGrid Webhook ===');
    
    const apiKey = config.sendgrid?.apiKey || process.env.SENDGRID_API_KEY;
    if (!apiKey) {
        console.error('❌ SendGrid API Key not found');
        return res.status(500).json({ error: 'SendGrid API Key not configured' });
    }
    
    client.setApiKey(apiKey);
    
    // Webhook configuration
    const { webhookUrl, friendlyName = "Email Gateway Webhook" } = req.body;
    
    if (!webhookUrl) {
        return res.status(400).json({ 
            error: 'webhookUrl is required',
            example: 'https://your-domain.com/api/v1/email/events-sendgrid'
        });
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


    console.log('Webhook URL:', webhookUrl);
    console.log('Configuration:', JSON.stringify(data, null, 2));

    const request = {
        url: `/v3/user/webhooks/event/settings`,
        method: "POST",
        body: data,
    };
    
    try {
        const [response, body] = await client.request(request);
        
        console.log('✅ Webhook setup successful');
        console.log('Response Body:', JSON.stringify(body, null, 2));
        
        console.log("testing-testing");
        console.log('raw response:', response);   // status, headers, dll
        console.log('body:', body); 
        res.status(200).json({
            message: 'Webhook configured successfully',
            statusCode: response.statusCode,
            webhookUrl: webhookUrl,
            configuration: data,
            response: body
        });
        
    } catch (error) {
        console.error('❌ Webhook setup failed:', error.message);
        console.error('Error details:', error.response?.body || error);
        
        res.status(500).json({
            error: 'Failed to configure webhook',
            details: error.message,
            response: error.response?.body
        });
    }
    
    console.log('=== End of Webhook Setup ===\n');
});

const getWebhookInfo = catchAsync(async (req, res) => {
    const { protocol, hostname } = req;
    const port = req.get('host').split(':')[1];
    const baseUrl = `${protocol}://${hostname}${port ? ':' + port : ''}`;
    
    const webhookEndpoint = `${baseUrl}/api/v1/email/events-sendgrid`;
    
    res.status(200).json({
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
                    friendlyName: "My Email Gateway Webhook"
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
    });
});

const listEventWebhooks = catchAsync(async (req, res) => {
    const apiKey = config.sendgrid?.apiKey || process.env.SENDGRID_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'SendGrid API key not configured' });
    client.setApiKey(apiKey);

    const request = {
        url: `/v3/user/webhooks/event/settings/all  `,
        method: 'GET',
    };

    try {
        const [response, body] = await client.request(request);
        console.log('SendGrid list webhooks response:', response.statusCode);
        return res.status(response.statusCode || 200).json({ statusCode: response.statusCode, body });
    } catch (error) {
        console.error('SendGrid list webhooks error:', error.response ? error.response.body : error);
        return res.status(500).json({ error: error.response ? error.response.body : String(error) });
    }
});

const trackSendGrid = catchAsync(async (req, res) => {
    const apiKey = config.sendgrid?.apiKey || process.env.SENDGRID_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'SendGrid API key not configured' });
    client.setApiKey(apiKey);

    const request = {
        url: `/v3/tracking_settings`,
        method: 'GET',
    };

    try {
        const [response, body] = await client.request(request);
        console.log('SendGrid test webhook response:', response.statusCode);
        return res.status(200).json({ statusCode: response.statusCode, body });
    } catch (error) {
        console.log(error);
        console.error('SendGrid test webhook error:', error.response ? error.response.body : error);
        return res.status(500).json({ error: error.response ? error.response.body : String(error) });
    }
});

module.exports = {sendEmail, checkStatus, scheduleEmail, bulkEmails, subscribeEmail, handleWebhook, emailSendGrid, emailEventSendgrid, getWebhookInfo, trackEmail, listEventWebhooks, trackSendGrid};