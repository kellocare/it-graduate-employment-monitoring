module.exports = function(role) {
    return function(req, res, next) {
        if (req.method === "OPTIONS") next();

        try {
            // req.user уже заполнен в authMiddleware, который должен идти перед этим middleware
            if (req.user.role !== role && req.user.role !== 'admin') {
                return res.status(403).json({ message: "Нет доступа" });
            }
            next();
        } catch (e) {
            res.status(401).json({ message: "Не авторизован" });
        }
    };
};