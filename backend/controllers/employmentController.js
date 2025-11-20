const db = require('../db');

class EmploymentController {
    // Добавить запись о работе
    async addRecord(req, res) {
        try {
            const userId = req.user.id;
            // Нам нужно получить ID выпускника по ID пользователя
            const gradCheck = await db.query('SELECT id FROM graduates WHERE user_id = $1', [userId]);
            if (gradCheck.rows.length === 0) {
                return res.status(404).json({ message: 'Профиль выпускника не найден' });
            }
            const graduateId = gradCheck.rows[0].id;

            const { company_id, position_title, start_date, end_date, salary_amount, is_current } = req.body;

            const newRecord = await db.query(
                `INSERT INTO employment_records 
                (graduate_id, company_id, position_title, start_date, end_date, salary_amount, is_current) 
                VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
                [graduateId, company_id, position_title, start_date, end_date, salary_amount, is_current]
            );

            res.json(newRecord.rows[0]);
        } catch (e) {
            console.error(e);
            res.status(500).json({ message: 'Ошибка добавления записи' });
        }
    }

    // Получить историю моих работ
    async getMyRecords(req, res) {
        try {
            const userId = req.user.id;

            const records = await db.query(
                `SELECT er.*, c.name as company_name, c.city as company_city
                 FROM employment_records er
                 JOIN graduates g ON er.graduate_id = g.id
                 LEFT JOIN companies c ON er.company_id = c.id
                 WHERE g.user_id = $1
                 ORDER BY er.start_date DESC`,
                [userId]
            );

            res.json(records.rows);
        } catch (e) {
            console.error(e);
            res.status(500).json({ message: 'Ошибка получения истории' });
        }
    }

    // Удалить запись (вдруг ошибся)
    async deleteRecord(req, res) {
        try {
            const id = req.params.id;
            await db.query('DELETE FROM employment_records WHERE id = $1', [id]);
            res.json({ message: 'Запись удалена' });
        } catch (e) {
            console.error(e);
            res.status(500).json({ message: 'Ошибка удаления' });
        }
    }
}

module.exports = new EmploymentController();