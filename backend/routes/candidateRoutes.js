const Router = require('express');
const router = new Router();
const controller = require('../controllers/candidateController');
const authMiddleware = require('../middleware/authMiddleware');
const checkRole = require('../middleware/checkRole');

// Все действия доступны только работодателям
router.get('/', authMiddleware, checkRole('employer'), controller.getAllCandidates);
router.post('/analyze', authMiddleware, checkRole('employer'), controller.analyzeCandidate);
router.post('/invite', authMiddleware, checkRole('employer'), controller.inviteCandidate);

module.exports = router;