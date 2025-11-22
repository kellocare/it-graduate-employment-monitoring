const db = require('../db');
const aiService = require('../services/aiService');

class TestController {

    // --- ВАЖНО: КОНСТРУКТОР ДЛЯ ПРИВЯЗКИ КОНТЕКСТА ---
    constructor() {
        this.assignTask = this.assignTask.bind(this);
        this.submitSolution = this.submitSolution.bind(this);
        this.processVerdict = this.processVerdict.bind(this);
    }
    // --------------------------------------------------

    // Назначить задание (вызывается автоматически)
    async assignTask(employerId, studentId, vacancyId) {
        try {
            // 1. Ищем заявку
            let appQuery = `
                SELECT a.id, v.title, v.description, v.id as vacancy_id
                FROM applications a
                JOIN vacancies v ON a.vacancy_id = v.id
                WHERE a.graduate_id = (SELECT id FROM graduates WHERE user_id = $1)
            `;
            const params = [studentId];

            if (vacancyId) {
                appQuery += ` AND v.id = $2`;
                params.push(vacancyId);
            } else {
                appQuery += ` AND v.company_id = (SELECT id FROM companies WHERE user_id = $2) ORDER BY a.created_at DESC LIMIT 1`;
                params.push(employerId);
            }

            const appRes = await db.query(appQuery, params);

            if (appRes.rows.length === 0) return;
            const app = appRes.rows[0];

            // 2. Генерируем задание
            const taskMarkdown = await aiService.generateComplexTask(app.title, app.description);

            // 3. Сохраняем
            await db.query(
                `UPDATE applications 
                 SET full_test_task = $1, hiring_status = 'test_assigned' 
                 WHERE id = $2`,
                [taskMarkdown, app.id]
            );

            // 4. Отправляем в чат
            const msg = `📄 **АВТОМАТИЧЕСКОЕ ТЕСТОВОЕ ЗАДАНИЕ**\n\n${taskMarkdown}\n\n⚠️ *Чтобы отправить решение, нажмите кнопку "📎 Сдать решение" вверху чата.*`;

            await db.query(
                `INSERT INTO direct_messages (sender_id, receiver_id, content, vacancy_id) 
                 VALUES ($1, $2, $3, $4)`,
                [employerId, studentId, msg, app.vacancy_id]
            );

        } catch (e) {
            console.error("Error assigning task:", e);
        }
    }

    // Студент загружает решение
    async submitSolution(req, res) {
        try {
            const studentUserId = req.user.id;
            const { employer_user_id, description } = req.body;
            const file = req.file;

            if (!file && !description) return res.status(400).json({message: 'Прикрепите файл или описание'});

            const appRes = await db.query(`
                SELECT a.*, v.title, v.id as vacancy_id
                FROM applications a
                JOIN vacancies v ON a.vacancy_id = v.id
                JOIN companies c ON v.company_id = c.id
                WHERE a.graduate_id = (SELECT id FROM graduates WHERE user_id = $1)
                AND c.user_id = $2
                ORDER BY a.created_at DESC LIMIT 1
            `, [studentUserId, employer_user_id]);

            const app = appRes.rows[0];
            if (!app) return res.status(404).json({message: 'Активная заявка не найдена'});

            const fileUrl = file ? `/uploads/${file.filename}` : null;

            // Обновляем статус
            await db.query(
                `UPDATE applications 
                 SET full_test_solution_url = $1, hiring_status = 'reviewing' 
                 WHERE id = $2`,
                [fileUrl, app.id]
            );

            // Пишем в чат от имени студента
            const confirmMsg = `✅ **Решение отправлено на проверку ИИ**\n\nКомментарий: ${description || 'Файл прикреплен'}`;
            await db.query(
                `INSERT INTO direct_messages (sender_id, receiver_id, content, vacancy_id) 
                 VALUES ($1, $2, $3, $4)`,
                [studentUserId, employer_user_id, confirmMsg, app.vacancy_id]
            );

            // Отправляем ответ клиенту СРАЗУ, чтобы интерфейс разблокировался
            res.json({ message: 'Решение отправлено. ИИ начал проверку.' });

            // ЗАПУСКАЕМ АНАЛИЗ (Асинхронно, после ответа)
            // Теперь this.processVerdict сработает, так как мы добавили bind в конструкторе
            this.processVerdict(app, app.title, description || "Файл с решением", studentUserId, employer_user_id);

        } catch (e) {
            console.error(e);
            // Если ответ еще не ушел, отправляем ошибку
            if (!res.headersSent) res.status(500).json({ message: 'Ошибка загрузки' });
        }
    }

    // Внутренний метод проверки
    async processVerdict(app, vacancyTitle, solutionDesc, studentId, employerId) {
        try {
            console.log("AI Verdict Processing Started...");

            const result = await aiService.evaluateFinal(vacancyTitle, app.ai_score, app.ai_feedback, solutionDesc);

            console.log("AI Verdict Result:", result);

            const status = result.decision === 'HIRED' ? 'hired' : 'rejected_final';

            await db.query(
                'UPDATE applications SET final_verdict = $1, hiring_status = $2 WHERE id = $3',
                [result.message, status, app.id]
            );

            const verdictMsg = `🤖 **РЕЗУЛЬТАТ ПРОВЕРКИ ЗАДАНИЯ**\n\n${result.message}\n\nСтатус: ${status === 'hired' ? '✅ ВЫ ПРИНЯТЫ!' : '❌ ОТКАЗ'}`;

            await db.query(
                `INSERT INTO direct_messages (sender_id, receiver_id, content, vacancy_id) 
                 VALUES ($1, $2, $3, $4)`,
                [employerId, studentId, verdictMsg, app.vacancy_id]
            );

        } catch (e) {
            console.error("Verdict Error:", e);
        }
    }
}

module.exports = new TestController();