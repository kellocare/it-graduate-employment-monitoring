const Router = require('express');
const router = new Router();
const controller = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');
const checkRole = require('../middleware/checkRole');
const multer = require('multer');
const newsController = require('../controllers/newsController');

// Middleware: пускаем только админов
// Сначала проверяем токен (authMiddleware), потом роль (checkRole)
const adminAuth = [authMiddleware, checkRole('admin')];
const upload = multer({ storage: multer.memoryStorage() });

// 1. Дашборд
router.get('/stats', adminAuth, controller.getStats);

// 2. Отчеты (AI)
router.post('/report', adminAuth, controller.generateAiReport);

// 3. Пользователи
// ВАЖНО: Экспорт должен быть ДО /:id
router.get('/users/export', adminAuth, controller.exportUsersExcel);
router.get('/users', adminAuth, controller.getAllUsers);
router.delete('/users/:id', adminAuth, controller.deleteUser);
router.post('/users/import', adminAuth, upload.single('file'), controller.importUsersExcel);

// 4. Сообщения (если используется здесь)
router.post('/message', adminAuth, async (req, res) => {
    try {
        const { recipient_id, content } = req.body;
        const db = require('../db');
        await db.query(
            `INSERT INTO direct_messages (sender_id, receiver_id, content, created_at) VALUES ($1, $2, $3, NOW())`,
            [req.user.id, recipient_id, content]
        );
        res.json({ message: "Отправлено" });
    } catch (e) {
        res.status(500).json({ message: "Ошибка отправки" });
    }
});

// ЛОГИ
router.get('/logs', adminAuth, controller.getAuditLogs);

// НОВОСТИ (Админская часть)
router.post('/news', adminAuth, newsController.create);
router.delete('/news/:id', adminAuth, newsController.delete);


module.exports = router;