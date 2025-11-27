const jwt = require('jsonwebtoken');

module.exports = function(roles) { // Принимаем массив разрешенных ролей
    return function(req, res, next) {
        if (req.method === "OPTIONS") {
            next();
        }
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader) {
                return res.status(401).json({message: "Не авторизован"});
            }

            const token = authHeader.split(' ')[1];
            if (!token) {
                return res.status(401).json({message: "Не авторизован"});
            }

            // Важно: используй тот же секретный ключ, что и при создании токена!
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key_123');

            // ГЛАВНАЯ ПРОВЕРКА: Есть ли роль пользователя в списке разрешенных?
            if (!roles.includes(decoded.role)) {
                return res.status(403).json({message: "Нет доступа"});
            }

            req.user = decoded;
            next();
        } catch (e) {
            res.status(401).json({message: "Не авторизован"});
        }
    };
};