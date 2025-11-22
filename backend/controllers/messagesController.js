const db = require('../db');

class MessagesController {

    // Получить список диалогов
    async getConversations(req, res) {
        try {
            const userId = req.user.id;

            const query = `
                WITH my_messages AS (
                    SELECT 
                        id, sender_id, receiver_id, content, created_at, vacancy_id, is_read,
                        CASE 
                            WHEN sender_id = $1 THEN receiver_id 
                            ELSE sender_id 
                        END as partner_id
                    FROM direct_messages
                    WHERE sender_id = $1 OR receiver_id = $1
                ),
                latest_msg AS (
                    SELECT DISTINCT ON (partner_id, vacancy_id) 
                        partner_id, vacancy_id, content as last_message, created_at, is_read
                    FROM my_messages
                    ORDER BY partner_id, vacancy_id, created_at DESC
                )
                SELECT 
                    lm.partner_id as user_id,  -- <--- ИСПРАВЛЕНИЕ: ЯВНО НАЗЫВАЕМ user_id
                    lm.vacancy_id,
                    lm.last_message,
                    lm.created_at,
                    lm.is_read,
                    u.email,
                    COALESCE(c.name, g.first_name || ' ' || g.last_name) as name,
                    g.avatar_url,
                    v.title as vacancy_title
                FROM latest_msg lm
                JOIN users u ON lm.partner_id = u.id
                LEFT JOIN graduates g ON u.id = g.user_id
                LEFT JOIN companies c ON u.id = c.user_id
                LEFT JOIN vacancies v ON lm.vacancy_id = v.id
                ORDER BY lm.created_at DESC
            `;

            const result = await db.query(query, [userId]);
            res.json(result.rows);
        } catch (e) {
            console.error(e);
            res.status(500).json({ message: 'Ошибка загрузки чатов' });
        }
    }

    // Получить переписку
    async getMessages(req, res) {
        try {
            const userId = req.user.id;
            const { partner_id } = req.params;
            const { vacancy_id } = req.query;

            // ЗАЩИТА ОТ "UNDEFINED"
            if (!partner_id || partner_id === 'undefined') {
                return res.status(400).json({ message: 'Неверный ID собеседника' });
            }

            let query = `
                SELECT * FROM direct_messages 
                WHERE ((sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1))
            `;

            const params = [userId, partner_id];

            // Проверяем vacancy_id: он должен быть, и не должен быть строкой "undefined" или "null"
            if (vacancy_id && vacancy_id !== 'null' && vacancy_id !== 'undefined') {
                query += ` AND vacancy_id = $3`;
                params.push(vacancy_id);
            } else {
                query += ` AND vacancy_id IS NULL`;
            }

            query += ` ORDER BY created_at ASC`;

            const msgs = await db.query(query, params);

            // Помечаем прочитанными
            let updateQuery = `
                UPDATE direct_messages SET is_read = TRUE 
                WHERE sender_id = $1 AND receiver_id = $2 AND is_read = FALSE
            `;
            const updateParams = [partner_id, userId];

            if (vacancy_id && vacancy_id !== 'null' && vacancy_id !== 'undefined') {
                updateQuery += ` AND vacancy_id = $3`;
                updateParams.push(vacancy_id);
            } else {
                updateQuery += ` AND vacancy_id IS NULL`;
            }

            await db.query(updateQuery, updateParams);

            res.json(msgs.rows);
        } catch (e) {
            console.error(e);
            res.status(500).json({ message: 'Ошибка сообщений' });
        }
    }

    // Отправить сообщение
    async sendMessage(req, res) {
        try {
            const senderId = req.user.id;
            const { receiver_id, content, vacancy_id } = req.body;

            const newMsg = await db.query(
                `INSERT INTO direct_messages (sender_id, receiver_id, content, vacancy_id) 
                 VALUES ($1, $2, $3, $4) RETURNING *`,
                [senderId, receiver_id, content, vacancy_id || null]
            );
            res.json(newMsg.rows[0]);
        } catch (e) {
            console.error(e);
            res.status(500).json({ message: 'Ошибка отправки' });
        }
    }

    // Счетчик
    async getUnreadCount(req, res) {
        try {
            const userId = req.user.id;
            const result = await db.query(
                'SELECT COUNT(*) FROM direct_messages WHERE receiver_id = $1 AND is_read = FALSE',
                [userId]
            );
            res.json({ count: parseInt(result.rows[0].count) });
        } catch (e) {
            res.status(500).json({ count: 0 });
        }
    }
}

module.exports = new MessagesController();