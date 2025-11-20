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

            // 2. Получаем список вакансий (контекст рынка)
            const vacanciesRes = await db.query(`
                SELECT v.id, v.title, c.name as company, v.salary_min, v.description 
                FROM vacancies v
                JOIN companies c ON v.company_id = c.id
            `);

            const vacanciesList = vacanciesRes.rows.map(v =>
                `- ID ${v.id}: "${v.title}" в "${v.company}" (${v.salary_min ? 'от ' + v.salary_min : 'з/п не указана'}). Описание: ${v.description.substring(0, 150)}...`
            ).join('\n');
            const vacanciesContext = vacanciesList.length > 0 ? vacanciesList : "В данный момент вакансий нет.";

            // 3. --- НОВОЕ: Получаем профиль студента (контекст личности) ---
            const gradRes = await db.query(`
                SELECT g.first_name, g.last_name, g.about_me, g.portfolio_links, s.name as specialty_name
                FROM graduates g
                LEFT JOIN specialties s ON g.specialty_id = s.id
                WHERE g.user_id = $1
            `, [userId]);

            const student = gradRes.rows[0];
            let studentInfo = "Данные о студенте не заполнены.";

            if (student) {
                // Формируем читаемый текст для ИИ
                studentInfo = `Имя: ${student.first_name} ${student.last_name}\n`;
                studentInfo += `Специальность: ${student.specialty_name || 'Не указана'}\n`;
                studentInfo += `О себе (навыки, опыт): "${student.about_me || 'Не заполнено'}"\n`;

                // Добавляем типы ссылок из портфолио (например, есть ли GitHub)
                if (student.portfolio_links && Array.isArray(student.portfolio_links)) {
                    const links = student.portfolio_links.map(l => l.type).join(', ');
                    if (links) studentInfo += `Портфолио содержит ссылки на: ${links}`;
                }
            }

            // 4. Получаем историю переписки
            const historyRes = await db.query(
                'SELECT role, content FROM chat_messages WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10',
                [userId]
            );
            const recentHistory = historyRes.rows.reverse();

            // 5. Собираем СУПЕР-ПРОМПТ
            const messagesForAi = [
                {
                    role: "system",
                    content: `Ты — карьерный консультант.
                    
                    ИНФОРМАЦИЯ О СТУДЕНТЕ, С КОТОРЫМ ТЫ ОБЩАЕШЬСЯ:
                    ${studentInfo}
                    
                    СПИСОК ДОСТУПНЫХ ВАКАНСИЙ:
                    ${vacanciesContext}
                    
                    Твоя задача:
                    1. Используй информацию "О себе" студента, чтобы сразу предлагать релевантные вещи. Не спрашивай то, что уже написано в профиле (например, если он написал "Знаю Python", не спрашивай "Какой язык ты знаешь?").
                    2. Если студент не заполнил поле "О себе", вежливо попроси рассказать о навыках.
                    3. Рекомендуй вакансии из списка выше, если они подходят.
                    
                    Будь краток, полезен и профессионален.`
                },
                ...recentHistory.map(msg => ({ role: msg.role, content: msg.content }))
            ];

            // 6. Спрашиваем ИИ
            const aiAnswer = await aiService.getCompletion(messagesForAi);

            // 7. Сохраняем ответ
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