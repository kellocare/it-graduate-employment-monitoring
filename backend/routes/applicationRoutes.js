const Router = require('express');
const router = new Router();
const applicationController = require('../controllers/applicationController');
const testController = require('../controllers/testController'); // ИМПОРТИРУЕМ ОБРАТНО
const authMiddleware = require('../middleware/authMiddleware');
const checkRole = require('../middleware/checkRole');
const multer = require('multer');
const path = require('path');
const db = require('../db');

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// Блиц-тест
router.post('/start', authMiddleware, applicationController.startApplication);
router.post('/submit', authMiddleware, applicationController.submitTest);

// ТЗ (Используем testController)
router.post('/solution', authMiddleware, upload.single('solution'), testController.submitSolution);

// Вспомогательные
router.get('/my', authMiddleware, applicationController.getMyApplications);
router.post('/cancel', authMiddleware, applicationController.cancelApplication);
router.get('/employer', authMiddleware, checkRole('employer'), applicationController.getEmployerApplications);
router.post('/reject', authMiddleware, checkRole('employer'), applicationController.rejectApplication);

router.put('/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // new, review, interview, offer, rejected

    try {
        // Обновляем статус в БД
        await db.query('UPDATE applications SET status = $1 WHERE id = $2', [status, id]);
        res.json({ message: 'Status updated' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;