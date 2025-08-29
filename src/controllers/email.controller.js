const { status } = require('http-status');
const {catchAsync} = require('../utils/catchAsync.util');
const {emailService, scheduleService} = require('../services');



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

const trackEmail = catchAsync(async (req, res) => {
    const { mid, type = 'open' } = req.query;
    if (!mid) return res.status(status.BAD_REQUEST).send('missing mid');
    const result = await emailService.trackEmail(mid, req, type);
    if (!result) return res.status(status.INTERNAL_SERVER_ERROR).send('tracking error');
    res.set(result.headers);
    res.status(status.OK).send(result.pixel);
})

const emailMailTrap = catchAsync(async (req, res) => {
    const { name, to } = req.body;
    await emailService.sendEmailWithMailTrap(name, to);
    res.status(status.OK).json({ message: 'Email sent successfully via MailTrap' });
});

const handleWebhook = catchAsync(async (req, res) => {
    console.log('Webhook received:', JSON.stringify(req.body, null, 2));
    res.status(status.OK).send('Webhook received');
});

module.exports = {sendEmail, checkStatus, scheduleEmail, bulkEmails, subscribeEmail, trackEmail, handleWebhook, emailMailTrap};