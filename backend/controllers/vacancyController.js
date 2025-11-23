const db = require('../db');
const aiService = require('../services/aiService');
const auditService = require('../services/auditService');

class VacancyController {

    // --- ОБЩИЕ МЕТОДЫ (Твой код) ---

    // 1. Создание вакансии (pending)
    createVacancy = async (req, res) => {
        try {
            const {
                company_id, title, description,
                salary_min, salary_max, contact_email,
                use_ai, manual_skills
            } = req.body;

            const newVacancy = await db.query(
                `INSERT INTO vacancies (company_id, title, description, salary_min, salary_max, contact_email, status, created_at) 
                 VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW()) RETURNING *`,
                [company_id, title, description, salary_min, salary_max, contact_email]
            );
            const vacancyId = newVacancy.rows[0].id;

            // Логика навыков
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

            // AI Summary
            let summary = null;
            if (use_ai) {
                summary = await aiService.generateVacancySummary(title, description);
                await db.query('UPDATE vacancies SET ai_summary = $1 WHERE id = $2', [summary, vacancyId]);
            }

            const vacancyData = newVacancy.rows[0];
            vacancyData.ai_summary = summary;

            res.json({ message: 'Вакансия создана и отправлена на модерацию', vacancy: vacancyData, ai_skills: savedSkills });
        } catch (e) {
            console.error(e);
            res.status(500).json({ message: 'Ошибка создания вакансии' });
        }
    }

    // 2. Публичный список (Active)
    getAll = async (req, res) => {
        try {
            const result = await db.query(`
                SELECT v.*, c.name as company_name, c.city as company_city,
                       ARRAY_AGG(s.name) as skills
                FROM vacancies v
                JOIN companies c ON v.company_id = c.id
                LEFT JOIN vacancy_skills vs ON v.id = vs.vacancy_id
                LEFT JOIN skills s ON vs.skill_id = s.id
                WHERE v.status = 'active' 
                GROUP BY v.id, c.name, c.city
                ORDER BY v.created_at DESC
            `);
            res.json(result.rows);
        } catch (e) { res.status(500).json({ message: 'Ошибка' }); }
    }

    // 3. Мои вакансии
    getMyVacancies = async (req, res) => {
        try {
            const userId = req.user.id;
            const compRes = await db.query('SELECT id FROM companies WHERE user_id = $1', [userId]);
            if (compRes.rows.length === 0) return res.json([]);
            const companyId = compRes.rows[0].id;
            const vacancies = await db.query(`SELECT * FROM vacancies WHERE company_id = $1 ORDER BY created_at DESC`, [companyId]);
            res.json(vacancies.rows);
        } catch (e) { res.status(500).json({ message: 'Ошибка' }); }
    }

    // 4. Удаление
    deleteVacancy = async (req, res) => {
        try {
            const userId = req.user.id;
            const vacancyId = req.params.id;
            // Админ тоже может удалять, добавим проверку
            if (req.user.role === 'admin') {
                await db.query('DELETE FROM vacancies WHERE id = $1', [vacancyId]);
            } else {
                await db.query(`DELETE FROM vacancies WHERE id = $1 AND company_id = (SELECT id FROM companies WHERE user_id = $2)`, [vacancyId, userId]);
            }
            res.json({ message: 'Вакансия удалена' });
        } catch (e) { res.status(500).json({ message: 'Ошибка удаления' }); }
    }

