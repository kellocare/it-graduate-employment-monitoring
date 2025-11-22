const db = require('../db');
const testController = require('./testController'); // Импорт для запуска авто-теста

class InviteController {

    // Работодатель отправляет приглашение
    async sendInvite(req, res) {
        try {
            const senderId = req.user.id;
            const { candidate_user_id, message, vacancy_id } = req.body; // <-- Получаем ID вакансии

            // 1. Узнаем название компании
            const compRes = await db.query('SELECT name FROM companies WHERE user_id = $1', [senderId]);
            const companyName = compRes.rows[0]?.name || 'Работодатель';

            // 2. Узнаем название вакансии (для красивого уведомления)
            let vacancyTitle = "";
            if (vacancy_id) {
                const vacRes = await db.query('SELECT title FROM vacancies WHERE id = $1', [vacancy_id]);
                if (vacRes.rows.length > 0) {
                    vacancyTitle = `на вакансию "${vacRes.rows[0].title}"`;
                }
            }

            // 3. Создаем/Обновляем запись в invitations с указанием vacancy_id
            await db.query(
                `INSERT INTO invitations (employer_user_id, student_user_id, status, vacancy_id) 
                 VALUES ($1, $2, 'pending', $3)
                 ON CONFLICT (employer_user_id, student_user_id) 
                 DO UPDATE SET status = 'pending', vacancy_id = $3, created_at = CURRENT_TIMESTAMP`,
                [senderId, candidate_user_id, vacancy_id]
            );

            // 4. Отправляем уведомление студенту
            await db.query(
                `INSERT INTO notifications (user_id, sender_id, title, message, type) 
                 VALUES ($1, $2, $3, $4, 'invite')`,
                [candidate_user_id, senderId, `Приглашение от ${companyName}`, `${message} (${vacancyTitle})`]
            );

            res.json({ message: 'Приглашение отправлено' });
        } catch (e) {
            console.error(e);
            res.status(500).json({ message: 'Ошибка отправки приглашения' });
        }
    }

    // Студент отвечает на приглашение
    async respondToInvite(req, res) {
        try {
            const studentId = req.user.id;
            const { notification_id, employer_id, status } = req.body; // status: 'accepted' или 'declined'

            // 1. Обновляем статус в invitations
            await db.query(
                `UPDATE invitations SET status = $1 
                 WHERE employer_user_id = $2 AND student_user_id = $3`,
                [status, employer_id, studentId]
            );

            // 2. Помечаем уведомление как прочитанное
            if (notification_id) {
                await db.query('UPDATE notifications SET is_read = true WHERE id = $1', [notification_id]);
            }

            // 3. Получаем имя студента
            const studRes = await db.query('SELECT first_name, last_name FROM graduates WHERE user_id = $1', [studentId]);
            const studentName = studRes.rows[0] ? `${studRes.rows[0].first_name} ${studRes.rows[0].last_name}` : 'Студент';

            if (status === 'accepted') {
                // === ЕСЛИ ПРИНЯЛ ===

                // а) Узнаем vacancy_id из приглашения, чтобы связать чат
                const inviteRes = await db.query(
                    'SELECT vacancy_id FROM invitations WHERE employer_user_id = $1 AND student_user_id = $2',
                    [employer_id, studentId]
                );
                const vacancyId = inviteRes.rows[0]?.vacancy_id;

                // б) Шлем уведомление работодателю
                await db.query(
                    `INSERT INTO notifications (user_id, sender_id, title, message, type) 
                     VALUES ($1, $2, $3, $4, 'success')`,
                    [employer_id, studentId, 'Приглашение принято! 🎉', `${studentName} принял ваше приглашение. Чат создан.`]
                );

                // в) Создаем первое сообщение в чате с привязкой к вакансии
                await db.query(
                    `INSERT INTO direct_messages (sender_id, receiver_id, content, vacancy_id) 
                     VALUES ($1, $2, 'Здравствуйте! Я принял ваше приглашение. Готов обсудить детали.', $3)`,
                    [studentId, employer_id, vacancyId]
                );

                // г) Запускаем процесс автоматического тестирования (если есть вакансия)
                if (vacancyId) {
                    testController.assignTask(employer_id, studentId);
                }

            } else {
                // === ЕСЛИ ОТКЛОНИЛ ===
                await db.query(
                    `INSERT INTO notifications (user_id, sender_id, title, message, type) 
                     VALUES ($1, $2, $3, $4, 'error')`,
                    [employer_id, studentId, 'Отказ', `${studentName} отклонил ваше приглашение.`]
                );
            }

            res.json({ message: 'Ответ отправлен' });

        } catch (e) {
            console.error(e);
            res.status(500).json({ message: 'Ошибка ответа на приглашение' });
        }
    }
}

module.exports = new InviteController();