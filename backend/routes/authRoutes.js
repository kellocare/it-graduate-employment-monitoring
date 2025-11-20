const Router = require('express');
const router = new Router();
const authController = require('../controllers/authController');

// POST /api/auth/registration
router.post('/registration', authController.register);

// POST /api/auth/login
router.post('/login', authController.login);

router.get('/activate/:link', authController.activate);

router.get('/google', (req, res) => {
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=http://localhost:4000/api/auth/google/callback&response_type=code&scope=email%20profile`;
    res.redirect(url);
});
router.get('/google/callback', authController.googleAuth);

router.get('/github', (req, res) => {
    const url = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&redirect_uri=http://localhost:4000/api/auth/github/callback&scope=user:email`;
    res.redirect(url);
});
router.get('/github/callback', authController.githubAuth);

module.exports = router;