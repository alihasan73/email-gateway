const Joi = require('joi');


const email = {
    body: Joi.object().keys({
        name: Joi.string().required(),
        to: Joi.string().email().required(),
        subject: Joi.string().required(),
        text: Joi.string().required(),
    })
}

module.exports = { email };