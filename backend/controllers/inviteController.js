const db = require('../db');

class InviteController {

    // Работодатель отправляет приглашение
    // (Переносим логику из candidateController сюда и улучшаем)
    async sendInvite(req, res) {
        try {
            const senderId = req.user.id;
            const { candidate_user_id, message } = req.body;

            // 1. Создаем запись в invitations
            await db.query(
                `INSERT INTO invitations (employer_user_id, student_user_id, status) 
                 VALUES ($1, $2, 'pending')
                 ON CONFLICT (employer_user_id, student_user_id) 
                 DO UPDATE SET status = 'pending'`, // Если уже было - обновляем
                [senderId, candidate_user_id]
            );

            // 2. Узнаем название компании
            const compRes = await db.query('SELECT name FROM companies WHERE user_id = $1', [senderId]);
            const companyName = compRes.rows[0]?.name || 'Работодатель';

            // 3. Отправляем уведомление студенту
            await db.query(
                `INSERT INTO notifications (user_id, sender_id, title, message, type) 
                 VALUES ($1, $2, $3, $4, 'invite')`,
                [candidate_user_id, senderId, `Приглашение от ${companyName}`, message]
            );

            res.json({ message: 'Приглашение отправлено' });
        } catch (e) {
            console.error(e);
            res.status(500).json({ message: 'Ошибка отправки' });
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
                // ЕСЛИ ПРИНЯЛ:
                // а) Шлем уведомление работодателю
                await db.query(
                    `INSERT INTO notifications (user_id, sender_id, title, message, type) 
                     VALUES ($1, $2, $3, $4, 'success')`,
                    [employer_id, studentId, 'Приглашение принято! 🎉', `${studentName} принял ваше приглашение. Чат создан.`]
                );

                // б) Создаем первое сообщение в чате (Техническое, чтобы диалог появился)
                await db.query(
                    `INSERT INTO direct_messages (sender_id, receiver_id, content) 
                     VALUES ($1, $2, 'Здравствуйте! Я принял ваше приглашение. Готов обсудить детали.')`,
                    [studentId, employer_id]
                );

            } else {
                // ЕСЛИ ОТКЛОНИЛ:
                await db.query(
                    `INSERT INTO notifications (user_id, sender_id, title, message, type) 
                     VALUES ($1, $2, $3, $4, 'error')`,
                    [employer_id, studentId, 'Отказ', `${studentName} отклонил ваше приглашение.`]
                );
            }

            res.json({ message: 'Ответ отправлен' });

        } catch (e) {
            console.error(e);
            res.status(500).json({ message: 'Ошибка ответа' });
        }
    }
}

module.exports = new InviteController();