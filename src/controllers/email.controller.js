const { status } = require('http-status');
const {catchAsync} = require('../utils/catchAsync.util');
const {emailService, scheduleService} = require('../services');



const sendEmail = catchAsync(async (req, res) => {
    const {name, to, subject, text } = req.body;
    await emailService.sendEmail(name, to, subject, text);
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
    // console.log(req.body);
    const results = await emailService.sendBulkEmails(req.body.emails);
    res.status(status.OK).json({ results });
})

module.exports = {sendEmail, checkStatus, scheduleEmail, bulkEmails}