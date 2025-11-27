const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mailService = require('../services/mailService');
const axios = require('axios');
const { validatePassword, validateEmailDNS, verifyCaptcha } = require('../utils/security');

class AuthController {
    constructor() {
        this.googleAuth = this.googleAuth.bind(this);
        this.githubAuth = this.githubAuth.bind(this);
        this._socialLogin = this._socialLogin.bind(this);
    }

    // Регистрация
    async register(req, res) {
        try {

            const { email, password, role, first_name, last_name, university_name, captchaToken } = req.body;

            // 2. Проверка Пароля
            const passError = validatePassword(password);
            if (passError) return res.status(400).json({ message: passError });

            // 3. Проверка Домена Почты
            const isEmailValid = await validateEmailDNS(email);
            if (!isEmailValid) return res.status(400).json({ message: 'Несуществующий домен почты' });

            const userCheck = await db.query('SELECT * FROM users WHERE email = $1', [email]);
            if (userCheck.rows.length > 0) {
                return res.status(400).json({ message: 'Пользователь с таким email уже существует' });
            }

            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(password, salt);
            const activationToken = Math.random().toString(36).substring(2) + Date.now().toString(36);

            const newUser = await db.query(
               'INSERT INTO users (email, password_hash, role, verification_token, is_verified) VALUES ($1, $2, $3, $4, $5) RETURNING id',
               [email, passwordHash, role || 'graduate', activationToken, false]
            );

            const userId = newUser.rows[0].id;

            // !!! ОБНОВЛЕННАЯ ЛОГИКА СОХРАНЕНИЯ ПРОФИЛЕЙ !!!
            if (role === 'employer') {
                await db.query(
                    'INSERT INTO recruiters (user_id, first_name, last_name) VALUES ($1, $2, $3)',
                    [userId, first_name, last_name]
                );
            } else if (role === 'university_staff') {
                // СОХРАНЯЕМ ВУЗ И ИМЯ
                await db.query(
                    'INSERT INTO university_staff (user_id, full_name, university_name) VALUES ($1, $2, $3)',
                    [userId, `${first_name} ${last_name}`, university_name]
                );
            } else {
                // По умолчанию graduate
                await db.query(
                    'INSERT INTO graduates (user_id, first_name, last_name) VALUES ($1, $2, $3)',
                    [userId, first_name, last_name]
                );
            }

            const link = `${process.env.API_URL || 'http://localhost:4000'}/api/auth/activate/${activationToken}`;
            await mailService.sendActivationMail(email, link);

            res.json({ message: 'На вашу почту отправлено письмо для подтверждения аккаунта.' });

        } catch (e) {
            console.error(e);
            res.status(500).json({ message: 'Ошибка регистрации' });
        }
    }

    // Активация (без изменений)
    async activate(req, res) {
        try {
            const token = req.params.link;
            const user = await db.query('SELECT * FROM users WHERE verification_token = $1', [token]);
            if (user.rows.length === 0) return res.status(400).send('<h1>Ошибка ссылки</h1>');
            await db.query('UPDATE users SET is_verified = true, verification_token = null WHERE id = $1', [user.rows[0].id]);
            return res.redirect('http://localhost:3000/login?activated=true');
        } catch (e) { res.status(500).json({ message: 'Ошибка' }); }
    }

    // Вход
    async login(req, res) {
        try {
            const { email, password } = req.body;
            const userResult = await db.query('SELECT * FROM users WHERE email = $1', [email]);
            if (userResult.rows.length === 0) return res.status(400).json({ message: 'Пользователь не найден' });
            const user = userResult.rows[0];

            if (user.password_hash) {
                const isValid = await bcrypt.compare(password, user.password_hash);
                if (!isValid) return res.status(400).json({ message: 'Неверный пароль' });
                if (!user.is_verified) return res.status(403).json({ message: 'Email не подтвержден.' });
            } else {
                return res.status(400).json({ message: 'Используйте вход через соцсети' });
            }

            const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'secret', { expiresIn: '24h' });

            // !!! ИЗМЕНЕНИЕ: Добавляем блок для university_staff !!!
            let firstName = null, lastName = null;

            if (user.role === 'graduate') {
                const pRes = await db.query('SELECT first_name, last_name FROM graduates WHERE user_id = $1', [user.id]);
                if (pRes.rows.length > 0) { firstName = pRes.rows[0].first_name; lastName = pRes.rows[0].last_name; }
            } else if (user.role === 'employer') {
                const pRes = await db.query('SELECT first_name, last_name FROM recruiters WHERE user_id = $1', [user.id]);
                if (pRes.rows.length > 0) { firstName = pRes.rows[0].first_name; lastName = pRes.rows[0].last_name; }
            } else if (user.role === 'university_staff') {
                const pRes = await db.query('SELECT full_name FROM university_staff WHERE user_id = $1', [user.id]);
                if (pRes.rows.length > 0) {
                    // Так как там поле full_name, разобьем его (или вернем как есть)
                    const names = pRes.rows[0].full_name.split(' ');
                    firstName = names[0];
                    lastName = names[1] || '';
                }
            }

            res.json({ token, user: { id: user.id, email: user.email, role: user.role, first_name: firstName, last_name: lastName } });

        } catch (e) {
            console.error(e);
            res.status(500).json({ message: 'Ошибка входа' });
        }
    }

    // Соцсети (Можно оставить без изменений, но для полноты картины лучше добавить логику для employer там тоже, если планируется регистрация работодателей через гугл)
    // ... (код соцсетей оставляем как был в твоем файле, только добавь логику insert в recruiters по аналогии с register, если нужно)
    async googleAuth(req, res) { /* ... код ... */ }
    async githubAuth(req, res) { /* ... код ... */ }
    async _socialLogin(res, email, socialId, provider, firstName, lastName) { /* ... код ... */ }
}

module.exports = new AuthController();