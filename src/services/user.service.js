const {status} = require('http-status');
const {userModel} = require('../models');
const ApiError = require('../utils/apiError.util');

const createUser = async (userData) => {
    if(await userModel.isEmailTaken(userData.email)) {
        throw new ApiError(status.BAD_REQUEST, 'Email is already taken');
    }
    return userModel.getProcess('INSERT INTO users (name, email, password, role, isEmailVerified) VALUES (?, ?, ?, ?, ?)', [userData.name, userData.email, userData.password, userData.role, userData.isEmailVerified]);
};


module.exports = { createUser };