const Router = require('express');
const router = new Router();
const employmentController = require('../controllers/employmentController');
const authMiddleware = require('../middleware/authMiddleware');
const checkRole = require('../middleware/checkRole');
const employerController = require('../controllers/employerController');

router.post('/', authMiddleware, employmentController.addRecord);
router.get('/', authMiddleware, employmentController.getMyRecords);
router.delete('/:id', authMiddleware, employmentController.deleteRecord);
router.put('/:id', authMiddleware, employmentController.updateRecord); // <--- Новый
router.get('/company', authMiddleware, checkRole('employer'), employerController.getMyCompany);
router.post('/company', authMiddleware, checkRole('employer'), employerController.saveCompany);

module.exports = router;