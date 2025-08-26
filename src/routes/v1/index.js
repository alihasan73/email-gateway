const express = require('express');
const authRoute = require('./auth.route');
const emailRoute = require('./email.route');

const router = express.Router();

const defaultRoutes = [
    {
        path: '/auth',
        route: authRoute
    },
    {
        path: '/email',
        route: emailRoute
    }
]

defaultRoutes.forEach((route) => {
    router.use(route.path, route.route);
});

module.exports = router;