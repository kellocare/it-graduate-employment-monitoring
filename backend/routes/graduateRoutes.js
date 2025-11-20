const Router = require('express');
const router = new Router();
const graduateController = require('../controllers/graduateController');
const authMiddleware = require('../middleware/authMiddleware');

// Чтобы выполнить эти запросы, нужно пройти проверку authMiddleware
router.get('/me', authMiddleware, graduateController.getProfile);
router.put('/me', authMiddleware, graduateController.updateProfile);

module.exports = router;