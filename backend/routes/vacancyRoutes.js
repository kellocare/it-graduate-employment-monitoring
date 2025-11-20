const Router = require('express');
const router = new Router();
const vacancyController = require('../controllers/vacancyController');
const authMiddleware = require('../middleware/authMiddleware');

// Создать вакансию (пока разрешим всем авторизованным для теста, потом ограничим работодателями)
router.post('/', authMiddleware, vacancyController.createVacancy);

// Получить список
router.get('/', vacancyController.getAll);

router.get('/my', authMiddleware, vacancyController.getMyVacancies);
router.delete('/:id', authMiddleware, vacancyController.deleteVacancy);

module.exports = router;