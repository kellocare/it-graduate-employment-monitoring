const db = require('../db');
const aiService = require('../services/aiService');
const pdf = require('pdf-parse'); // Теперь это точно будет функция

class ChatController {

    async getHistory(req, res) {
        try {
            const userId = req.user.id;
            const history = await db.query(
                'SELECT role, content, created_at FROM chat_messages WHERE user_id = $1 ORDER BY created_at ASC LIMIT 50',
                [userId]
            );
            res.json(history.rows);
        } catch (e) {
            console.error(e);
            res.status(500).json({ message: 'Ошибка получения истории' });
        }
    }

    // --- МЕТОД ЗАГРУЗКИ PDF ---
    async uploadResume(req, res) {
        try {
            // Проверяем файл
            if (!req.file || !req.file.buffer) {
                return res.status(400).json({ message: 'Файл не загружен' });
            }

            const userId = req.user.id;
            const buffer = req.file.buffer;

            // 1. Парсим PDF (теперь это просто вызов функции)
            let extractedText = "";
            try {
                const data = await pdf(buffer);
                extractedText = data.text;
            } catch (pdfError) {
                console.error("Ошибка внутри pdf-parse:", pdfError);
                return res.status(500).json({ message: 'Не удалось прочитать PDF файл. Возможно, он поврежден.' });
            }

            // Проверяем, есть ли текст
            if (!extractedText || extractedText.trim().length < 5) {
                return res.status(400).json({ message: 'PDF пустой или состоит только из картинок (скан).' });
            }

            // 2. Формируем сообщение
            const userMessage = `[ПОЛЬЗОВАТЕЛЬ ЗАГРУЗИЛ PDF РЕЗЮМЕ]\n\nТекст из файла:\n${extractedText}`;

            // 3. Сохраняем сообщение пользователя в базу
            await db.query(
                'INSERT INTO chat_messages (user_id, role, content) VALUES ($1, $2, $3)',
                [userId, 'user', userMessage]
            );

            // 4. Готовим промпт для ИИ
            const systemPrompt = `Ты — профессиональный рекрутер и эксперт по резюме.
            Пользователь прислал текст своего резюме (распознанный из PDF).
            
            ТВОЯ ЗАДАЧА:
            1. Проанализируй структуру и содержание.
            2. Найди слабые места (отсутствие конкретики, ошибки стиля).
            3. Оцени резюме по шкале 1-10.
            4. Дай 3-4 конкретных совета, как улучшить резюме, чтобы пройти отбор в IT-компанию.
            
            Отвечай на русском языке. Используй Markdown (жирный шрифт, списки) для красивого оформления.`;

            // История (контекст)
            const historyRes = await db.query(
                'SELECT role, content FROM chat_messages WHERE user_id = $1 ORDER BY created_at DESC LIMIT 4',
                [userId]
            );
            const recentHistory = historyRes.rows.reverse();

            const messagesForAi = [
                { role: "system", content: systemPrompt },
                ...recentHistory.map(msg => ({ role: msg.role, content: msg.content }))
            ];

            // Запрос к ИИ
            const aiAnswer = await aiService.getCompletion(messagesForAi);

            // Сохраняем ответ ИИ
            const savedAiMsg = await db.query(
                'INSERT INTO chat_messages (user_id, role, content) VALUES ($1, $2, $3) RETURNING *',
                [userId, 'assistant', aiAnswer]
            );

            res.json(savedAiMsg.rows[0]);

        } catch (e) {
            console.error("Upload Error:", e);
            res.status(500).json({ message: 'Ошибка обработки файла' });
        }
    }

    // Обычная отправка сообщений
    async sendMessage(req, res) {
        try {
            const userId = req.user.id;
            const { message, mode } = req.body;
            const currentMode = mode || 'vacancy';

            // Сохраняем сообщение
            await db.query('INSERT INTO chat_messages (user_id, role, content) VALUES ($1, $2, $3)', [userId, 'user', message]);

            // Получаем данные студента
            const gradRes = await db.query(`
                SELECT g.first_name, g.last_name, g.about_me, g.portfolio_links, s.name as specialty_name
                FROM graduates g
                LEFT JOIN specialties s ON g.specialty_id = s.id
                WHERE g.user_id = $1
            `, [userId]);

            const student = gradRes.rows[0] || {};
            let studentInfo = `Имя: ${student.first_name} ${student.last_name}. О себе: ${student.about_me || 'Не заполнено'}`;

            // Выбираем режим
            let systemPrompt = "";
            if (currentMode === 'resume') {
                systemPrompt = `Ты — эксперт по резюме (CV Reviewer). 
                Данные студента: ${studentInfo}.
                Помогай улучшать резюме, критикуй конструктивно. Не предлагай вакансии в этом режиме.`;
            } else {
                const vacanciesRes = await db.query('SELECT id, title, description FROM vacancies ORDER BY created_at DESC LIMIT 20');
                const vacs = vacanciesRes.rows.map(v => `${v.title}: ${v.description.substring(0,120)}...`).join('\n');
                systemPrompt = `Ты — карьерный консультант. Список вакансий:\n${vacs}\n. Данные студента: ${studentInfo}. Подбирай вакансии.`;
            }

            // История
            const historyRes = await db.query('SELECT role, content FROM chat_messages WHERE user_id = $1 ORDER BY created_at DESC LIMIT 6', [userId]);
            const recentHistory = historyRes.rows.reverse();

            const messagesForAi = [{ role: "system", content: systemPrompt }, ...recentHistory.map(m => ({ role: m.role, content: m.content }))];

            // Ответ ИИ
            const aiAnswer = await aiService.getCompletion(messagesForAi);
            const savedAiMsg = await db.query('INSERT INTO chat_messages (user_id, role, content) VALUES ($1, $2, $3) RETURNING *', [userId, 'assistant', aiAnswer]);
            res.json(savedAiMsg.rows[0]);

        } catch (e) {
            console.error(e);
            res.status(500).json({ message: 'Error' });
        }
    }

    async clearHistory(req, res) {
        try {
            const userId = req.user.id;
            await db.query('DELETE FROM chat_messages WHERE user_id = $1', [userId]);
            res.json({ message: 'История очищена' });
        } catch (e) { res.status(500).json({ message: 'Error' }); }
    }
}

module.exports = new ChatController();