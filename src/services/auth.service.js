const {userModel, tokenModel} = require('../models');
const {verifyToken} = require('./token.service');
const {tokenTypes} = require('../config/token.config');
const { generateAuthTokens } = require('./token.service');
const {status} = require('http-status');
const ApiError = require('../utils/apiError.util');


const loginUserWithEmailAndPassword = async (email, password) => {
    const user = await userModel.isEmailTaken(email);
    if (!user) throw new ApiError(status.NOT_FOUND, 'User not found');

    const isMatch = await userModel.comparePassword(password, user.password);
    if (!isMatch) throw new ApiError(status.UNAUTHORIZED, 'Invalid password');

    return user;
};

const refreshAuth = async (refreshToken) => {
    try {
        const payload = await verifyToken(refreshToken, tokenTypes.REFRESH);
        const user = await userModel.getUserId(payload.sub);
        if(!user){
            throw new Error('User not found');
        }
        await tokenModel.deleteOne(payload.sub, refreshToken, tokenTypes.REFRESH, false);
        return generateAuthTokens(user.id);
    } catch (error) {
        throw new ApiError(status.UNAUTHORIZED, 'Please authenticate');
    }
}

const logout = async (refreshToken) => {
        const user = await tokenModel.findOne(refreshToken, tokenTypes.REFRESH, false);
        if (!user) throw new Error('User not found');
        
        await tokenModel.deleteOne(user.user_id, refreshToken, tokenTypes.REFRESH, false);
};

module.exports = {
    loginUserWithEmailAndPassword,
    refreshAuth,
    logout
};