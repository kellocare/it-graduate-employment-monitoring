const Router = require('express');
const router = new Router();
const controller = require('../controllers/inviteController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/send', authMiddleware, controller.sendInvite);
router.post('/respond', authMiddleware, controller.respondToInvite);
module.exports = router;