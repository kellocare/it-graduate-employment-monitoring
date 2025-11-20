const Router = require('express');
const router = new Router();
const employmentController = require('../controllers/employmentController');
const authMiddleware = require('../middleware/authMiddleware');

// Все действия только для авторизованных
router.post('/', authMiddleware, employmentController.addRecord);
router.get('/', authMiddleware, employmentController.getMyRecords);
router.delete('/:id', authMiddleware, employmentController.deleteRecord);

module.exports = router;