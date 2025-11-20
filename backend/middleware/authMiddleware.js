const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
    if (req.method === "OPTIONS") {
        next();
    }

    try {
        // Токен обычно передают в заголовке: "Authorization: Bearer eyJhbGci..."
        const token = req.headers.authorization.split(' ')[1];

        if (!token) {
            return res.status(401).json({ message: "Не авторизован" });
        }

        // Расшифровываем токен
        // ВАЖНО: Используй тот же секретный ключ, что и при создании токена в authController
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key_123');

        // Добавляем данные пользователя (id, role) прямо в запрос
        req.user = decoded;

        next(); // Пропускаем запрос дальше к контроллеру
    } catch (e) {
        res.status(401).json({ message: "Не авторизован (Неверный токен)" });
    }
};