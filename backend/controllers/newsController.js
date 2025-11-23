const db = require('../db');

class NewsController {

    async create(req, res) {
        try {
            const { title, content, image_url } = req.body;

            // 1. Создаем новость
            const newNews = await db.query(
                `INSERT INTO news (title, content, image_url, created_at) VALUES ($1, $2, $3, NOW()) RETURNING *`,
                [title, content, image_url]
            );

            const newsId = newNews.rows[0].id; // Получаем ID новой новости

            // 2. Рассылаем уведомления с указанием target_id
            const notifTitle = `📢 Новая новость: ${title}`;
            const notifMsg = `Опубликована новая запись. Нажмите, чтобы прочитать подробнее.`;

            await db.query(`
                INSERT INTO notifications (user_id, title, message, type, target_id, is_read, created_at)
                SELECT id, $1, $2, 'news', $3, false, NOW()
                FROM users
            `, [notifTitle, notifMsg, newsId]); // Передаем newsId

            res.json(newNews.rows[0]);
        } catch (e) {
            console.error(e);
            res.status(500).json({ message: "Ошибка создания новости" });
        }
    }

    // ... остальные методы (getAll, delete) без изменений ...
    async getAll(req, res) { try { const r = await db.query('SELECT * FROM news ORDER BY created_at DESC'); res.json(r.rows); } catch (e) { res.status(500).json({message:'Error'}); } }
    async delete(req, res) { try { await db.query('DELETE FROM news WHERE id=$1', [req.params.id]); res.json({message:'Deleted'}); } catch (e) { res.status(500).json({message:'Error'}); } }
}

module.exports = new NewsController();