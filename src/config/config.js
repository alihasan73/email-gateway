const dotenv = require('dotenv');
const path = require('path');
const Joi = require('joi');

dotenv.config({ path: path.join(__dirname, '../../.env') });


const envVarsSchema = Joi.object()
  .keys({
    NODE_ENV: Joi.string().valid('production', 'development', 'test').required(),
    PORT: Joi.number().default(3000),
    HOST_DB: Joi.string().default('localhost'),
    USER_DB: Joi.string().default('root'),
    PASSWORD_DB: Joi.string().allow('').default(''),
    DATABASE_DB: Joi.string(),
    MONGODB_URL: Joi.string().required().description('Mongo DB url'),
    JWT_SECRET: Joi.string().required().description('JWT secret key'),
    JWT_ACCESS_EXPIRATION_MINUTES: Joi.number().default(30).description('minutes after which access tokens expire'),
    JWT_REFRESH_EXPIRATION_DAYS: Joi.number().default(30).description('days after which refresh tokens expire'),
    JWT_RESET_PASSWORD_EXPIRATION_MINUTES: Joi.number()
      .default(10)
      .description('minutes after which reset password token expires'),
    JWT_VERIFY_EMAIL_EXPIRATION_MINUTES: Joi.number()
      .default(10)
      .description('minutes after which verify email token expires'),
    SMTP_HOST: Joi.string().description('server that will send the emails'),
    SMTP_PORT: Joi.number().description('port to connect to the email server'),
    SMTP_USERNAME: Joi.string().description('username for email server'),
    SMTP_PASSWORD: Joi.string().description('password for email server'),
    EMAIL_FROM: Joi.string().description('the from field in the emails sent by the app'),
    SMTP_SERVICE: Joi.string().description('the email service to use'),
    FROM_SERVICE: Joi.string().description('the from service to use'),
    SMTP_HOST_5: Joi.string().description('SMTP host for the 5th email server'),
    SMTP_PORT_5: Joi.number().description('SMTP port for the 5th email server'),
    SMTP_USERNAME_5: Joi.string().description('SMTP username for the 5th email server'),
    SMTP_PASSWORD_5: Joi.string().description('SMTP password for the 5th email server'),
    SMTP_COMMAND_5: Joi.string().allow('').description('SMTP command for the 5th email server'),
  })
  .unknown();

const { value: envVars, error } = envVarsSchema.prefs({ errors: { label: 'key' } }).validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

module.exports = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  db : {
    host: envVars.HOST_DB,
    user: envVars.USER_DB,
    password: envVars.PASSWORD_DB,
    database: envVars.DATABASE_DB
  },
  jwt: {
    secret: envVars.JWT_SECRET,
    accessExpirationMinutes: envVars.JWT_ACCESS_EXPIRATION_MINUTES,
    refreshExpirationDays: envVars.JWT_REFRESH_EXPIRATION_DAYS,
    resetPasswordExpirationMinutes: envVars.JWT_RESET_PASSWORD_EXPIRATION_MINUTES,
    verifyEmailExpirationMinutes: envVars.JWT_VERIFY_EMAIL_EXPIRATION_MINUTES,
  },
  email: {
    smtp: {
      // host: envVars.SMTP_HOST,
      // port: envVars.SMTP_PORT,
      service: envVars.SMTP_SERVICE,
      auth: {
        user: envVars.SMTP_USERNAME,
        pass: envVars.SMTP_PASSWORD,
      },
    },
    from: envVars.EMAIL_FROM,
    fromService: envVars.FROM_SERVICE,
    smtp_5: {
      host: envVars.SMTP_HOST_5,
      port: envVars.SMTP_PORT_5,
      username : envVars.SMTP_USERNAME_5,
      password : envVars.SMTP_PASSWORD_5,
      command: envVars.SMTP_COMMAND_5
    },
  },
};