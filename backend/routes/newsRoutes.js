const Router = require('express');
const router = new Router();
const newsController = require('../controllers/newsController');

// Публичный маршрут для получения всех новостей
router.get('/', newsController.getAll);

module.exports = router;