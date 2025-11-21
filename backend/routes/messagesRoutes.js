const Router = require('express');
const router = new Router();
const controller = require('../controllers/messagesController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/conversations', authMiddleware, controller.getConversations);
router.get('/:partner_id', authMiddleware, controller.getMessages);
router.post('/send', authMiddleware, controller.sendMessage);
router.get('/unread', authMiddleware, controller.getUnreadCount);
module.exports = router;