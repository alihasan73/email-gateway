const Joi = require('joi');


const email = {
    body: Joi.object().keys({
        name: Joi.string().required(),
        to: Joi.string().email().required(),
        subject: Joi.string().required(),
        text: Joi.string().required(),
        html: Joi.string().allow(null, '').optional(),
        track: Joi.boolean().optional()
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

const schemaArraySubscribe = {
    body: Joi.object().keys({
        name: Joi.string().required(),
        to: Joi.string().email().required(),
    })
}

const webhook = {
    body: Joi.object().keys({
        event: Joi.string().required(), // e.g., 'delivered', 'bounced', 'opened'
        email: Joi.string().email().required(),
        subject: Joi.string().optional(),
        timestamp: Joi.string().optional(),
        // Tambahkan field lain sesuai kebutuhan provider webhook
    })
}

const emailMailTrap = {
    body: Joi.object().keys({
        name: Joi.string().required(),
        to: Joi.string().email().required(),
        // subject: Joi.string().required(),
        // text: Joi.string().required(),
    })
}
module.exports = { email, status, schedule, bulkFormat, schemaArrayBulk, schemaArraySubscribe, webhook, emailMailTrap };