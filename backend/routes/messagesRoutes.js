const Router = require('express');
const router = new Router();
const controller = require('../controllers/messagesController');
const authMiddleware = require('../middleware/authMiddleware');

// 1. Сначала конкретные маршруты
router.get('/conversations', authMiddleware, controller.getConversations);
router.get('/unread', authMiddleware, controller.getUnreadCount); // <--- ТЕПЕРЬ ОН ВЫШЕ

// 2. Потом динамические (с параметрами)
// Express теперь поймет: если пришло "unread" - это маршрут выше.
// Если пришло число "5" - это partner_id.
router.get('/:partner_id', authMiddleware, controller.getMessages);

router.post('/send', authMiddleware, controller.sendMessage);

module.exports = router;