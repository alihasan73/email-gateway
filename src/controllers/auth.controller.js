const { status } = require('http-status');
const {catchAsync} = require('../utils/catchAsync.util');
const {userService, tokenService, authService} =require("../services")

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

const login = catchAsync(async (req, res) => {
    const {email, password} = req.body;
    const user = await authService.loginUserWithEmailAndPassword(email, password);
    const tokens = await tokenService.generateAuthTokens(user.id);
    res.status(status.OK).json({ user, tokens });
})

const refreshToken = catchAsync(async (req, res) => {
    const { refreshToken } = req.body;
    const token = await authService.refreshAuth(refreshToken);
    res.status(status.OK).json({ token });
})

const logout = catchAsync(async (req, res) => {
    const { refreshToken } = req.body;
    await authService.logout(refreshToken);
    res.status(status.NO_CONTENT).send();
})

module.exports = { test, register, verifyEmail, login, refreshToken, logout };