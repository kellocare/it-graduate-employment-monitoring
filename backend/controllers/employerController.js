const db = require('../db');

class EmployerController {

    // Получить мою компанию
    async getMyCompany(req, res) {
        try {
            const userId = req.user.id;
            const company = await db.query('SELECT * FROM companies WHERE user_id = $1', [userId]);

            if (company.rows.length === 0) {
                return res.json(null); // Компании пока нет
            }
            res.json(company.rows[0]);
        } catch (e) {
            console.error(e);
            res.status(500).json({ message: 'Ошибка получения компании' });
        }
    }

    // Создать или обновить компанию
    async saveCompany(req, res) {
        try {
            const userId = req.user.id;
            const { name, city, description, website, inn } = req.body;

            // Проверяем, есть ли уже компания
            const check = await db.query('SELECT id FROM companies WHERE user_id = $1', [userId]);

            if (check.rows.length > 0) {
                // Обновляем
                const updated = await db.query(
                    `UPDATE companies SET name=$1, city=$2, description=$3, website=$4, inn=$5 
                     WHERE user_id=$6 RETURNING *`,
                    [name, city, description, website, inn, userId]
                );
                return res.json(updated.rows[0]);
            } else {
                // Создаем новую
                const newComp = await db.query(
                    `INSERT INTO companies (user_id, name, city, description, website, inn) 
                     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
                    [userId, name, city, description, website, inn]
                );
                return res.json(newComp.rows[0]);
            }
        } catch (e) {
            console.error(e);
            res.status(500).json({ message: 'Ошибка сохранения компании' });
        }
    }
}

module.exports = new EmployerController();