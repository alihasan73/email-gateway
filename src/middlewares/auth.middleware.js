const passport = require('passport');
const { status } = require('http-status');
const ApiError = require('../utils/apiError.util');
// const { roleRights } = require('../config/roles');

const auth = (...requiredRights) => async (req, res, next) => {
  try {
    await new Promise((resolve, reject) => {
      passport.authenticate('jwt', { session: false }, async (err, user, info) => {

    
        if (err || info || !user) {
          return reject(new ApiError(status.UNAUTHORIZED, 'Please authenticate'));
        }

        req.user = user;

        // if (requiredRights.length) {
        //   const userRights = roleRights.get(user.role);
        //   const hasRequiredRights = requiredRights.every((requiredRight) => userRights.includes(requiredRight));

        //   if (!hasRequiredRights && req.params.userId !== user.id) {
        //     return reject(new ApiError(status.FORBIDDEN, 'Forbidden'));
        //   }
        // }

        resolve();
      })(req, res, next);
    });
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = auth;
