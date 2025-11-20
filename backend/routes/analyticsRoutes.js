const Router = require('express');
const router = new Router();
const analyticsController = require('../controllers/analyticsController');
const authMiddleware = require('../middleware/authMiddleware');

// Доступ к статистике дадим всем зарегистрированным пользователям
router.get('/', authMiddleware, analyticsController.getStats);

module.exports = router;