const db = require('../db');
const aiService = require('../services/aiService');

class VacancyController {

    async createVacancy(req, res) {
        try {
            const {
                company_id, title, description,
                salary_min, salary_max, contact_email,
                use_ai, manual_skills
            } = req.body;

            const newVacancy = await db.query(
                `INSERT INTO vacancies (company_id, title, description, salary_min, salary_max, contact_email) 
                 VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
                [company_id, title, description, salary_min, salary_max, contact_email]
            );
            const vacancyId = newVacancy.rows[0].id;

            // 1. Навыки
            let rawSkills = [];
            if (use_ai) {
                const aiResponse = await aiService.extractSkills(description);
                rawSkills = typeof aiResponse === 'string' ? aiResponse.split(',').map(s => s.trim()) : [];
            } else {
                if (manual_skills && manual_skills.trim() !== '') {
                    rawSkills = manual_skills.split(',').map(s => s.trim());
                }
            }

            const savedSkills = [];
            for (const skillName of rawSkills) {
                if (!skillName) continue;
                await db.query('INSERT INTO skills (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [skillName]);
                const skillRes = await db.query('SELECT id FROM skills WHERE name = $1', [skillName]);
                const skillId = skillRes.rows[0].id;
                await db.query('INSERT INTO vacancy_skills (vacancy_id, skill_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [vacancyId, skillId]);
                savedSkills.push({ id: skillId, name: skillName });
            }

            // 2. НОВОЕ: Генерация AI Summary
            // Запускаем генерацию, но не блокируем ответ (хотя для диплома можно и подождать)
            // В данном коде мы подождем, чтобы вернуть красивый ответ сразу
            let summary = null;
            if (use_ai) {
                summary = await aiService.generateVacancySummary(title, description);
                await db.query('UPDATE vacancies SET ai_summary = $1 WHERE id = $2', [summary, vacancyId]);
            }

            // Формируем полный объект для ответа
            const vacancyData = newVacancy.rows[0];
            vacancyData.ai_summary = summary;

            res.json({ message: 'Вакансия создана', vacancy: vacancyData, ai_skills: savedSkills });
        } catch (e) {
            console.error(e);
            res.status(500).json({ message: 'Ошибка создания вакансии' });
        }
    }

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
            if (result.rows.length === 0) return res.status(403).json({ message: 'Ошибка доступа' });
            res.json(result.rows[0]);
        } catch (e) { res.status(500).json({ message: 'Ошибка редактирования' }); }
    }
}

module.exports = new VacancyController();