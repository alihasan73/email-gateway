const Joi = require('joi');
const {password} = require('../utils/password.util');


// Export plain objects with keys (params/query/body). The validate middleware
// expects a plain object so it can pick those keys before compiling the Joi schema.
const register = {
    body: Joi.object().keys({
        name: Joi.string().min(2).required(),
        email: Joi.string().email().required(),
        password: Joi.string().required().custom(password),
        role: Joi.string().valid('user', 'admin'),
        isEmailVerified: Joi.boolean().required()
    }),
};

const login = {
    body: Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().required().custom(password),
    }),
};

module.exports = { register, login };