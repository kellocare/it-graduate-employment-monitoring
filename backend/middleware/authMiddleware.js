const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
    if (req.method === "OPTIONS") {
        next();
    }

    try {
        // 1. Проверяем наличие заголовка
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            console.log("AuthMiddleware: Нет заголовка Authorization");
            return res.status(401).json({ message: "Не авторизован (нет заголовка)" });
        }

        // 2. Проверяем формат "Bearer TOKEN"
        const token = authHeader.split(' ')[1];
        if (!token) {
            console.log("AuthMiddleware: Токен пустой или неверный формат");
            return res.status(401).json({ message: "Не авторизован (нет токена)" });
        }

        // 3. Расшифровываем
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key_123');

        // 4. Успех
        req.user = decoded;
        next();

    } catch (e) {
        console.error("AuthMiddleware Error:", e.message);
        // Важно: возвращаем 401, чтобы фронтенд понял, что надо разлогинить
        res.status(401).json({ message: "Не авторизован (токен невалиден)" });
    }
};