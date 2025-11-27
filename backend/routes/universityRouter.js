const Router = require('express');
const router = new Router();
const universityController = require('../controllers/universityController');
const checkRole = require('../middleware/checkRoleMiddleware');
const chatController = require('../controllers/chatController');

// Разрешаем доступ и админу, и сотруднику вуза
const access = ['university_staff', 'admin'];
const multer = require('multer');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Убедись, что папка 'uploads/' существует в корне проекта
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        // Генерируем уникальное имя: timestamp + random + расширение
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        // Получаем расширение файла (например, .png)
        const ext = file.originalname.split('.').pop();
        cb(null, file.fieldname + '-' + uniqueSuffix + '.' + ext);
    }
});

const upload = multer({storage: storage});

// === GET ЗАПРОСЫ ===
router.get('/stats', checkRole(access), universityController.getStats);
router.get('/students', checkRole(access), universityController.getStudents);
router.get('/ai-report', checkRole(access), chatController.generateUniversityReport);
router.get('/me', checkRole(access), universityController.getProfile);
router.get('/reports', checkRole(access), universityController.getMyReports);

// === PUT ЗАПРОСЫ ===
router.put('/me', checkRole(access), universityController.updateProfile);

// === POST ЗАПРОСЫ (ЗАГРУЗКА ФАЙЛОВ) ===

// 1. Аватарка (Фронтенд шлет поле 'avatar')
router.post('/avatar', checkRole(access), upload.single('avatar'), universityController.uploadAvatar);

// 2. Логотип (Фронтенд шлет поле 'file') -- ЭТОГО НЕ ХВАТАЛО
router.post('/logo', checkRole(access), upload.single('file'), universityController.uploadLogo);

// 3. Печать (Фронтенд шлет поле 'file') -- ЭТОГО НЕ ХВАТАЛО
router.post('/stamp', checkRole(access), upload.single('file'), universityController.uploadStamp);

// Сохранение записи об отчете
router.post('/reports', checkRole(access), universityController.createReportRecord);

module.exports = router;