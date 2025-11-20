const Router = require('express');
const router = new Router();
const aiService = require('../services/aiService');
const authMiddleware = require('../middleware/authMiddleware');

// Простой тест: вопрос-ответ
router.post('/ask', authMiddleware, async (req, res) => {
    try {
        const { question } = req.body;
        const answer = await aiService.getCompletion([
            { role: "user", content: question }
        ]);
        res.json({ answer });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

module.exports = router;