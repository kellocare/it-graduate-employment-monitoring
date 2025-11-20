const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mailService = require('../services/mailService');
const { v4: uuidv4 } = require('uuid'); // Если нет uuid, используем Math.random
const axios = require('axios');

class AuthController {
    constructor() {
        // Привязываем контекст (bind), чтобы this._socialLogin работал корректно
        this.googleAuth = this.googleAuth.bind(this);
        this.githubAuth = this.githubAuth.bind(this);
        this._socialLogin = this._socialLogin.bind(this);
    }
    // Регистрация
    async register(req, res) {
        try {
            const { email, password, role, first_name, last_name } = req.body;

            const userCheck = await db.query('SELECT * FROM users WHERE email = $1', [email]);
            if (userCheck.rows.length > 0) {
                return res.status(400).json({ message: 'Пользователь с таким email уже существует' });
            }

            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(password, salt);

            // Генерируем код активации
            const activationToken = Math.random().toString(36).substring(2) + Date.now().toString(36);

            const newUser = await db.query(
                'INSERT INTO users (email, password_hash, role, verification_token, is_verified) VALUES ($1, $2, $3, $4, $5) RETURNING id',
                [email, passwordHash, role || 'graduate', activationToken, false]
            );

            const userId = newUser.rows[0].id;

            if (role === 'graduate' || !role) {
                await db.query(
                    'INSERT INTO graduates (user_id, first_name, last_name) VALUES ($1, $2, $3)',
                    [userId, first_name, last_name]
                );
            }

            // Отправляем письмо
            const link = `${process.env.API_URL || 'http://localhost:4000'}/api/auth/activate/${activationToken}`;
            await mailService.sendActivationMail(email, link);

            res.json({ message: 'На вашу почту отправлено письмо для подтверждения аккаунта.' });

        } catch (e) {
            console.error(e);
            res.status(500).json({ message: 'Ошибка регистрации' });
        }
    }

    // Активация по ссылке
    async activate(req, res) {
        try {
            const token = req.params.link;
            const user = await db.query('SELECT * FROM users WHERE verification_token = $1', [token]);

            if (user.rows.length === 0) {
                return res.status(400).send('<h1>Ошибка: Неверная ссылка активации</h1>');
            }

            await db.query('UPDATE users SET is_verified = true, verification_token = null WHERE id = $1', [user.rows[0].id]);

            // Редирект на фронтенд (страницу логина)
            return res.redirect('http://localhost:3000/login?activated=true');
        } catch (e) {
            console.error(e);
            res.status(500).json({ message: 'Ошибка активации' });
        }
    }

