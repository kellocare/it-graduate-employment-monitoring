const Router = require('express');
const router = new Router();
const employerController = require('../controllers/employerController');
const authMiddleware = require('../middleware/authMiddleware');
const checkRole = require('../middleware/checkRole');

// Только для работодателей (role='employer')
router.get('/company', authMiddleware, checkRole('employer'), employerController.getMyCompany);
router.post('/company', authMiddleware, checkRole('employer'), employerController.saveCompany);

module.exports = router;