const db = require('../db');
const fs = require('fs');

class GraduateController {
    // Получить мой профиль
    async getProfile(req, res) {
        try {
            // req.user.id мы получили из middleware
            const userId = req.user.id;

            const profile = await db.query(
                `SELECT 
                    g.*, 
                    u.email, 
                    s.code as specialty_code, 
                    s.name as specialty_name 
                 FROM graduates g
                 JOIN users u ON g.user_id = u.id
                 LEFT JOIN specialties s ON g.specialty_id = s.id
                 WHERE g.user_id = $1`,
                [userId]
            );

            res.json(profile.rows[0]);
        } catch (e) {
            console.error(e);
            res.status(500).json({ message: 'Ошибка получения профиля' });
        }
    }

    // Обновить мой профиль
    async updateProfile(req, res) {
        try {
            const userId = req.user.id;
            const {
                first_name, last_name, middle_name, graduation_year,
                portfolio_links, // <--- ИЗМЕНЕНО
                specialty_id, about_me, phone, city, telegram, birth_date
            } = req.body;

            // Убедимся, что portfolio_links это JSON (если придет строка)
            const linksJson = typeof portfolio_links === 'string'
                ? portfolio_links
                : JSON.stringify(portfolio_links || []);

            const updatedProfile = await db.query(
                `UPDATE graduates 
                 SET first_name = $1, last_name = $2, middle_name = $3, 
                     graduation_year = $4, 
                     portfolio_links = $5, -- <--- ИЗМЕНЕНО
                     specialty_id = $6,
                     about_me = $7, phone = $8, city = $9, telegram = $10, birth_date = $11
                 WHERE user_id = $12
                 RETURNING *`,
                [first_name, last_name, middle_name, graduation_year,
                 linksJson,
                 specialty_id, about_me, phone, city, telegram, birth_date, userId]
            );

            res.json(updatedProfile.rows[0]);
        } catch (e) {
            console.error(e);
            res.status(500).json({ message: 'Ошибка обновления профиля' });
        }
    }

    async uploadAvatar(req, res) {
    try {
        const userId = req.user.id;

        // req.file - это файл, который загрузил multer
        if (!req.file) {
            return res.status(400).json({ message: 'Файл не загружен' });
        }

        // Формируем ссылку (обратите внимание: на Windows слэши могут быть обратными, исправляем)
        const avatarUrl = '/uploads/' + req.file.filename;

        await db.query(
            'UPDATE graduates SET avatar_url = $1 WHERE user_id = $2',
            [avatarUrl, userId]
        );

        res.json({ avatar_url: avatarUrl });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Ошибка загрузки фото' });
        }
    }
}

module.exports = new GraduateController();