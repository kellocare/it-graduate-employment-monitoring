const db = require('../db');
const mailService = require('../services/mailService');

class InterviewController {
    async schedule(req, res) {
        try {
            const { student_id, vacancy_id, date, link } = req.body;
            const employer_id = req.user.id; // Тот, кто назначает (работодатель)

            // 1. Сохраняем встречу в БД
            await db.query(
                `INSERT INTO interviews (employer_id, student_id, vacancy_id, scheduled_at, meeting_link)
                 VALUES ($1, $2, $3, $4, $5)`,
                [employer_id, student_id, vacancy_id, date, link]
            );

            // 2. Получаем email (из users) и имя (из graduates)
            const studentRes = await db.query(`
                SELECT u.email, g.first_name 
                FROM users u
                LEFT JOIN graduates g ON u.id = g.user_id
                WHERE u.id = $1
            `, [student_id]);

            const student = studentRes.rows[0];

            // 3. Отправляем письмо
            if (student) {
                await mailService.sendInterviewInvite(
                    student.email,
                    date,
                    link,
                    student.first_name || 'Кандидат'
                );
            }

            // 4. Обновляем статус заявки
            // ВАЖНО: В таблице applications ссылка идет через graduate_id, а не user_id.
            // Делаем подзапрос, чтобы найти graduate_id по user_id.
            await db.query(
                `UPDATE applications 
                 SET status = 'interview_scheduled' 
                 WHERE graduate_id = (SELECT id FROM graduates WHERE user_id = $1) 
                 AND vacancy_id = $2`,
                [student_id, vacancy_id]
            );

            res.json({ message: 'Интервью назначено' });

        } catch (e) {
            console.error("Interview Schedule Error:", e);
            res.status(500).json({ message: 'Ошибка планирования' });
        }
    }
}

module.exports = new InterviewController();