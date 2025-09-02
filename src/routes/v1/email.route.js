const express = require('express');
const router = express.Router();
const { validate } = require('../../middlewares');
const { emailValidation } = require('../../validations');
const { emailController} = require('../../controllers');
    

router.post('/', validate(emailValidation.email), emailController.sendEmail);
router.get('/track', emailController.trackEmail);
router.post('/status-single', validate(emailValidation.status), emailController.checkStatus);
router.post('/schedule', validate(emailValidation.schedule), emailController.scheduleEmail);
router.post('/bulk', validate(emailValidation.schemaArrayBulk), emailController.bulkEmails);
router.post('/sendgrid', emailController.emailSendGrid);
router.post('/events-sendgrid', express.raw({ type: '*/*' }), emailController.emailEventSendgrid);
router.post('/webhook-sendgrid', emailController.handleWebhook);
router.get('/webhook-info', emailController.getWebhookInfo);
// validate(emailValidation.emailSendGrid),

module.exports = router;