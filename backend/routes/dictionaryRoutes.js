const Router = require('express');
const router = new Router();
const dictionaryController = require('../controllers/dictionaryController');

router.get('/specialties', dictionaryController.getSpecialties);
router.get('/companies', dictionaryController.getCompanies);

module.exports = router;