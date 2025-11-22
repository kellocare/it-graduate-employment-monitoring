const db = require('../db');

class EmployerController {

    // Получить мою компанию
    async getMyCompany(req, res) {
        try {
            const userId = req.user.id;
            const company = await db.query('SELECT * FROM companies WHERE user_id = $1', [userId]);

            if (company.rows.length === 0) {
                return res.json({ name: '', city: '', description: '', website: '', inn: '' });
            }
            res.json(company.rows[0]);
        } catch (e) {
            console.error("Get Company Error:", e);
            res.status(500).json({ message: 'Ошибка получения компании' });
        }
    }

    // Создать или обновить компанию
    async saveCompany(req, res) {
        try {
            const userId = req.user.id;
            let { name, city, description, website, inn } = req.body;

            if (!name) return res.status(400).json({ message: 'Название компании обязательно' });

            // Защита: обрезаем строки, если они слишком длинные (согласно схеме БД)
            if (inn && inn.length > 12) inn = inn.substring(0, 12);

            // Хелпер для null
            const safe = (val) => (val === undefined || val === '') ? null : val;

            console.log('Saving Company:', { userId, name, inn });

            const check = await db.query('SELECT id FROM companies WHERE user_id = $1', [userId]);

            if (check.rows.length > 0) {
                // UPDATE
                const updated = await db.query(
                    `UPDATE companies 
                     SET name=$1, city=$2, description=$3, website=$4, inn=$5 
                     WHERE user_id=$6 RETURNING *`,
                    [name, safe(city), safe(description), safe(website), safe(inn), userId]
                );
                return res.json(updated.rows[0]);
            } else {
                // INSERT
                const newComp = await db.query(
                    `INSERT INTO companies (user_id, name, city, description, website, inn) 
                     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
                    [userId, name, safe(city), safe(description), safe(website), safe(inn)]
                );
                return res.json(newComp.rows[0]);
            }
        } catch (e) {
            console.error("❌ SQL Error in saveCompany:", e.message);
            res.status(500).json({ message: 'Ошибка сохранения: ' + e.message });
        }
    }
}

module.exports = new EmployerController();