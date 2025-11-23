const db = require('../db');
const aiService = require('../services/aiService');

class CompaniesController {

    // Получить топ компаний (с AI рейтингом)
    async getTop(req, res) {
        try {
            // Выбираем компании и считаем кол-во отзывов
            const result = await db.query(`
                SELECT c.*, COUNT(r.id) as review_count
                FROM companies c
                LEFT JOIN reviews r ON c.id = r.company_id AND r.status = 'approved'
                GROUP BY c.id
                ORDER BY c.ai_score DESC
            `);
            res.json(result.rows);
        } catch (e) {
            res.status(500).json({ message: "Ошибка загрузки компаний" });
        }
    }

    // Получить детали компании + Отзывы
    async getOne(req, res) {
        try {
            const id = req.params.id;
            const company = await db.query('SELECT * FROM companies WHERE id = $1', [id]);

            const reviews = await db.query(`
                SELECT r.*, g.first_name, g.last_name 
                FROM reviews r
                JOIN users u ON r.student_id = u.id
                JOIN graduates g ON u.id = g.user_id
                WHERE r.company_id = $1 AND r.status = 'approved'
                ORDER BY r.created_at DESC
            `, [id]);

            if (company.rows.length === 0) return res.status(404).json({ message: "Не найдено" });

            // === ТУТ ЗАПУСКАЕМ AI АНАЛИЗ "НА ЛЕТУ" (Или берем из кеша) ===
            // Для оптимизации лучше делать это при добавлении отзыва, но сделаем как ты просил (при открытии)
            // Если отзывов много, пересчитываем AI Score
            if (reviews.rows.length > 0) {
                // Фиктивная функция AI (Замени на реальный вызов aiService)
                // const aiAnalysis = await aiService.analyzeCompanyReviews(reviews.rows);
                // Пока сделаем простую математику для примера:
                const avg = reviews.rows.reduce((a, b) => a + b.rating, 0) / reviews.rows.length;
                const score = Math.round(avg * 20); // 5 звезд = 100 баллов

                // Обновляем в базе
                await db.query('UPDATE companies SET ai_score = $1 WHERE id = $2', [score, id]);
                company.rows[0].ai_score = score;
            }

            res.json({ company: company.rows[0], reviews: reviews.rows });
        } catch (e) {
            res.status(500).json({ message: "Ошибка" });
        }
    }

    // Добавить отзыв
    async addReview(req, res) {
        try {
            const { company_id, rating, comment } = req.body;
            const student_id = req.user.id;

            // Проверка: студент уже оставлял отзыв?
            const check = await db.query('SELECT * FROM reviews WHERE company_id = $1 AND student_id = $2', [company_id, student_id]);
            if (check.rows.length > 0) return res.status(400).json({ message: "Вы уже оставили отзыв" });

            await db.query(
                `INSERT INTO reviews (company_id, student_id, rating, comment, status) VALUES ($1, $2, $3, $4, 'pending')`,
                [company_id, student_id, rating, comment]
            );

            res.json({ message: "Отзыв отправлен на модерацию" });
        } catch (e) {
            res.status(500).json({ message: "Ошибка добавления отзыва" });
        }
    }

    // Админ: Получить отзывы на модерацию
    async getPendingReviews(req, res) {
        try {
            if (req.user.role !== 'admin') return res.status(403).json({ message: "Нет доступа" });
            const result = await db.query(`
                SELECT r.*, c.name as company_name, g.first_name, g.last_name
                FROM reviews r
                JOIN companies c ON r.company_id = c.id
                JOIN users u ON r.student_id = u.id
                JOIN graduates g ON u.id = g.user_id
                WHERE r.status = 'pending'
                ORDER BY r.created_at ASC
            `);
            res.json(result.rows);
        } catch (e) { res.status(500).json({ message: "Ошибка" }); }
    }

    // Админ: Одобрить/Отклонить
    async moderateReview(req, res) {
        try {
            if (req.user.role !== 'admin') return res.status(403).json({ message: "Нет доступа" });
            const { id, status } = req.body; // 'approved' or 'rejected'
            await db.query('UPDATE reviews SET status = $1 WHERE id = $2', [status, id]);
            res.json({ message: "Статус обновлен" });
        } catch (e) { res.status(500).json({ message: "Ошибка" }); }
    }
}

module.exports = new CompaniesController();