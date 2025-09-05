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
    const { name, to } = req.body;
    await emailService.sendEmailWithSendGrid(name, to);
    res.status(status.OK).json({ message: 'Email sent successfully via SendGrid' });
});

const emailEventSendgrid = catchAsync(async (req, res) => {
    const result = await emailService.eventSendgrid(req);
    if (result.code !== status.OK) {
        return res.status(result.code).send(result.message);
    }
    return res.sendStatus(status.OK);
});


const registerSendGridWebhook = catchAsync(async (req, res) => {
    const { url, name = "Email Gateway Webhook" } = req.body;
    let result = await emailService.registerWebhook(url, name);
    res.status(result.statusCode).json(result);
});

const getSendGridWebhookInfo = catchAsync(async (req, res) => {
    const result = emailService.webhookInfo(req);
    res.status(status.OK).json(result);
});


module.exports = {sendEmail, checkStatus, scheduleEmail, bulkEmails, subscribeEmail, registerSendGridWebhook, emailSendGrid, emailEventSendgrid, getSendGridWebhookInfo};