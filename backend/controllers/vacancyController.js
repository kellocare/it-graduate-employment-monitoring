const db = require('../db');
const aiService = require('../services/aiService');

class VacancyController {

    // Создание вакансии с ИИ-анализом
    async createVacancy(req, res) {
        try {
            const { company_id, title, description, salary_min, salary_max, contact_email } = req.body;

            // 1. Создаем саму вакансию
            const newVacancy = await db.query(
                `INSERT INTO vacancies (company_id, title, description, salary_min, salary_max, contact_email) 
                 VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
                [company_id, title, description, salary_min, salary_max, contact_email]
            );
            const vacancyId = newVacancy.rows[0].id;

            // 2. Спрашиваем ИИ про навыки
            // (Делаем это параллельно с сохранением, но тут подождем для простоты)
            console.log('Analysing vacancy with AI...');
            const aiResponse = await aiService.extractSkills(description);
            console.log('AI extracted skills:', aiResponse);

            // 3. Обрабатываем ответ ИИ (превращаем строку "Java, SQL" в массив)
            // Убираем пробелы, точки, переводы строк
            const rawSkills = aiResponse.split(',').map(s => s.trim().replace(/\.$/, ''));

            // 4. Сохраняем навыки в БД и привязываем к вакансии
            const savedSkills = [];

            for (const skillName of rawSkills) {
                if (!skillName) continue;

                // Пытаемся найти навык или создать новый (ON CONFLICT DO NOTHING не возвращает ID в старых версиях PG, поэтому делаем так)
                // Сначала вставляем (если нет)
                await db.query(
                    'INSERT INTO skills (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
                    [skillName]
                );

                // Получаем ID навыка
                const skillRes = await db.query('SELECT id FROM skills WHERE name = $1', [skillName]);
                const skillId = skillRes.rows[0].id;

                // Связываем с вакансией
                await db.query(
                    'INSERT INTO vacancy_skills (vacancy_id, skill_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                    [vacancyId, skillId]
                );

                savedSkills.push({ id: skillId, name: skillName });
            }

            res.json({
                message: 'Вакансия создана и проанализирована ИИ',
                vacancy: newVacancy.rows[0],
                ai_skills: savedSkills
            });

        } catch (e) {
            console.error(e);
            res.status(500).json({ message: 'Ошибка создания вакансии' });
        }
    }

    // Получить список всех вакансий
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
        } catch (e) {
            console.error(e);
            res.status(500).json({ message: 'Ошибка получения вакансий' });
        }
    }
}

module.exports = new VacancyController();