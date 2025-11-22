const Router = require('express');
const router = new Router();
const vacancyController = require('../controllers/vacancyController');
const authMiddleware = require('../middleware/authMiddleware');


router.post('/', authMiddleware, vacancyController.createVacancy);
router.get('/', vacancyController.getAll);
router.get('/my', authMiddleware, vacancyController.getMyVacancies);
router.delete('/:id', authMiddleware, vacancyController.deleteVacancy);
router.put('/:id', authMiddleware, vacancyController.updateVacancy); // <--- Новый

// === РОУТЫ ДЛЯ АДМИНА ===
router.get('/admin/all', authMiddleware, vacancyController.getAdminVacancies); // Все для модерации
router.post('/admin/status', authMiddleware, vacancyController.updateStatus); // Смена статуса
module.exports = router;