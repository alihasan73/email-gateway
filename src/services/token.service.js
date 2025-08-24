const jwt = require('jsonwebtoken');
const moment = require('moment');
const {status} = require('http-status');
const config = require('../config/config');
const ApiError = require('../utils/apiError.util');
const {tokenTypes} = require('../config/token.config')
const { tokenModel } = require('../models');


const generateToken = (userId, expires, type, secret = config.jwt.secret) => {
    const payload = {
        sub: userId,
        iat: moment().unix(),
        exp: expires.unix(),
        type,
    };
    return jwt.sign(payload, secret);
};

const saveToken = async (userId, token,  expires, type, blacklisted = false) => {
    const tokenDoc = await tokenModel.getProcess(`INSERT INTO tokens (user_id, token, expires, type, blacklisted) VALUES (?, ?, ?, ?, ?)`, 
        [userId, token, expires.toDate(), type, blacklisted]);
    return tokenDoc;
};
const generateAuthTokens = async (user) => {
    const accessTokenExpires = moment().add(config.jwt.accessExpirationMinutes, 'minutes');
    const accessToken = generateToken(user, accessTokenExpires, tokenTypes.ACCESS);
    const refreshTokenExpires = moment().add(config.jwt.refreshExpirationDays, 'days');
    const refreshToken = generateToken(user, refreshTokenExpires, tokenTypes.REFRESH);
    await saveToken(user, refreshToken, refreshTokenExpires, tokenTypes.REFRESH);
    return {
        access: {
            token: accessToken,
            expires: accessTokenExpires.toDate(),
        },
        refresh: {
            token: refreshToken,
            expires: refreshTokenExpires.toDate(),
        },
    };
    
};

module.exports = { generateToken, saveToken, generateAuthTokens };