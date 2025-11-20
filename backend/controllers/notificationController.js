const db = require('../db');

class NotificationController {
    // Получить мои уведомления
    async getMyNotifications(req, res) {
        try {
            const userId = req.user.id;
            const notes = await db.query(
                'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC',
                [userId]
            );
            res.json(notes.rows);
        } catch (e) {
            console.error(e);
            res.status(500).json({ message: 'Ошибка получения уведомлений' });
        }
    }

    // Пометить как прочитанное
    async markRead(req, res) {
        try {
            const { id } = req.body;
            await db.query('UPDATE notifications SET is_read = true WHERE id = $1', [id]);
            res.json({ success: true });
        } catch (e) {
            console.error(e);
            res.status(500).json({ message: 'Ошибка обновления статуса' });
        }
    }
}

module.exports = new NotificationController();