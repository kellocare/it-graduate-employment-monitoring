const db = require('../db');

class MessagesController {

    // Получить список собеседников (с кем есть переписка)
    async getConversations(req, res) {
        try {
            const userId = req.user.id;

            // Хитрый запрос: ищем уникальных людей, с кем общались, и последнее сообщение
            const query = `
                SELECT DISTINCT ON (u.id) 
                    u.id as user_id, u.email, 
                    COALESCE(c.name, g.first_name || ' ' || g.last_name) as name,
                    g.avatar_url,
                    dm.content as last_message,
                    dm.created_at
                FROM users u
                JOIN direct_messages dm ON (dm.sender_id = u.id AND dm.receiver_id = $1) 
                                        OR (dm.receiver_id = u.id AND dm.sender_id = $1)
                LEFT JOIN graduates g ON u.id = g.user_id
                LEFT JOIN companies c ON u.id = c.user_id
                ORDER BY u.id, dm.created_at DESC
            `;

            const result = await db.query(query, [userId]);

            // Сортируем по дате сообщения (сверху новые)
            const sorted = result.rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

            res.json(sorted);
        } catch (e) {
            console.error(e);
            res.status(500).json({ message: 'Ошибка загрузки чатов' });
        }
    }

    // Получить сообщения с конкретным пользователем
    async getMessages(req, res) {
        try {
            const userId = req.user.id;
            const { partner_id } = req.params;

            const msgs = await db.query(
                `SELECT * FROM direct_messages 
                 WHERE (sender_id = $1 AND receiver_id = $2) 
                    OR (sender_id = $2 AND receiver_id = $1)
                 ORDER BY created_at ASC`,
                [userId, partner_id]
            );

            res.json(msgs.rows);
        } catch (e) {
            res.status(500).json({ message: 'Ошибка сообщений' });
        }
    }

    // Отправить сообщение
    async sendMessage(req, res) {
        try {
            const senderId = req.user.id;
            const { receiver_id, content } = req.body;

            const newMsg = await db.query(
                `INSERT INTO direct_messages (sender_id, receiver_id, content) VALUES ($1, $2, $3) RETURNING *`,
                [senderId, receiver_id, content]
            );
            res.json(newMsg.rows[0]);
        } catch (e) {
            res.status(500).json({ message: 'Ошибка отправки' });
        }
    }

    async getUnreadCount(req, res) {
        try {
            const userId = req.user.id;
            const result = await db.query(
                'SELECT COUNT(*) FROM direct_messages WHERE receiver_id = $1 AND is_read = FALSE',
                [userId]
            );
            res.json({ count: parseInt(result.rows[0].count) });
        } catch (e) {
            console.error(e);
            res.status(500).json({ count: 0 });
        }
    }
}

module.exports = new MessagesController();