const { status } = require('http-status');
const {catchAsync} = require('../utils/catchAsync.util');
const {emailService} = require('../services');


const sendEmail = catchAsync(async (req, res) => {
    const {name, to, subject, text } = req.body;
    await emailService.sendEmail(name, to, subject, text);
    res.status(status.OK).json({ message: 'Email sent successfully' });
});


module.exports = {sendEmail}