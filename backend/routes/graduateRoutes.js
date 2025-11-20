const Router = require('express');
const router = new Router();
const graduateController = require('../controllers/graduateController');
const authMiddleware = require('../middleware/authMiddleware');

// --- Настройка Multer ---
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Куда сохранять
    },
    filename: (req, file, cb) => {
        // Генерируем уникальное имя: avatar-USERID-TIMESTAMP.ext
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });
// ------------------------

router.get('/me', authMiddleware, graduateController.getProfile);
router.put('/me', authMiddleware, graduateController.updateProfile);

// Новый роут для загрузки фото
// upload.single('avatar') означает, что мы ждем файл в поле с именем "avatar"
router.post('/avatar', authMiddleware, upload.single('avatar'), graduateController.uploadAvatar);

module.exports = router;