    // Вход (с проверкой подтверждения)
    async login(req, res) {
        try {
            const { email, password } = req.body;

            const userResult = await db.query('SELECT * FROM users WHERE email = $1', [email]);
            if (userResult.rows.length === 0) return res.status(400).json({ message: 'Пользователь не найден' });
            const user = userResult.rows[0];

            // ПРОВЕРКА: Если есть пароль (значит регистрация через email), проверяем его
            if (user.password_hash) {
                const isValid = await bcrypt.compare(password, user.password_hash);
                if (!isValid) return res.status(400).json({ message: 'Неверный пароль' });

                // НОВАЯ ПРОВЕРКА: Подтверждена ли почта?
                if (!user.is_verified) {
                    return res.status(403).json({ message: 'Email не подтвержден. Проверьте почту.' });
                }
            } else {
                // Если пароля нет, значит это юзер Google, он должен входить через кнопку Google
                return res.status(400).json({ message: 'Используйте вход через соцсети' });
            }

            const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'secret', { expiresIn: '24h' });

            // Получаем имя
            let firstName = null, lastName = null;
            if (user.role === 'graduate') {
                const gradRes = await db.query('SELECT first_name, last_name FROM graduates WHERE user_id = $1', [user.id]);
                if (gradRes.rows.length > 0) {
                    firstName = gradRes.rows[0].first_name;
                    lastName = gradRes.rows[0].last_name;
                }
            }

            res.json({ token, user: { id: user.id, email: user.email, role: user.role, first_name: firstName, last_name: lastName } });

        } catch (e) {
            console.error(e);
            res.status(500).json({ message: 'Ошибка входа' });
        }
    }
    async googleAuth(req, res) {
        const { code } = req.query;
        try {
            // 1. Обмен кода на токен
            const tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
                client_id: process.env.GOOGLE_CLIENT_ID,
                client_secret: process.env.GOOGLE_CLIENT_SECRET,
                code,
                grant_type: 'authorization_code',
                redirect_uri: 'http://localhost:4000/api/auth/google/callback'
            });

            const { access_token } = tokenRes.data;

            // 2. Получение данных пользователя
            const userRes = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: { Authorization: `Bearer ${access_token}` }
            });

            const { email, id: googleId, given_name, family_name } = userRes.data;

            await this._socialLogin(res, email, googleId, 'google', given_name, family_name);

        } catch (e) {
            console.error('Google Auth Error:', e.response?.data || e.message);
            res.redirect('http://localhost:3000/login?error=google_failed');
        }
    }

    // GITHUB LOGIN
    async githubAuth(req, res) {
        const { code } = req.query;
        try {
            // 1. Обмен кода на токен
            const tokenRes = await axios.post('https://github.com/login/oauth/access_token', {
                client_id: process.env.GITHUB_CLIENT_ID,
                client_secret: process.env.GITHUB_CLIENT_SECRET,
                code
            }, { headers: { Accept: 'application/json' } });

            const { access_token } = tokenRes.data;

            // 2. Получение данных (Email может быть скрыт, нужен отдельный запрос)
            const userRes = await axios.get('https://api.github.com/user', {
                headers: { Authorization: `Bearer ${access_token}` }
            });

            let email = userRes.data.email;

            // Если email приватный, запрашиваем список email-ов
            if (!email) {
                const emailsRes = await axios.get('https://api.github.com/user/emails', {
                    headers: { Authorization: `Bearer ${access_token}` }
                });
                email = emailsRes.data.find(e => e.primary).email;
            }

            const [firstName, lastName] = (userRes.data.name || userRes.data.login).split(' ');

            await this._socialLogin(res, email, userRes.data.id.toString(), 'github', firstName, lastName || '');

        } catch (e) {
            console.error('GitHub Auth Error:', e.message);
            res.redirect('http://localhost:3000/login?error=github_failed');
        }
    }

    async _socialLogin(res, email, socialId, provider, firstName, lastName) {
        // 1. Ищем пользователя
        let userRes = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        let user = userRes.rows[0];
        let isNew = false; // <--- Флаг нового пользователя

        if (!user) {
            isNew = true; // <--- Ставим флаг
            // 2. Создаем
            const newUser = await db.query(
                `INSERT INTO users (email, role, is_verified, ${provider}_id) VALUES ($1, 'graduate', true, $2) RETURNING id, role`,
                [email, socialId]
            );
            user = newUser.rows[0];
            user.id = newUser.rows[0].id;

            // Создаем профиль
            await db.query(
                'INSERT INTO graduates (user_id, first_name, last_name) VALUES ($1, $2, $3)',
                [user.id, firstName, lastName || '']
            );
        } else {
            // 3. Обновляем ID соцсети
            if (!user[`${provider}_id`]) {
                await db.query(`UPDATE users SET ${provider}_id = $1 WHERE id = $2`, [socialId, user.id]);
            }
        }

        // 4. Токен
        const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '24h' });

        // Имя для UI
        const gradRes = await db.query('SELECT first_name, last_name FROM graduates WHERE user_id = $1', [user.id]);
        const uData = {
            id: user.id,
            email,
            role: user.role,
            first_name: gradRes.rows[0]?.first_name || firstName,
            last_name: gradRes.rows[0]?.last_name || ''
        };

        const userDataStr = encodeURIComponent(JSON.stringify(uData));

        // 5. РЕДИРЕКТ С ФЛАГОМ isNew
        res.redirect(`http://localhost:3000/login?token=${token}&user=${userDataStr}&isNew=${isNew}`);
    }
}

module.exports = new AuthController();