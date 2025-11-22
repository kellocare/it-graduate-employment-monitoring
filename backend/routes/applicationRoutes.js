const Router = require('express');
const router = new Router();
const applicationController = require('../controllers/applicationController');
const authMiddleware = require('../middleware/authMiddleware');
const checkRole = require('../middleware/checkRole');
const testController = require('../controllers/testController');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, 'solution-' + Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// Начать процесс отклика (POST /api/applications/start)
router.post('/start', authMiddleware, applicationController.startApplication);
router.post('/submit', authMiddleware, applicationController.submitTest);
router.get('/my', authMiddleware, applicationController.getMyApplications);
router.post('/cancel', authMiddleware, applicationController.cancelApplication);
router.get('/employer', authMiddleware, checkRole('employer'), applicationController.getEmployerApplications);
router.post('/reject', authMiddleware, checkRole('employer'), applicationController.rejectApplication);
router.post('/solution', authMiddleware, upload.single('solution'), testController.submitSolution);

module.exports = router;