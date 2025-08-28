const Joi = require('joi');


const email = {
    body: Joi.object().keys({
        name: Joi.string().required(),
        to: Joi.string().email().required(),
        subject: Joi.string().required(),
        text: Joi.string().required(),
    })
}
const status = {
    body: Joi.object().keys({
        mailid: Joi.string().required(),
    })
}
const schedule = {
    body: Joi.object().keys({
        name: Joi.string().required(),
        to: Joi.string().email().required(),
        subject: Joi.string().required(),
        text: Joi.string().required(),
        sendAt: Joi.string().required()
    })
}
const bulkFormat = Joi.object({
    name: Joi.string().required(),
    to: Joi.string().email().required(),
    subject: Joi.string().required(),
    text: Joi.string().required(),
})

const schemaArrayBulk = {
  body: Joi.object({
    emails: Joi.array().items(bulkFormat).required()
  })
};

module.exports = { email, status, schedule, bulkFormat, schemaArrayBulk };