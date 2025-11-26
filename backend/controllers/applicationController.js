const db = require('../db');
const aiService = require('../services/aiService');

class ApplicationController {

    // 1. Начать отклик (Генерация блиц-теста)
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
                if (['rejected', 'employer_rejected', 'rejected_final'].includes(existingApp.status)) {
                    await db.query('DELETE FROM applications WHERE id = $1', [existingApp.id]);
                } else if (existingApp.status === 'pending_test') {
                    return res.json(existingApp);
                } else {
                    return res.status(400).json({ message: 'Вы уже проходите отбор на эту вакансию!' });
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
            console.error("Start App Error:", e);
            res.status(500).json({ message: 'Ошибка создания отклика' });
        }
    }

    // 2. Отправить решение Блиц-теста
    async submitTest(req, res) {
        try {
            const userId = req.user.id;
            const { application_id, answers, cover_letter } = req.body;

            const appRes = await db.query(
                `SELECT a.*, v.title, v.description, v.company_id, v.id as vacancy_id 
                 FROM applications a
                 JOIN graduates g ON a.graduate_id = g.id
                 JOIN vacancies v ON a.vacancy_id = v.id
                 WHERE a.id = $1 AND g.user_id = $2`,
                [application_id, userId]
            );

            if (appRes.rows.length === 0) return res.status(404).json({ message: 'Заявка не найдена' });
            const application = appRes.rows[0];

            const review = await aiService.reviewTest(application.test_tasks, answers);
            const passed = review.score >= 60;
            const status = passed ? 'accepted' : 'rejected';

            const updatedApp = await db.query(
                `UPDATE applications 
                 SET student_answers = $1, ai_feedback = $2, ai_score = $3, status = $4, cover_letter = $5
                 WHERE id = $6 RETURNING *`,
                [JSON.stringify(answers), review.feedback, review.score, status, cover_letter, application_id]
            );

            if (passed) {
                const compRes = await db.query('SELECT user_id, name FROM companies WHERE id = $1', [application.company_id]);
                const employerId = compRes.rows[0].user_id;

                const taskMarkdown = await aiService.generateComplexTask(application.title, application.description);

                await db.query(
                    `UPDATE applications SET full_test_task = $1, status = 'test_assigned' WHERE id = $2`,
                    [taskMarkdown, application.id]
                );

                const chatMsg = `
🎉 **Поздравляем! Вы прошли блиц-тест (Балл: ${review.score}).**

📋 **ВАШЕ ТЕСТОВОЕ ЗАДАНИЕ:**
${taskMarkdown}

---
⚠️ **Инструкция:**
Выполните задание и нажмите кнопку **"Сдать решение"** (скрепка) вверху чата.
                `;

                // ВАЖНО: Пишем в direct_messages с vacancy_id
                await db.query(
                    `INSERT INTO direct_messages (sender_id, receiver_id, content, vacancy_id) 
                     VALUES ($1, $2, $3, $4)`,
                    [employerId, userId, chatMsg, application.vacancy_id]
                );

                await db.query(
                    `INSERT INTO notifications (user_id, sender_id, title, message, type) 
                     VALUES ($1, $2, $3, $4, 'success')`,
                    [employerId, userId, 'Кандидат прошел тест', `Кандидат прошел блиц на ${application.title}`]
                );
            }

            res.json(updatedApp.rows[0]);

        } catch (e) {
            console.error("Submit Test Error:", e);
            res.status(500).json({ message: 'Ошибка отправки теста' });
        }
    }

    // 3. Отправить решение БОЛЬШОГО ТЗ
    async submitSolution(req, res) {
        try {
            const { employer_user_id, description } = req.body;
            const student_id = req.user.id;
            const file = req.file;

            console.log(`📝 Submitting solution: Student=${student_id}, Employer=${employer_user_id}`);

            // Ищем активную заявку
            const appRes = await db.query(`
                SELECT a.*, v.title as vacancy_title, v.id as vacancy_id
                FROM applications a
                JOIN vacancies v ON a.vacancy_id = v.id
                WHERE a.user_id = $1 
                  AND v.company_id IN (SELECT id FROM companies WHERE user_id = $2)
                  AND (a.status = 'test_assigned' OR a.status = 'accepted' OR a.status = 'reviewing')
                ORDER BY a.created_at DESC LIMIT 1
            `, [student_id, employer_user_id]);

            const application = appRes.rows[0];

            if (!application) {
                console.error("❌ No active application found for solution");
                return res.status(404).json({ message: "Активная заявка не найдена" });
            }

            let solutionText = description || "";
            let fileUrl = null;
            if (file) {
                solutionText += `\n[Прикреплен файл: ${file.originalname}]`;
                fileUrl = `/uploads/${file.filename}`;
            }

            await db.query(
                `UPDATE applications SET full_test_solution_url = $1, status = 'reviewing' WHERE id = $2`,
                [fileUrl, application.id]
            );

            // 1. Сообщение СТУДЕНТ -> РАБОТОДАТЕЛЬ (direct_messages)
            // ВАЖНО: передаем application.vacancy_id
            await db.query(
                `INSERT INTO direct_messages (sender_id, receiver_id, content, vacancy_id) 
                 VALUES ($1, $2, $3, $4)`,
                [student_id, employer_user_id, `✅ Я отправил решение тестового задания.\n${solutionText}`, application.vacancy_id]
            );

            // 2. Анализ ИИ
            console.log("⏳ AI analyzing solution...");
            const aiResult = await aiService.evaluateFinal(
                application.vacancy_title,
                application.ai_score || 0,
                application.ai_feedback || "",
                solutionText
            );
            console.log("✅ AI Verdict:", aiResult);

            let statusHeader = "❌ ОТКАЗ";
            let newStatus = 'rejected_final';

            if (aiResult.decision === 'INTERVIEW_RECOMMENDED' || aiResult.decision === 'HIRED') {
                statusHeader = "✅ РЕШЕНИЕ ПРИНЯТО";
                newStatus = 'interview_pending';
            }

            await db.query("UPDATE applications SET status = $1, final_verdict = $2 WHERE id = $3",
                [newStatus, aiResult.message, application.id]);

            // 3. Ответ ИИ (РАБОТОДАТЕЛЬ -> СТУДЕНТ) (direct_messages)
            const aiChatMessage = `
🤖 **РЕЗУЛЬТАТ ПРОВЕРКИ**

${aiResult.message}

**Статус:** ${statusHeader}
            `;

            await db.query(
                `INSERT INTO direct_messages (sender_id, receiver_id, content, vacancy_id) 
                 VALUES ($1, $2, $3, $4)`,
                [employer_user_id, student_id, aiChatMessage, application.vacancy_id]
            );

            res.json(aiResult);

        } catch (e) {
            console.error("Submit Solution Error:", e);
            res.status(500).json({ message: "Ошибка обработки решения" });
        }
    }

    // Вспомогательные методы
    async getMyApplications(req, res) {
        try {
            const userId = req.user.id;
            const gradRes = await db.query('SELECT id FROM graduates WHERE user_id = $1', [userId]);
            if (gradRes.rows.length === 0) return res.json([]);
            const graduateId = gradRes.rows[0].id;
            const applications = await db.query(`
                SELECT a.*, v.title as vacancy_title, v.salary_min, c.name as company_name, c.logo_url as company_logo
                FROM applications a JOIN vacancies v ON a.vacancy_id = v.id JOIN companies c ON v.company_id = c.id
                WHERE a.graduate_id = $1 ORDER BY a.created_at DESC
            `, [graduateId]);
            res.json(applications.rows);
        } catch (e) { res.status(500).json({ message: "Ошибка" }); }
    }

    async cancelApplication(req, res) {
        try {
            const userId = req.user.id;
            const { application_id } = req.body;
            await db.query(`DELETE FROM applications USING graduates WHERE applications.graduate_id = graduates.id AND applications.id = $1 AND graduates.user_id = $2 AND applications.status = 'pending_test'`, [application_id, userId]);
            res.json({ message: 'Отменено' });
        } catch (e) { res.status(500).json({ message: 'Ошибка' }); }
    }

    async rejectApplication(req, res) { /* ... */ res.json({}); }

    // Получить отклики для работодателя
    // Получить отклики для работодателя
    async getEmployerApplications(req, res) {
        try {
            const userId = req.user.id;

            // 1. Получаем ID компании рекрутера
            const compRes = await db.query('SELECT id FROM companies WHERE user_id = $1', [userId]);
            if (compRes.rows.length === 0) return res.json([]);

            const companyId = compRes.rows[0].id;

            // 2. Исправленный SQL запрос
            const applications = await db.query(`
                SELECT 
                    a.id,
                    a.status,
                    a.ai_score,
                    a.ai_feedback,       -- Результат блица
                    a.cover_letter,
                    a.created_at,
                    a.vacancy_id,
                    
                    -- Данные для чата и связи берем из USERS (u)
                    u.id as student_user_id,
                    u.email,
                    
                    -- Личные данные берем из GRADUATES (g) -- ИСПРАВЛЕНО ЗДЕСЬ
                    g.first_name,
                    g.last_name,
                    g.avatar_url,
                    g.about_me,
                    g.phone,
                    g.city,
                    g.portfolio_links,
                    
                    -- Данные вакансии
                    v.title as vacancy_title,

                    -- Подтягиваем дату интервью (последнее назначенное)
                    (SELECT scheduled_at FROM interviews i 
                     WHERE i.vacancy_id = a.vacancy_id AND i.student_id = a.graduate_id 
                     ORDER BY i.created_at DESC LIMIT 1) as interview_date
                    
                FROM applications a
                JOIN vacancies v ON a.vacancy_id = v.id
                JOIN graduates g ON a.graduate_id = g.id
                JOIN users u ON g.user_id = u.id
                WHERE v.company_id = $1
                ORDER BY a.created_at DESC
            `, [companyId]);

            res.json(applications.rows);

        } catch (e) {
            console.error("Get Employer Apps Error:", e);
            res.status(500).json({ message: "Ошибка получения откликов" });
        }
    }
    async updateStatus(req, res) {
        const { id } = req.params;
        const { status, reason } = req.body;

        try {
            // 1. Обновляем статус
            const result = await db.query(
                'UPDATE applications SET status = $1, reject_reason = $2 WHERE id = $3 RETURNING *',
                [status, reason || null, id]
            );

            if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
            const app = result.rows[0];

            // 2. Получаем user_id студента для уведомления
            const studentRes = await db.query(
                `SELECT u.id FROM users u 
                 JOIN graduates g ON g.user_id = u.id 
                 WHERE g.id = $1`,
                [app.graduate_id]
            );
            const studentUserId = studentRes.rows[0].id;

            // 3. Формируем текст уведомления
            let title = 'Статус отклика изменен';
            let message = `Ваш отклик переведен в статус: ${status}`;

            if (status === 'interview') {
                title = 'Приглашение на интервью';
                message = 'Работодатель назначил вам интервью! Проверьте сообщения.';
            } else if (status === 'offer') {
                title = '🎉 ОФФЕР!';
                message = 'Поздравляем! Вам сделали предложение о работе.';
            } else if (status === 'rejected' || status === 'employer_rejected') {
                title = 'Отказ по вакансии';
                message = 'К сожалению, работодатель отклонил вашу кандидатуру.';
            }

            // 4. Отправляем уведомление в БД
            await db.query(
                `INSERT INTO notifications (user_id, title, message, type, is_read)
                 VALUES ($1, $2, $3, 'info', false)`,
                [studentUserId, title, message]
            );

            res.json({ message: 'Status updated', application: app });
        } catch (e) {
            console.error(e);
            res.status(500).json({ error: 'Server error' });
        }
    }

}

module.exports = new ApplicationController();