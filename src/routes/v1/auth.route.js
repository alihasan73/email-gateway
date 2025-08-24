const express = require('express');
const router = express.Router();

const { authController } = require('../../controllers');
const { userModel } = require('../../models');
const { authValidation } = require('../../validations');
const { validate } = require('../../middlewares');

router.get('/test', authController.test);
router.post("/register", validate(authValidation.register), authController.register);
// router.post("/email", )

module.exports = router;

