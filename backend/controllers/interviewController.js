const db = require('../db');
const mailService = require('../services/mailService');

class InterviewController {
    async schedule(req, res) {
        try {
            // student_id приходит с фронта как user_id (из users)
            const { student_id, vacancy_id, date, link } = req.body;
            const employer_id = req.user.id;

            // 1. Получаем необходимые данные одним запросом:
            // - email и имя студента (для почты)
            // - graduate_id (для связей в БД)
            // - название вакансии (для красивого уведомления)
            const dataRes = await db.query(`
                SELECT 
                    u.email, 
                    g.first_name, 
                    g.id as graduate_id,
                    v.title as vacancy_title
                FROM users u
                JOIN graduates g ON u.id = g.user_id
                JOIN vacancies v ON v.id = $2
                WHERE u.id = $1
            `, [student_id, vacancy_id]);

            if (dataRes.rows.length === 0) {
                return res.status(404).json({ message: 'Студент или вакансия не найдены' });
            }

            const { email, first_name, graduate_id, vacancy_title } = dataRes.rows[0];

            // 2. Сохраняем встречу в БД
            // Привязываем к graduate_id (так как таблица interviews обычно ссылается на graduates)
            await db.query(
                `INSERT INTO interviews (employer_id, student_id, vacancy_id, scheduled_at, meeting_link)
                 VALUES ($1, $2, $3, $4, $5)`,
                [employer_id, graduate_id, vacancy_id, date, link]
            );

            // 3. Обновляем статус заявки на 'interview'
            // Это нужно, чтобы карточка переехала в колонку "Интервью" на Канбане
            await db.query(
                `UPDATE applications 
                 SET status = 'interview' 
                 WHERE graduate_id = $1 AND vacancy_id = $2`,
                [graduate_id, vacancy_id]
            );

            // 4. Отправляем Email (обернуто в try, чтобы не крашить запрос при ошибке почты)
            try {
                const formattedDate = new Date(date).toLocaleString('ru-RU', {
                    day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
                });

                await mailService.sendInterviewInvite(
                    email,
                    formattedDate,
                    link,
                    first_name || 'Кандидат'
                );
            } catch (mailError) {
                console.error("Mail sending failed:", mailError);
            }

            // 5. Отправляем системное уведомление (в колокольчик)
            const notifMessage = `Вам назначено техническое интервью по вакансии "${vacancy_title}".\nДата: ${new Date(date).toLocaleString('ru-RU')}.\nСсылка в сообщениях.`;

            await db.query(
                `INSERT INTO notifications (user_id, title, message, type, is_read)
                 VALUES ($1, $2, $3, 'info', false)`,
                [student_id, 'Приглашение на интервью', notifMessage]
            );

            res.json({ message: 'Интервью успешно назначено' });

        } catch (e) {
            console.error("Interview Schedule Error:", e);
            res.status(500).json({ message: 'Ошибка планирования интервью' });
        }
    }
}

module.exports = new InterviewController();