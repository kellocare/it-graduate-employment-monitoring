const Router = require('express');
const router = new Router();
const controller = require('../controllers/resumeController');
const authMiddleware = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');

// Настройка Multer (сохранение на диск)
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

router.get('/', authMiddleware, controller.getMyResumes);
router.post('/', authMiddleware, upload.single('file'), controller.uploadResume);
router.delete('/:id', authMiddleware, controller.deleteResume);

module.exports = router;