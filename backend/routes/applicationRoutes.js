const Router = require('express');
const router = new Router();
const applicationController = require('../controllers/applicationController');
const authMiddleware = require('../middleware/authMiddleware');

// Начать процесс отклика (POST /api/applications/start)
router.post('/start', authMiddleware, applicationController.startApplication);
router.post('/submit', authMiddleware, applicationController.submitTest);
router.get('/my', authMiddleware, applicationController.getMyApplications);
router.post('/cancel', authMiddleware, applicationController.cancelApplication);

module.exports = router;