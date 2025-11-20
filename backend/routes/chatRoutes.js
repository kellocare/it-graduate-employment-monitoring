const Router = require('express');
const router = new Router();
const chatController = require('../controllers/chatController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/history', authMiddleware, chatController.getHistory);
router.post('/send', authMiddleware, chatController.sendMessage);
router.delete('/clear', authMiddleware, chatController.clearHistory);

module.exports = router;