    // 5. Редактирование
    updateVacancy = async (req, res) => {
        try {
            const userId = req.user.id;
            const vacancyId = req.params.id;
            const { title, description, salary_min, salary_max, contact_email } = req.body;

            // ! ИСПРАВЛЕНИЕ: Добавили "status = 'pending'"
            // Теперь при любом редактировании вакансия улетает на перепроверку
            const result = await db.query(
                `UPDATE vacancies 
                 SET title = $1, 
                     description = $2, 
                     salary_min = $3, 
                     salary_max = $4, 
                     contact_email = $5,
                     status = 'pending' 
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

    // === НОВЫЕ МЕТОДЫ ДЛЯ АДМИНА ===

    // 6. Получить ВСЕ вакансии (для вкладок Pending / All)
    getAdminVacancies = async (req, res) => {
        try {
            // Выбираем user_id владельца, чтобы можно было отправить ему сообщение
            const vacancies = await db.query(`
                SELECT v.*, c.name as company_name, c.user_id as user_id
                FROM vacancies v
                JOIN companies c ON v.company_id = c.id
                ORDER BY 
                    CASE WHEN v.status = 'pending' THEN 1 ELSE 2 END,
                    v.created_at DESC
            `);
            res.json(vacancies.rows);
        } catch (e) {
            console.error(e);
            res.status(500).json({ message: "Ошибка сервера" });
        }
    }

    // 7. Смена статуса + УВЕДОМЛЕНИЕ С ПРИЧИНОЙ
    updateStatus = async (req, res) => {
        try {
            const { id, status, reason } = req.body; // <--- Добавили reason

            // 1. Обновляем статус
            const updated = await db.query(
                'UPDATE vacancies SET status = $1 WHERE id = $2 RETURNING *',
                [status, id]
            );

            if (updated.rows.length === 0) return res.status(404).json({ message: "Не найдено" });
            const vac = updated.rows[0];

            // 2. Находим владельца
            const compRes = await db.query('SELECT user_id FROM companies WHERE id = $1', [vac.company_id]);
            const ownerId = compRes.rows[0]?.user_id;

            if (status === 'rejected') {
                await auditService.log(req.user.id, 'REJECT_VACANCY', id, `Причина: ${reason || 'Не указана'}`);
            }

            // 3. Создаем уведомление
            if (ownerId) {
                let title = status === 'active' ? '✅ Вакансия опубликована' : '🛑 Вакансия отклонена';

                let msg = '';
                if (status === 'active') {
                    msg = `Ваша вакансия "${vac.title}" проверена и доступна студентам.`;
                } else {
                    // Если отклонено — добавляем причину
                    msg = `Ваша вакансия "${vac.title}" отклонена модератором.`;
                    if (reason) {
                        msg += `\nПричина: ${reason}`;
                    }
                }

                try {
                    await db.query(
                        'INSERT INTO notifications (user_id, title, message, created_at) VALUES ($1, $2, $3, NOW())',
                        [ownerId, title, msg]
                    );
                } catch (err) {
                    console.error("Ошибка уведомления:", err);
                }
            }

            res.json(vac);
        } catch (e) {
            console.error(e);
            res.status(500).json({ message: "Ошибка обновления статуса" });
        }
    }

    // Получить ОДНУ вакансию по ID (нужно для редактирования)
    async getById(req, res) {
        try {
            const id = req.params.id;

            // Получаем вакансию
            const result = await db.query('SELECT * FROM vacancies WHERE id = $1', [id]);

            if (result.rows.length === 0) {
                return res.status(404).json({ message: "Вакансия не найдена" });
            }

            res.json(result.rows[0]);
        } catch (e) {
            console.error(e);
            res.status(500).json({ message: "Ошибка получения вакансии" });
        }
    }

    // 8. KILLER FEATURE: AI Анализ
    analyzeVacancyAi = async (req, res) => {
        try {
            const { description, title, salary } = req.body;

            const prompt = `
                Проанализируй вакансию.
                Заголовок: ${title}
                Зарплата: ${salary || 'Не указана'}
                Описание: ${description}

                Верни ТОЛЬКО JSON:
                {
                    "score": (0-100),
                    "pros": ["плюс1", "плюс2"],
                    "cons": ["минус1", "минус2"],
                    "verdict": "Вывод",
                    "flags": boolean (есть ли риски)
                }
            `;

            // Вызываем AI сервис. Метод getCompletion должен возвращать строку
            const raw = await aiService.getCompletion([{ role: 'user', content: prompt }]);

            // Чистим ответ от возможных Markdown тегов (```json ... ```)
            const cleanJson = raw.replace(/```json/g, '').replace(/```/g, '').trim();
            const result = JSON.parse(cleanJson);

            res.json(result);
        } catch (e) {
            console.error("AI Error:", e);
            res.status(500).json({ message: "Ошибка анализа" });
        }
    }
}

module.exports = new VacancyController();