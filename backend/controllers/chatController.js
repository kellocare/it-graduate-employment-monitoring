const db = require('../db');
const aiService = require('../services/aiService');
const pdf = require('pdf-parse');

class ChatController {

    // Получение истории
    getHistory = async (req, res) => {
        try {
            const userId = req.user.id;
            const history = await db.query(
                'SELECT role, content, created_at FROM chat_messages WHERE user_id = $1 ORDER BY created_at ASC LIMIT 50',
                [userId]
            );
            res.json(history.rows);
        } catch (e) {
            console.error("History Error:", e);
            res.status(500).json({ message: 'Ошибка получения истории' });
        }
    }

    // --- НОВЫЙ МЕТОД: УЛУЧШЕНИЕ ТЕКСТА РЕЗЮМЕ ---
    improveResumeText = async (req, res) => {
        try {
            console.log("🔄 Start improving text..."); // ЛОГ 1
            const { text } = req.body;

            if (!text) {
                console.log("❌ No text provided");
                return res.status(400).json({ message: "Текст не может быть пустым" });
            }

            const prompt = `
                Ты профессиональный HR-редактор. 
                Перепиши следующий текст для резюме IT-специалиста более профессиональным, деловым языком.
                Используй сильные глаголы (разработал, внедрил, оптимизировал).
                Верни ТОЛЬКО улучшенный текст без кавычек, без вступлений и без Markdown.
                
                Текст: "${text}"
            `;

            // Вызов AI
            const improved = await aiService.getCompletion([{ role: 'user', content: prompt }]);

            if (!improved) {
                throw new Error("Пустой ответ от AI сервиса");
            }

            // Убираем кавычки и лишние пробелы
            const cleanText = improved.replace(/^"|"$/g, '').trim();

            console.log("✅ AI Success:", cleanText.substring(0, 20) + "..."); // ЛОГ 2
            res.json({ result: cleanText });

        } catch (e) {
            console.error("❌ AI Improve Error DETAILED:", e); // ЛОГ ОШИБКИ
            res.status(500).json({ message: "Ошибка AI: " + e.message });
        }
    }

