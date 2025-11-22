const db = require('../db');
const aiService = require('../services/aiService');
const testController = require('./testController'); // <--- ВАЖНО: Импорт

class ApplicationController {

    // Начать отклик (Генерация блиц-вопросов)
    async startApplication(req, res) {
        try {
            const userId = req.user.id;
            const { vacancy_id } = req.body;

            const gradRes = await db.query('SELECT id FROM graduates WHERE user_id = $1', [userId]);
            if (gradRes.rows.length === 0) return res.status(403).json({ message: 'Вы не выпускник' });
            const graduateId = gradRes.rows[0].id;

            const check = await db.query(
                'SELECT * FROM applications WHERE vacancy_id = $1 AND graduate_id = $2',
                [vacancy_id, graduateId]
            );

            if (check.rows.length > 0) {
                const existingApp = check.rows[0];
                if (existingApp.status === 'rejected' || existingApp.status === 'employer_rejected') {
                    await db.query('DELETE FROM applications WHERE id = $1', [existingApp.id]);
                } else if (existingApp.status === 'accepted' || existingApp.status === 'hired') {
                    return res.status(400).json({ message: 'Вы уже приняты на эту вакансию!' });
                } else if (existingApp.status === 'pending_test') {
                    return res.json(existingApp);
                }
            }

            const vacRes = await db.query('SELECT title, description FROM vacancies WHERE id = $1', [vacancy_id]);
            const vacancy = vacRes.rows[0];

            const tasks = await aiService.generateTestTasks(vacancy.title, vacancy.description);

            const newApp = await db.query(
                `INSERT INTO applications (vacancy_id, graduate_id, status, test_tasks) 
                 VALUES ($1, $2, 'pending_test', $3) RETURNING *`,
                [vacancy_id, graduateId, JSON.stringify(tasks)]
            );

            res.json(newApp.rows[0]);

        } catch (e) {
            console.error(e);
            res.status(500).json({ message: 'Ошибка создания отклика' });
        }
    }

    // Отправить решение Блиц-теста
    async submitTest(req, res) {
        try {
            const userId = req.user.id; // Это студент
            const { application_id, answers, cover_letter } = req.body;

            const appRes = await db.query(
                `SELECT a.*, v.title, v.company_id, v.id as vacancy_id 
                 FROM applications a
                 JOIN graduates g ON a.graduate_id = g.id
                 JOIN vacancies v ON a.vacancy_id = v.id
                 WHERE a.id = $1 AND g.user_id = $2`,
                [application_id, userId]
            );

            if (appRes.rows.length === 0) return res.status(404).json({ message: 'Заявка не найдена' });
            const application = appRes.rows[0];

            // Проверка ИИ
            const review = await aiService.reviewTest(application.test_tasks, answers);
            const status = review.score >= 70 ? 'accepted' : 'rejected';

            const updatedApp = await db.query(
                `UPDATE applications 
                 SET student_answers = $1, 
                     ai_feedback = $2, 
                     ai_score = $3, 
                     status = $4,
                     cover_letter = $5
                 WHERE id = $6
                 RETURNING *`,
                [JSON.stringify(answers), review.feedback, review.score, status, cover_letter, application_id]
            );

            // --- ЛОГИКА ПРИНЯТИЯ (НОВОЕ) ---
            if (status === 'accepted') {
                // 1. Находим ID работодателя (через компанию)
                const compRes = await db.query('SELECT user_id, name FROM companies WHERE id = $1', [application.company_id]);
                const employerId = compRes.rows[0].user_id;
                const companyName = compRes.rows[0].name;

                // 2. Создаем первое сообщение в чате (привязка к vacancy_id)
                await db.query(
                    `INSERT INTO direct_messages (sender_id, receiver_id, content, vacancy_id) 
                     VALUES ($1, $2, $3, $4)`,
                    [
                        employerId, // Отправитель - как бы работодатель
                        userId,     // Получатель - студент
                        `Поздравляю! Вы успешно прошли предварительное тестирование на вакансию "${application.title}". Сейчас ИИ сформирует для вас полное техническое задание.`,
                        application.vacancy_id
                    ]
                );

                // 3. Уведомление работодателю
                await db.query(
                    `INSERT INTO notifications (user_id, sender_id, title, message, type) 
                     VALUES ($1, $2, $3, $4, 'success')`,
                    [employerId, userId, 'Новый успешный отклик', `Кандидат прошел тест на вакансию ${application.title} (Балл: ${review.score})`]
                );

                // 4. Запускаем генерацию ТЗ
                testController.assignTask(employerId, userId, application.vacancy_id);
            }

            res.json(updatedApp.rows[0]);

        } catch (e) {
            console.error(e);
            res.status(500).json({ message: 'Ошибка отправки теста' });
        }
    }

    // Отмена
    async cancelApplication(req, res) {
        try {
            const userId = req.user.id;
            const { application_id } = req.body;

            await db.query(
                `DELETE FROM applications 
                 USING graduates 
                 WHERE applications.graduate_id = graduates.id 
                 AND applications.id = $1 
                 AND graduates.user_id = $2
                 AND applications.status = 'pending_test'`,
                [application_id, userId]
            );

            res.json({ message: 'Заявка отменена' });
        } catch (e) {
            res.status(500).json({ message: 'Ошибка отмены' });
        }
    }

    // Отклонение работодателем
    async rejectApplication(req, res) {
        try {
            const userId = req.user.id;
            const { application_id } = req.body;

            const check = await db.query(`
                SELECT a.id 
                FROM applications a
                JOIN vacancies v ON a.vacancy_id = v.id
                JOIN companies c ON v.company_id = c.id
                WHERE a.id = $1 AND c.user_id = $2
            `, [application_id, userId]);

            if (check.rows.length === 0) return res.status(403).json({ message: 'Нет доступа' });

            await db.query("UPDATE applications SET status = 'employer_rejected' WHERE id = $1", [application_id]);
            res.json({ message: 'Отклик отклонен' });
        } catch (e) {
            res.status(500).json({ message: 'Ошибка' });
        }
    }

    // Получить отклики (для работодателя)
    async getEmployerApplications(req, res) {
        try {
            const userId = req.user.id;
            const compRes = await db.query('SELECT id FROM companies WHERE user_id = $1', [userId]);
            if (compRes.rows.length === 0) return res.json([]);
            const companyId = compRes.rows[0].id;

            const applications = await db.query(`
                SELECT a.*, 
                       v.title as vacancy_title,
                       g.id as graduate_id, g.user_id as student_user_id,
                       g.first_name, g.last_name, g.avatar_url, g.about_me, g.phone, g.city, g.portfolio_links,
                       s.name as specialty_name, u.email as student_email
                FROM applications a
                JOIN vacancies v ON a.vacancy_id = v.id
                JOIN graduates g ON a.graduate_id = g.id
                JOIN users u ON g.user_id = u.id
                LEFT JOIN specialties s ON g.specialty_id = s.id
                WHERE v.company_id = $1 
                  AND (a.status = 'accepted' OR a.status = 'test_assigned' OR a.status = 'reviewing' OR a.status = 'hired')
                ORDER BY a.created_at DESC
            `, [companyId]);

            res.json(applications.rows);
        } catch (e) {
            res.status(500).json({ message: 'Ошибка' });
        }
    }

    async getMyApplications(req, res) { /* Оставляем без изменений код из прошлых шагов */ }
}

module.exports = new ApplicationController();