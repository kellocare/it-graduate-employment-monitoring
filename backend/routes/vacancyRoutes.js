const Router = require('express');
const router = new Router();
const vacancyController = require('../controllers/vacancyController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/', authMiddleware, vacancyController.createVacancy);
router.get('/', vacancyController.getAll);
router.get('/my', authMiddleware, vacancyController.getMyVacancies);
router.delete('/:id', authMiddleware, vacancyController.deleteVacancy);
router.put('/:id', authMiddleware, vacancyController.updateVacancy); // <--- Новый

module.exports = router;