    // Загрузка PDF
    uploadResume = async (req, res) => {
        try {
            if (!req.file || !req.file.buffer) {
                return res.status(400).json({ message: 'Файл не загружен' });
            }

            const userId = req.user.id;

            // Парсинг PDF
            let extractedText = "";
            try {
                const data = await pdf(req.file.buffer);
                extractedText = data.text;
            } catch (pdfError) {
                console.error("PDF Parse Error:", pdfError);
                return res.status(500).json({ message: 'Ошибка чтения PDF' });
            }

            if (!extractedText || extractedText.trim().length < 5) {
                return res.status(400).json({ message: 'PDF пустой' });
            }

            const userMessage = `[PDF РЕЗЮМЕ]\n\n${extractedText.substring(0, 200)}...`; // Обрезаем для лога в базе, если нужно

            // Сохраняем сообщение юзера (полный текст или обрезанный - на твое усмотрение, лучше полный)
            await db.query(
                'INSERT INTO chat_messages (user_id, role, content) VALUES ($1, $2, $3)',
                [userId, 'user', `[Загружен файл PDF] Текст: ${extractedText}`]
            );

            const systemPrompt = `Ты рекрутер. Проанализируй резюме:\n${extractedText}\nДай оценку и советы. Markdown.`;

            // История для контекста
            const historyRes = await db.query('SELECT role, content FROM chat_messages WHERE user_id = $1 ORDER BY created_at DESC LIMIT 4', [userId]);
            const recentHistory = historyRes.rows.reverse();

            const messagesForAi = [{ role: "system", content: systemPrompt }, ...recentHistory.map(m => ({ role: m.role, content: m.content }))];

            const aiAnswer = await aiService.getCompletion(messagesForAi);

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

    // Отправка сообщений
    async sendMessage(req, res) {
        try {
            const userId = req.user.id;
            const { message, mode } = req.body;
            const currentMode = mode || 'vacancy';

            // Сохраняем сообщение пользователя
            await db.query('INSERT INTO chat_messages (user_id, role, content) VALUES ($1, $2, $3)', [userId, 'user', message]);

            // Получаем профиль студента
            const gradRes = await db.query(`
                SELECT g.first_name, g.last_name, g.about_me, g.portfolio_links, s.name as specialty_name
                FROM graduates g
                LEFT JOIN specialties s ON g.specialty_id = s.id
                WHERE g.user_id = $1
            `, [userId]);
            const student = gradRes.rows[0] || {};
            const studentName = `${student.first_name || 'Кандидат'}`;

            let systemPrompt = "";

            // --- ЛОГИКА РЕЖИМОВ ---
            if (currentMode === 'resume') {
                systemPrompt = `Ты — эксперт по резюме. Твоя цель — помочь улучшить описание опыта. Студент: ${studentName}. Будь краток и профессионален.`;

            } else if (currentMode === 'interview') {
                // НОВЫЙ РЕЖИМ: СОБЕСЕДОВАНИЕ
                systemPrompt = `
                    Ты — строгий, но справедливый Технический Интервьюер (Tech Lead).
                    Твоя задача: Провести короткое собеседование (Mock Interview) со студентом по указанной им теме.
                    
                    Правила:
                    1. Задавай ТОЛЬКО ОДИН вопрос за раз.
                    2. Жди ответа пользователя. Не отвечай сам за себя.
                    3. После ответа пользователя, кратко прокомментируй (верно/неверно) и задай следующий вопрос.
                    4. Всего задай 5 вопросов.
                    5. После 5-го вопроса напиши "Собеседование завершено" и выдай общую оценку (0-100) и рекомендации.
                    
                    Имя кандидата: ${studentName}.
                    Если пользователь только начал диалог фразой вроде "Хочу собеседование по Java", начни с первого вопроса по этой теме.
                `;

            } else {
                // РЕЖИМ ВАКАНСИЙ
                const vacanciesRes = await db.query('SELECT title, description FROM vacancies ORDER BY created_at DESC LIMIT 10');
                const vacs = vacanciesRes.rows.map(v => `- ${v.title}`).join('\n');
                systemPrompt = `Ты — карьерный консультант. Помогай искать работу. Вот свежие вакансии:\n${vacs}\n.`;
            }

            // История переписки
            const historyRes = await db.query('SELECT role, content FROM chat_messages WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10', [userId]);
            const recentHistory = historyRes.rows.reverse();

            const messagesForAi = [
                { role: "system", content: systemPrompt },
                ...recentHistory.map(m => ({ role: m.role, content: m.content }))
            ];

            const aiAnswer = await aiService.getCompletion(messagesForAi);

            const savedAiMsg = await db.query(
                'INSERT INTO chat_messages (user_id, role, content) VALUES ($1, $2, $3) RETURNING *',
                [userId, 'assistant', aiAnswer]
            );
            res.json(savedAiMsg.rows[0]);

        } catch (e) {
            console.error("Chat Error:", e);
            res.status(500).json({ message: 'Ошибка чата' });
        }
    }

    // Очистка
    clearHistory = async (req, res) => {
        try {
            await db.query('DELETE FROM chat_messages WHERE user_id = $1', [req.user.id]);
            res.json({ message: 'History cleared' });
        } catch (e) { res.status(500).json({ message: 'Error' }); }
    }

    generateRoadmap = async (req, res) => {
        try {
            const { role } = req.body;
            if (!role) return res.status(400).json({ message: "Укажите роль" });

            // Промпт для более масштабного графа
            const prompt = `
                Ты — Senior Ментор. Составь МАСШТАБНУЮ карту развития (Roadmap) для: "${role}".
                
                Требования:
                1. Создай 7-9 КЛЮЧЕВЫХ этапов (Main Nodes).
                2. Для каждого этапа дай 3-4 подтемы (Subtopics).
                3. Названия должны быть КОРОТКИМИ (макс 3-5 слов), чтобы влезали в блоки.
                
                ВЕРНИ ТОЛЬКО JSON МАССИВ.
                Format:
                [
                    { 
                        "id": "1", 
                        "label": "Название этапа", 
                        "desc": "Чему научишься...", 
                        "subtopics": ["Подтема 1", "Подтема 2", "Подтема 3"] 
                    }
                ]
            `;

            const aiResponse = await aiService.getCompletion([{ role: 'user', content: prompt }]);
            const cleanJson = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();

            let steps = [];
            try {
                const match = cleanJson.match(/\[[\s\S]*\]/);
                steps = JSON.parse(match ? match[0] : cleanJson);
            } catch (e) {
                return res.status(500).json({ message: "Ошибка AI. Попробуйте снова." });
            }

            res.json(steps);

        } catch (e) {
            console.error("Roadmap Error:", e);
            res.status(500).json({ message: "Ошибка генерации" });
        }
    }

    // --- НОВЫЙ МЕТОД: СОХРАНЕНИЕ ПРОГРЕССА ---
    saveRoadmap = async (req, res) => {
        try {
            const userId = req.user.id;
            const { roadmapData, role } = req.body; // Принимаем nodes и role

            if (!roadmapData) return res.status(400).json({message: "Нет данных"});

            // Формируем объект для сохранения: { role: "DevOps", nodes: [...] }
            const dataToSave = {
                role: role || "My Roadmap",
                nodes: roadmapData
            };

            await db.query(
                'UPDATE graduates SET roadmap_data = $1 WHERE user_id = $2',
                [JSON.stringify(dataToSave), userId]
            );

            res.json({ message: "Прогресс сохранен" });
        } catch (e) {
            console.error("Save Roadmap Error:", e);
            res.status(500).json({ message: "Ошибка сохранения" });
        }
    }

    getRoadmap = async (req, res) => {
        try {
            const userId = req.user.id;
            const result = await db.query('SELECT roadmap_data FROM graduates WHERE user_id = $1', [userId]);

            if (result.rows.length > 0 && result.rows[0].roadmap_data) {
                res.json(result.rows[0].roadmap_data);
            } else {
                res.json([]); // Пустой массив, если карты нет
            }
        } catch (e) {
            console.error("Get Roadmap Error:", e);
            res.status(500).json({ message: "Ошибка загрузки карты" });
        }
    }

    archiveRoadmap = async (req, res) => {
        try {
            const userId = req.user.id;

            // 1. Получаем текущий из БД
            const gradRes = await db.query('SELECT roadmap_data FROM graduates WHERE user_id = $1', [userId]);
            const currentData = gradRes.rows[0]?.roadmap_data; // Это объект { role, nodes }

            if (!currentData) {
                return res.status(400).json({ message: "Нет активного роадмапа" });
            }

            // 2. Достаем название роли.
            // Приоритет: 1. Сохраненное в JSON, 2. Присланное с фронта, 3. Дефолт
            let roleTitle = "IT Roadmap";
            let nodes = [];

            // Проверяем формат (старый массив или новый объект)
            if (Array.isArray(currentData)) {
                nodes = currentData;
                roleTitle = req.body.roleTitle || "My Roadmap"; // Для старых данных берем с фронта
            } else if (currentData.nodes) {
                nodes = currentData.nodes;
                roleTitle = currentData.role || req.body.roleTitle || "My Roadmap";
            }

            const { finalProgress } = req.body;

            // 3. В историю сохраняем только узлы, чтобы не дублировать вложенность
            await db.query(
                'INSERT INTO roadmap_history (user_id, role_title, progress, roadmap_data) VALUES ($1, $2, $3, $4)',
                [userId, roleTitle, finalProgress || 0, JSON.stringify(nodes)]
            );

            // 4. Очищаем
            await db.query('UPDATE graduates SET roadmap_data = NULL WHERE user_id = $1', [userId]);

            res.json({ message: "Роадмап перемещен в архив" });

        } catch (e) {
            console.error("Archive Error:", e);
            res.status(500).json({ message: "Ошибка архивации" });
        }
    }

    // --- ПОЛУЧЕНИЕ ИСТОРИИ РОАДМАПОВ ---
    getRoadmapHistory = async (req, res) => {
        try {
            const userId = req.user.id;
            const result = await db.query(
                'SELECT * FROM roadmap_history WHERE user_id = $1 ORDER BY completed_at DESC',
                [userId]
            );
            res.json(result.rows);
        } catch (e) {
            console.error("Get Roadmap History Error:", e);
            res.status(500).json({ message: "Ошибка получения истории" });
        }
    }
}

module.exports = new ChatController();