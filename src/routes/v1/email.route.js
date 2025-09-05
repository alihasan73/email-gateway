const express = require('express');
const router = express.Router();
const { validate } = require('../../middlewares');
const { emailValidation } = require('../../validations');
const { emailController} = require('../../controllers');
    

router.post('/', validate(emailValidation.email), emailController.sendEmail);
router.post('/status', validate(emailValidation.status), emailController.checkStatus);
router.post('/schedule', validate(emailValidation.schedule), emailController.scheduleEmail);
router.post('/bulk', validate(emailValidation.schemaArrayBulk), emailController.bulkEmails);
router.post('/sendgrid',validate(emailValidation.emailSendGrid), emailController.emailSendGrid);
router.post('/events-sendgrid', emailController.emailEventSendgrid);
router.post('/webhook-sendgrid', validate(emailValidation.registerSendGridWebhook), emailController.registerSendGridWebhook);
router.get('/webhook-info', emailController.getSendGridWebhookInfo);

module.exports = router;