const db = require('../db');

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
            // Добавили specialty_id в список полей
            const { first_name, last_name, middle_name, graduation_year, portfolio_link, specialty_id } = req.body;

            const updatedProfile = await db.query(
                `UPDATE graduates 
                 SET first_name = $1, 
                     last_name = $2, 
                     middle_name = $3, 
                     graduation_year = $4, 
                     portfolio_link = $5,
                     specialty_id = $6 
                 WHERE user_id = $7
                 RETURNING *`,
                [first_name, last_name, middle_name, graduation_year, portfolio_link, specialty_id, userId]
            );

            res.json(updatedProfile.rows[0]);
        } catch (e) {
            console.error(e);
            res.status(500).json({ message: 'Ошибка обновления профиля' });
        }
    }
}

module.exports = new GraduateController();