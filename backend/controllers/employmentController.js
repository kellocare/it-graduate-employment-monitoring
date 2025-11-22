const db = require('../db');

class EmploymentController {

    // Хелпер: превращает пустые строки и undefined в null
    _safe(val) {
        if (val === undefined || val === '' || val === null) return null;
        return val;
    }

    // Добавить запись
    async addRecord(req, res) {
        try {
            const userId = req.user.id;

            // 1. Получаем ID выпускника
            const gradCheck = await db.query('SELECT id FROM graduates WHERE user_id = $1', [userId]);
            if (gradCheck.rows.length === 0) {
                return res.status(404).json({ message: 'Профиль выпускника не найден' });
            }
            const graduateId = gradCheck.rows[0].id;

            const { company_id, position_title, start_date, end_date, salary_amount, is_current } = req.body;

            // 2. ВАЛИДАЦИЯ
            if (!start_date) {
                return res.status(400).json({ message: 'Дата начала работы обязательна' });
            }
            if (!company_id) {
                return res.status(400).json({ message: 'Выберите компанию' });
            }

            // 3. Подготовка данных
            const safeEndDate = is_current ? null : this._safe(end_date);
            const safeSalary = this._safe(salary_amount);
            const safeIsCurrent = Boolean(is_current);

            console.log('Adding Record:', { graduateId, company_id, position_title, start_date, safeEndDate });

            const newRecord = await db.query(
                `INSERT INTO employment_records 
                (graduate_id, company_id, position_title, start_date, end_date, salary_amount, is_current) 
                VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
                [graduateId, company_id, position_title, start_date, safeEndDate, safeSalary, safeIsCurrent]
            );

            res.json(newRecord.rows[0]);

        } catch (e) {
            console.error("❌ SQL Error in addRecord:", e.message); // <-- Читать ошибку тут
            res.status(500).json({ message: 'Ошибка добавления записи: ' + e.message });
        }
    }

    // Получить историю
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
            res.status(500).json({ message: 'Ошибка получения' });
        }
    }

    // Удалить запись
    async deleteRecord(req, res) {
        try {
            const id = req.params.id;
            await db.query('DELETE FROM employment_records WHERE id = $1', [id]);
            res.json({ message: 'Запись удалена' });
        } catch (e) { res.status(500).json({ message: 'Ошибка удаления' }); }
    }

    // Редактировать запись
    async updateRecord(req, res) {
        try {
            const userId = req.user.id;
            const recordId = req.params.id;
            const { company_id, position_title, start_date, end_date, salary_amount, is_current } = req.body;

            // ВАЛИДАЦИЯ
            if (!start_date) {
                return res.status(400).json({ message: 'Дата начала обязательна' });
            }

            const safeEndDate = is_current ? null : this._safe(end_date);
            const safeSalary = this._safe(salary_amount);
            const safeIsCurrent = Boolean(is_current);

            console.log('Updating Record ID:', recordId, 'Data:', req.body);

            // Обновляем через подзапрос для безопасности (чтобы нельзя было править чужие записи)
            const result = await db.query(
                `UPDATE employment_records 
                 SET company_id = $1, position_title = $2, start_date = $3, end_date = $4, 
                     salary_amount = $5, is_current = $6
                 WHERE id = $7 
                 AND graduate_id = (SELECT id FROM graduates WHERE user_id = $8)
                 RETURNING *`,
                [company_id, position_title, start_date, safeEndDate, safeSalary, safeIsCurrent, recordId, userId]
            );

            if (result.rows.length === 0) {
                return res.status(403).json({ message: 'Запись не найдена или нет прав' });
            }
            res.json(result.rows[0]);

        } catch (e) {
            console.error("❌ SQL Error in updateRecord:", e.message);
            res.status(500).json({ message: 'Ошибка сохранения: ' + e.message });
        }
    }
}

module.exports = new EmploymentController();