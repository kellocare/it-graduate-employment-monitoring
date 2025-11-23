const Router = require('express');
const router = new Router();
const vacancyController = require('../controllers/vacancyController');
const authMiddleware = require('../middleware/authMiddleware');
// Подключаем твой middleware для проверки роли
const checkRole = require('../middleware/checkRole');

// === ОБЩИЕ / РАБОТОДАТЕЛЬ ===
router.post('/', authMiddleware, checkRole('employer'), vacancyController.createVacancy); // Обычно вакансии создают работодатели
router.get('/', vacancyController.getAll);
router.get('/my', authMiddleware, vacancyController.getMyVacancies);
router.delete('/:id', authMiddleware, vacancyController.deleteVacancy);
router.put('/:id', authMiddleware, vacancyController.updateVacancy);

router.get('/:id', authMiddleware, vacancyController.getById);

// === АДМИН ПАНЕЛЬ ===
// Важно: Сначала authMiddleware (проверяет токен), потом checkRole (проверяет поле role)

// 1. Получить список (всех или на проверке)
router.get('/admin/all', authMiddleware, checkRole('admin'), vacancyController.getAdminVacancies);

// 2. Сменить статус (Одобрить/Отклонить)
router.post('/admin/status', authMiddleware, checkRole('admin'), vacancyController.updateStatus);

// 3. AI Анализ (Киллер-фича)
router.post('/admin/analyze', authMiddleware, checkRole('admin'), vacancyController.analyzeVacancyAi);

module.exports = router;