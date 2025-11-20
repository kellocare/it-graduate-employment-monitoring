const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class AuthController {
    // Регистрация нового пользователя
    async register(req, res) {
        try {
            const { email, password, role, first_name, last_name } = req.body;

            // 1. Проверяем, есть ли такой пользователь
            const userCheck = await db.query('SELECT * FROM users WHERE email = $1', [email]);
            if (userCheck.rows.length > 0) {
                return res.status(400).json({ message: 'Пользователь с таким email уже существует' });
            }

            // 2. Хешируем пароль
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(password, salt);

            // 3. Создаем пользователя в транзакции (чтобы записать и в users, и в graduates/companies)
            // Начнем простую вставку в users
            const newUser = await db.query(
                'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id, role, email',
                [email, passwordHash, role || 'graduate']
            );

            const userId = newUser.rows[0].id;

            // Если это выпускник, создаем запись в graduates
            if (role === 'graduate' || !role) {
                await db.query(
                    'INSERT INTO graduates (user_id, first_name, last_name) VALUES ($1, $2, $3)',
                    [userId, first_name, last_name]
                );
            }
            // Логику для компаний добавим позже

            res.json({ message: 'Пользователь успешно зарегистрирован', user: newUser.rows[0] });

        } catch (e) {
            console.error(e);
            res.status(500).json({ message: 'Ошибка регистрации' });
        }
    }

    // Вход в систему
    async login(req, res) {
        try {
            const { email, password } = req.body;

            // 1. Ищем пользователя
            const userResult = await db.query('SELECT * FROM users WHERE email = $1', [email]);
            if (userResult.rows.length === 0) {
                return res.status(400).json({ message: 'Пользователь не найден' });
            }
            const user = userResult.rows[0];

            // 2. Проверяем пароль
            const isValid = await bcrypt.compare(password, user.password_hash);
            if (!isValid) {
                return res.status(400).json({ message: 'Неверный пароль' });
            }

            // 3. Генерируем токен (Secret key пока возьмем простой, потом вынесем в .env)
            const token = jwt.sign(
                { id: user.id, role: user.role },
                process.env.JWT_SECRET || 'secret_key_123',
                { expiresIn: '24h' }
            );

            res.json({
                token,
                user: { id: user.id, email: user.email, role: user.role }
            });

        } catch (e) {
            console.error(e);
            res.status(500).json({ message: 'Ошибка входа' });
        }
    }
}

module.exports = new AuthController();