const Router = require('express');
const router = new Router();
const controller = require('../controllers/recruiterController');
const authMiddleware = require('../middleware/authMiddleware');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, uuidv4() + path.extname(file.originalname))
});
const upload = multer({ storage });

router.get('/me', authMiddleware, controller.getMe);
router.put('/me', authMiddleware, controller.updateMe);
router.post('/avatar', authMiddleware, upload.single('avatar'), controller.uploadAvatar);

module.exports = router;