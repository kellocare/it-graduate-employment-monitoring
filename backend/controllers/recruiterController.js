const db = require('../db');

class RecruiterController {
    async getMe(req, res) {
        try {
            const userId = req.user.id;
            const result = await db.query('SELECT * FROM recruiters WHERE user_id = $1', [userId]);
            if (result.rows.length === 0) {
                // Если записи нет (старый юзер), создаем пустую
                const newRec = await db.query('INSERT INTO recruiters (user_id) VALUES ($1) RETURNING *', [userId]);
                return res.json(newRec.rows[0]);
            }
            res.json(result.rows[0]);
        } catch (e) { res.status(500).json({ message: 'Ошибка' }); }
    }

    async updateMe(req, res) {
        try {
            const userId = req.user.id;
            const { first_name, last_name, phone, telegram, position } = req.body;
            const result = await db.query(
                `UPDATE recruiters SET first_name=$1, last_name=$2, phone=$3, telegram=$4, position=$5 
                 WHERE user_id=$6 RETURNING *`,
                [first_name, last_name, phone, telegram, position, userId]
            );
            res.json(result.rows[0]);
        } catch (e) { res.status(500).json({ message: 'Ошибка обновления' }); }
    }

    async uploadAvatar(req, res) {
        try {
            const userId = req.user.id;
            if (!req.file) return res.status(400).json({ message: 'Нет файла' });
            const avatarUrl = `/uploads/${req.file.filename}`;
            await db.query('UPDATE recruiters SET avatar_url = $1 WHERE user_id = $2', [avatarUrl, userId]);
            res.json({ avatar_url: avatarUrl });
        } catch (e) { res.status(500).json({ message: 'Ошибка загрузки' }); }
    }
}

module.exports = new RecruiterController();