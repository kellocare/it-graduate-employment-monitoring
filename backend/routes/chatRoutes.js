const Router = require('express');
const router = new Router();
const chatController = require('../controllers/chatController');
const authMiddleware = require('../middleware/authMiddleware');
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.get('/history', authMiddleware, chatController.getHistory);
router.post('/send', authMiddleware, chatController.sendMessage);
router.delete('/clear', authMiddleware, chatController.clearHistory);
router.post('/upload-resume', authMiddleware, upload.single('file'), chatController.uploadResume);

module.exports = router;