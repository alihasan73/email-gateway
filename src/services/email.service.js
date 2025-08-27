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

module.exports = {
    sendEmail,
    checkEmailStatus
}