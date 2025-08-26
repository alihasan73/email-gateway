const nodemailer = require('nodemailer');
const config = require('../config/config')

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


module.exports = {
    sendEmail
}