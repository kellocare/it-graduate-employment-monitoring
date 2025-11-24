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
router.post('/improve', authMiddleware, chatController.improveResumeText);
router.post('/roadmap', authMiddleware, chatController.generateRoadmap);
// --- РОУТЫ ДЛЯ ROADMAP ---
router.post('/roadmap', authMiddleware, chatController.generateRoadmap);       // Генерация новой
router.post('/roadmap/save', authMiddleware, chatController.saveRoadmap);      // Сохранение
router.get('/roadmap', authMiddleware, chatController.getRoadmap);             // Получение сохраненной
router.post('/roadmap/archive', authMiddleware, chatController.archiveRoadmap); // Перенести в архив
router.get('/roadmap/history', authMiddleware, chatController.getRoadmapHistory); // Получить список архива
router.post('/roadmap/quiz', authMiddleware, chatController.generateNodeQuiz); // Получить задачу
router.post('/roadmap/check', authMiddleware, chatController.checkNodeQuiz);   // Проверить ответ


module.exports = router;