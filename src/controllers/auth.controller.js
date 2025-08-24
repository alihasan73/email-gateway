const { status } = require('http-status');
const {catchAsync} = require('../utils/catchAsync.util');
const {userService, tokenService} =require("../services")

const test = catchAsync(async (req, res) => {
        res.status(status.OK).json({ message: 'Test successful' });
});
const register = catchAsync(async (req, res) => {
    const user = await userService.createUser(req.body);
    const tokens = await tokenService.generateAuthTokens(user.insertId);
    res.status(status.CREATED).json({user, tokens});
});

const verifyEmail = catchAsync(async (req, res) => {
    const isValid = await userService.verifyEmail(email, verificationCode);
    
});

module.exports = { test, register, verifyEmail };