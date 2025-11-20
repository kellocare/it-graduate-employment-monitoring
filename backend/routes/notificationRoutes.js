const Router = require('express');
const router = new Router();
const controller = require('../controllers/notificationController');
const authMiddleware = require('../middleware/authMiddleware');

// Доступно всем авторизованным
router.get('/', authMiddleware, controller.getMyNotifications);
router.post('/read', authMiddleware, controller.markRead);

module.exports = router;