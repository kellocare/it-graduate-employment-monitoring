const Router = require('express');
const router = new Router();
const applicationController = require('../controllers/applicationController');
const authMiddleware = require('../middleware/authMiddleware');
const checkRole = require('../middleware/checkRole');

// Начать процесс отклика (POST /api/applications/start)
router.post('/start', authMiddleware, applicationController.startApplication);
router.post('/submit', authMiddleware, applicationController.submitTest);
router.get('/my', authMiddleware, applicationController.getMyApplications);
router.post('/cancel', authMiddleware, applicationController.cancelApplication);
router.get('/employer', authMiddleware, checkRole('employer'), applicationController.getEmployerApplications);

module.exports = router;