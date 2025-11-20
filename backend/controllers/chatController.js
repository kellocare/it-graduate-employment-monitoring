const db = require('../db');
const aiService = require('../services/aiService');

class ChatController {

    // Получить историю переписки
    async getHistory(req, res) {
        try {
            const userId = req.user.id;
            const history = await db.query(
                'SELECT role, content, created_at FROM chat_messages WHERE user_id = $1 ORDER BY created_at ASC',
                [userId]
            );
            res.json(history.rows);
        } catch (e) {
            console.error(e);
            res.status(500).json({ message: 'Ошибка получения истории' });
        }
    }

    // Отправить сообщение
    async sendMessage(req, res) {
        try {
            const userId = req.user.id;
            const { message } = req.body;

            // 1. Сохраняем сообщение пользователя
            await db.query(
                'INSERT INTO chat_messages (user_id, role, content) VALUES ($1, $2, $3)',
                [userId, 'user', message]
            );

            // 2. Получаем список вакансий
            const vacanciesRes = await db.query(`
                SELECT v.id, v.title, c.name as company, v.salary_min, v.description 
                FROM vacancies v
                JOIN companies c ON v.company_id = c.id
            `);

            // Формируем контекст. Если вакансий нет, пишем "Список пуст".
            const vacanciesList = vacanciesRes.rows.map(v =>
                `- ID ${v.id}: "${v.title}" в компании "${v.company}" (Стек из описания: ${v.description.substring(0, 100)}...)`
            ).join('\n');

            const vacanciesContext = vacanciesList.length > 0 ? vacanciesList : "В данный момент вакансий нет.";

            // 3. Получаем историю
            const historyRes = await db.query(
                'SELECT role, content FROM chat_messages WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10',
                [userId]
            );
            const recentHistory = historyRes.rows.reverse();

            // 4. СОБИРАЕМ УЛУЧШЕННЫЙ ПРОМПТ
            const messagesForAi = [
                {
                    role: "system",
                    content: `Ты — карьерный консультант в IT-вузе.
                    
                    ВОТ СПИСОК РЕАЛЬНЫХ ВАКАНСИЙ НА НАШЕМ САЙТЕ:
                    ${vacanciesContext}
                    
                    Твоя стратегия:
                    1. Проанализируй навыки и интересы студента.
                    2. Поищи в списке выше вакансию, которая ему подходит.
                    
                    ПРАВИЛА ПОВЕДЕНИЯ:
                    - Если нашел совпадение: Рекомендуй эту вакансию, укажи её ID и Название. Объясни, почему она подходит.
                    - Если ПОДХОДЯЩЕЙ ВАКАНСИИ НЕТ (или список пуст):
                      а) Честно скажи: "К сожалению, прямо сейчас в нашей базе нет вакансий под твой профиль".
                      б) НЕ ПРЕДЛАГАЙ вакансии, которые не подходят (не предлагай Python-разработчику идти в HR).
                      в) Вместо этого расскажи, кем обычно работают люди с такими навыками (примеры должностей в индустрии).
                      г) Посоветуй следить за обновлениями на сайте ("Мониторь раздел Вакансии").
                    
                    Будь вежлив, краток и поддерживай студента.`
                },
                ...recentHistory.map(msg => ({ role: msg.role, content: msg.content }))
            ];

            // 5. Спрашиваем ИИ
            const aiAnswer = await aiService.getCompletion(messagesForAi);

            // 6. Сохраняем ответ
            const savedAiMsg = await db.query(
                'INSERT INTO chat_messages (user_id, role, content) VALUES ($1, $2, $3) RETURNING *',
                [userId, 'assistant', aiAnswer]
            );

            res.json(savedAiMsg.rows[0]);

        } catch (e) {
            console.error(e);
            res.status(500).json({ message: 'Ошибка чата' });
        }
    }

    // Очистить историю (начать сначала)
    async clearHistory(req, res) {
        try {
            const userId = req.user.id;
            await db.query('DELETE FROM chat_messages WHERE user_id = $1', [userId]);
            res.json({ message: 'История очищена' });
        } catch (e) {
            res.status(500).json({ message: 'Ошибка' });
        }
    }
}

module.exports = new ChatController();