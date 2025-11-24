const db = require('../db');
const aiService = require('../services/aiService');

class TestController {

    constructor() {
        this.assignTask = this.assignTask.bind(this);
        this.submitSolution = this.submitSolution.bind(this);
        this.processVerdict = this.processVerdict.bind(this);
    }

    // Назначить задание
    async assignTask(employerId, studentId, vacancyId) {
        try {
            const appRes = await db.query(`
                SELECT a.id, v.title, v.description, v.id as vacancy_id
                FROM applications a
                JOIN vacancies v ON a.vacancy_id = v.id
                JOIN graduates g ON a.graduate_id = g.id
                WHERE g.user_id = $1 AND v.id = $2
                LIMIT 1
            `, [studentId, vacancyId]);

            if (appRes.rows.length === 0) return;
            const app = appRes.rows[0];

            const taskMarkdown = await aiService.generateComplexTask(app.title, app.description);

            await db.query(
                `UPDATE applications SET full_test_task = $1, status = 'test_assigned' WHERE id = $2`,
                [taskMarkdown, app.id]
            );

            const msg = `
📋 **ТЕХНИЧЕСКОЕ ЗАДАНИЕ**

${taskMarkdown}

---
⚠️ **Инструкция:**
1. Выполните задание.
2. Нажмите кнопку **"Сдать решение"** (скрепка) вверху чата.
            `;

            // ИСПОЛЬЗУЕМ direct_messages
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
                SELECT a.*, v.title, v.id as vacancy_id, a.ai_score, a.ai_feedback
                FROM applications a
                JOIN vacancies v ON a.vacancy_id = v.id
                JOIN companies c ON v.company_id = c.id
                JOIN graduates g ON a.graduate_id = g.id
                WHERE g.user_id = $1 AND c.user_id = $2
                ORDER BY a.created_at DESC LIMIT 1
            `, [studentUserId, employer_user_id]);

            const app = appRes.rows[0];
            if (!app) return res.status(404).json({message: 'Активная заявка не найдена'});

            const fileUrl = file ? `/uploads/${file.filename}` : null;

            await db.query(
                `UPDATE applications SET full_test_solution_url = $1, status = 'reviewing' WHERE id = $2`,
                [fileUrl, app.id]
            );

            const confirmMsg = `✅ **Решение отправлено на проверку ИИ**\n\nКомментарий: ${description || ''}\n${file ? '[Файл прикреплен]' : ''}`;

            // ИСПОЛЬЗУЕМ direct_messages
            await db.query(
                `INSERT INTO direct_messages (sender_id, receiver_id, content, vacancy_id) 
                 VALUES ($1, $2, $3, $4)`,
                [studentUserId, employer_user_id, confirmMsg, app.vacancy_id]
            );

            res.json({ message: 'Решение отправлено. ИИ начал проверку.' });

            const fullDesc = (description || "") + (file ? `\n[Файл: ${file.filename}]` : "");
            this.processVerdict(app, app.title, fullDesc, studentUserId, employer_user_id);

        } catch (e) {
            console.error(e);
            if (!res.headersSent) res.status(500).json({ message: 'Ошибка загрузки' });
        }
    }

    // Внутренний метод
    async processVerdict(app, vacancyTitle, solutionDesc, studentId, employerId) {
        try {
            const result = await aiService.evaluateFinal(vacancyTitle, app.ai_score || 0, app.ai_feedback || "", solutionDesc);

            let status = 'rejected_final';
            let statusHeader = "❌ ОТКАЗ";

            if (result.decision === 'INTERVIEW_RECOMMENDED' || result.decision === 'HIRED') {
                status = 'interview_pending';
                statusHeader = "✅ РЕШЕНИЕ ПРИНЯТО";
            }

            await db.query(
                'UPDATE applications SET final_verdict = $1, status = $2 WHERE id = $3',
                [result.message, status, app.id]
            );

            const verdictMsg = `
🤖 **РЕЗУЛЬТАТ ПРОВЕРКИ ЗАДАНИЯ**

${result.message}

**Статус:** ${statusHeader}
            `;

            // ИСПОЛЬЗУЕМ direct_messages
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