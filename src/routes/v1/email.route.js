const express = require('express');
const router = express.Router();
const { validate } = require('../../middlewares');
const { emailValidation } = require('../../validations');
const { emailController} = require('../../controllers');
    


// router.post("/register", validate(authValidation.register), authController.register);
router.post('/', validate(emailValidation.email), emailController.sendEmail);
router.post('/status-single', validate(emailValidation.status), emailController.checkStatus);

module.exports = router;