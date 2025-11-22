const db = require('../db');
const aiService = require('../services/aiService');

class VacancyController {

    // Создание вакансии
    async createVacancy(req, res) {
        try {
            const {
                company_id, title, description,
                salary_min, salary_max, contact_email,
                use_ai, manual_skills // <--- Новые параметры
            } = req.body;

            const newVacancy = await db.query(
                `INSERT INTO vacancies (company_id, title, description, salary_min, salary_max, contact_email) 
                 VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
                [company_id, title, description, salary_min, salary_max, contact_email]
            );
            const vacancyId = newVacancy.rows[0].id;

            let rawSkills = [];

            // ЛОГИКА ВЫБОРА ИСТОЧНИКА НАВЫКОВ
            if (use_ai) {
                // 1. Если включен ИИ — спрашиваем его
                console.log("Using AI for skills extraction...");
                const aiResponse = await aiService.extractSkills(description);
                rawSkills = typeof aiResponse === 'string' ? aiResponse.split(',').map(s => s.trim()) : [];
            } else {
                // 2. Если выключен — берем то, что ввел пользователь
                console.log("Using manual skills...");
                if (manual_skills && manual_skills.trim() !== '') {
                    // Разбиваем строку "Java, SQL" по запятым
                    rawSkills = manual_skills.split(',').map(s => s.trim());
                }
            }

            // Сохранение навыков в БД (общая логика)
            const savedSkills = [];
            for (const skillName of rawSkills) {
                if (!skillName) continue;

                // Добавляем навык в справочник (если нет)
                await db.query('INSERT INTO skills (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [skillName]);

                // Получаем ID
                const skillRes = await db.query('SELECT id FROM skills WHERE name = $1', [skillName]);
                const skillId = skillRes.rows[0].id;

                // Связываем с вакансией
                await db.query('INSERT INTO vacancy_skills (vacancy_id, skill_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [vacancyId, skillId]);

                savedSkills.push({ id: skillId, name: skillName });
            }

            res.json({ message: 'Вакансия создана', vacancy: newVacancy.rows[0], ai_skills: savedSkills });
        } catch (e) {
            console.error(e);
            res.status(500).json({ message: 'Ошибка создания вакансии' });
        }
    }

    // Получить все
    async getAll(req, res) {
        try {
            const result = await db.query(`
                SELECT v.*, c.name as company_name, c.city as company_city,
                       ARRAY_AGG(s.name) as skills
                FROM vacancies v
                JOIN companies c ON v.company_id = c.id
                LEFT JOIN vacancy_skills vs ON v.id = vs.vacancy_id
                LEFT JOIN skills s ON vs.skill_id = s.id
                GROUP BY v.id, c.name, c.city
                ORDER BY v.created_at DESC
            `);
            res.json(result.rows);
        } catch (e) { res.status(500).json({ message: 'Ошибка' }); }
    }

    // Получить мои вакансии
    async getMyVacancies(req, res) {
        try {
            const userId = req.user.id;
            const compRes = await db.query('SELECT id FROM companies WHERE user_id = $1', [userId]);
            if (compRes.rows.length === 0) return res.json([]);
            const companyId = compRes.rows[0].id;

            const vacancies = await db.query(`SELECT * FROM vacancies WHERE company_id = $1 ORDER BY created_at DESC`, [companyId]);
            res.json(vacancies.rows);
        } catch (e) { res.status(500).json({ message: 'Ошибка' }); }
    }

    // Удаление
    async deleteVacancy(req, res) {
        try {
            const userId = req.user.id;
            const vacancyId = req.params.id;
            await db.query(`
                DELETE FROM vacancies 
                WHERE id = $1 AND company_id = (SELECT id FROM companies WHERE user_id = $2)
            `, [vacancyId, userId]);
            res.json({ message: 'Вакансия удалена' });
        } catch (e) { res.status(500).json({ message: 'Ошибка удаления' }); }
    }

    // НОВЫЙ МЕТОД: Редактирование
    async updateVacancy(req, res) {
        try {
            const userId = req.user.id;
            const vacancyId = req.params.id;
            const { title, description, salary_min, salary_max, contact_email } = req.body;

            const result = await db.query(
                `UPDATE vacancies 
                 SET title = $1, description = $2, salary_min = $3, salary_max = $4, contact_email = $5
                 WHERE id = $6 
                 AND company_id = (SELECT id FROM companies WHERE user_id = $7)
                 RETURNING *`,
                [title, description, salary_min, salary_max, contact_email, vacancyId, userId]
            );

            if (result.rows.length === 0) {
                return res.status(403).json({ message: 'Ошибка доступа или вакансия не найдена' });
            }

            res.json(result.rows[0]);
        } catch (e) {
            console.error(e);
            res.status(500).json({ message: 'Ошибка редактирования' });
        }
    }
}

module.exports = new VacancyController();