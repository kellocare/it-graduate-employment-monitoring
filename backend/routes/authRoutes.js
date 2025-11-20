const Router = require('express');
const router = new Router();
const authController = require('../controllers/authController');

// POST /api/auth/registration
router.post('/registration', authController.register);

// POST /api/auth/login
router.post('/login', authController.login);

module.exports = router;