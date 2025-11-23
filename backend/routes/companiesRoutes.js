const Router = require('express');
const router = new Router();
const controller = require('../controllers/companiesController');
const authMiddleware = require('../middleware/authMiddleware');

// Публичные (или для авторизованных)
router.get('/', authMiddleware, controller.getTop);
router.get('/:id', authMiddleware, controller.getOne);
router.post('/review', authMiddleware, controller.addReview);

// Админские
router.get('/admin/reviews', authMiddleware, controller.getPendingReviews);
router.post('/admin/moderate', authMiddleware, controller.moderateReview);

module.exports = router;