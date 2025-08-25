const {status} = require('http-status');
const {userModel} = require('../models');
const ApiError = require('../utils/apiError.util');
const bcrypt = require('bcrypt');

const createUser = async (userData) => {
    if(await userModel.isEmailTaken(userData.email)) {
        throw new ApiError(status.BAD_REQUEST, 'Email is already taken');
    }

    async function hashPassword(password) {
        const salt = await bcrypt.genSalt(10);
        return await bcrypt.hash(password, salt);
    }

    let hashedPassword = await hashPassword(userData.password);
    // console.log(result);
    return userModel.getProcess('INSERT INTO users (name, email, password, role, isEmailVerified) VALUES (?, ?, ?, ?, ?)', [userData.name, userData.email, hashedPassword, userData.role, userData.isEmailVerified]);
};


module.exports = { createUser };