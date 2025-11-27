const db = require('../db');
const aiService = require('../services/aiService');
const pdf = require('pdf-parse');

class ChatController {

    // Получение истории
    getHistory = async (req, res) => {
        try {
            const userId = req.user.id;
            // Получаем режим из query-параметров (?mode=interview), по дефолту 'vacancy'
            const mode = req.query.mode || 'vacancy';

            const history = await db.query(
                'SELECT role, content, created_at FROM chat_messages WHERE user_id = $1 AND mode = $2 ORDER BY created_at ASC LIMIT 50',
                [userId, mode]
            );
            res.json(history.rows);
        } catch (e) {
            console.error("History Error:", e);
            res.status(500).json({ message: 'Ошибка получения истории' });
        }
    }

    // --- УЛУЧШЕНИЕ ТЕКСТА РЕЗЮМЕ ---
    improveResumeText = async (req, res) => {
        try {
            const { text } = req.body;
            if (!text) return res.status(400).json({ message: "Текст не может быть пустым" });

            const prompt = `
                Ты профессиональный HR-редактор. 
                Перепиши следующий текст для резюме IT-специалиста более профессиональным языком.
                Верни ТОЛЬКО текст.
                Текст: "${text}"
            `;

            const improved = await aiService.getCompletion([{ role: 'user', content: prompt }]);
            const cleanText = improved.replace(/^"|"$/g, '').trim();
            res.json({ result: cleanText });
        } catch (e) {
            console.error("Improve Error:", e);
            res.status(500).json({ message: "Ошибка AI" });
        }
    }

    // Загрузка PDF
    uploadResume = async (req, res) => {
        try {
            if (!req.file || !req.file.buffer) return res.status(400).json({ message: 'Файл не загружен' });
            const userId = req.user.id;
            let extractedText = "";
            try {
                const data = await pdf(req.file.buffer);
                extractedText = data.text;
            } catch (pdfError) {
                return res.status(500).json({ message: 'Ошибка чтения PDF' });
            }

            if (!extractedText || extractedText.trim().length < 5) return res.status(400).json({ message: 'PDF пустой' });

            await db.query(
                'INSERT INTO chat_messages (user_id, role, content) VALUES ($1, $2, $3)',
                [userId, 'user', `[Загружен файл PDF] Текст: ${extractedText}`]
            );

            const systemPrompt = `Ты рекрутер. Проанализируй резюме:\n${extractedText}\nДай оценку и советы. Markdown.`;
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
    sendMessage = async (req, res) => {
        try {
            const userId = req.user.id;
            const { message, mode } = req.body;
            const currentMode = mode || 'vacancy';

            // 🔥 ВАЖНО: Добавляем currentMode в INSERT
            await db.query(
                'INSERT INTO chat_messages (user_id, role, content, mode) VALUES ($1, $2, $3, $4)',
                [userId, 'user', message, currentMode]
            );

            const gradRes = await db.query(`SELECT g.first_name FROM graduates g WHERE g.user_id = $1`, [userId]);
            const studentName = gradRes.rows[0]?.first_name || 'Кандидат';

            let systemPrompt = "";

            // --- ЛОГИКА ПРОМПТОВ ---
            if (currentMode === 'interview') {
                systemPrompt = `
                    Ты — Технический Лид (Tech Lead), проводящий собеседование.
                    Твоя задача: Проверить практические навыки кандидата (${studentName}).
                    
                    ИНСТРУКЦИЯ:
                    1. Задай по очереди несколько вопросов по теме собеседования с вариантами ответов (А, Б, В).
                    2. Затем дай кандидату **НЕСКОЛЬКО ПРАКТИЧЕСКИХ ЗАДАЧ** по его теме.
                       Примеры задач:
                       - "Напиши функцию, которая..."
                       - "Вот кусок кода, найди в нем ошибку..."
                       - "Как бы ты спроектировал базу данных для..."
                    3. Задача должна быть короткой (решаемой за 2-3 минуты).
                    4. Жди ответов на тест и задачи. 
                    5. После получения ответов и конца собеседования дай короткий фидбек (Правильно/Нет) и, если нужно, задай уточняющий вопрос.
                    
                    Общайся дружелюбно, но профессионально. Используй Markdown для кода.
                `;
            } else {
                // Режим 'vacancy' (Поиск)
                const vacanciesRes = await db.query('SELECT title FROM vacancies ORDER BY created_at DESC LIMIT 5');
                const vacs = vacanciesRes.rows.map(v => `- ${v.title}`).join('\n');
                systemPrompt = `Ты карьерный консультант. Вакансии:\n${vacs}`;
            }

            // Получаем историю ТОЛЬКО ЭТОГО РЕЖИМА для контекста ИИ
            const historyRes = await db.query(
                'SELECT role, content FROM chat_messages WHERE user_id = $1 AND mode = $2 ORDER BY created_at DESC LIMIT 10',
                [userId, currentMode]
            );
            const recentHistory = historyRes.rows.reverse();

            const messagesForAi = [
                { role: "system", content: systemPrompt },
                ...recentHistory.map(m => ({ role: m.role, content: m.content }))
            ];

            const aiAnswer = await aiService.getCompletion(messagesForAi);

            // Сохраняем ответ ИИ тоже с указанием режима
            const savedAiMsg = await db.query(
                'INSERT INTO chat_messages (user_id, role, content, mode) VALUES ($1, $2, $3, $4) RETURNING *',
                [userId, 'assistant', aiAnswer, currentMode]
            );
            res.json(savedAiMsg.rows[0]);

        } catch (e) {
            console.error("Chat Error:", e);
            res.status(500).json({ message: 'Ошибка чата' });
        }
    }

    clearHistory = async (req, res) => {
        try {
            const mode = req.query.mode || 'vacancy';
            await db.query('DELETE FROM chat_messages WHERE user_id = $1 AND mode = $2', [req.user.id, mode]);
            res.json({ message: 'History cleared for ' + mode });
        } catch (e) { res.status(500).json({ message: 'Error' }); }
    }

    // 🔥🔥🔥 ОБНОВЛЕННЫЙ МЕТОД ГЕНЕРАЦИИ ROADMAP 🔥🔥🔥
    generateRoadmap = async (req, res) => {
        try {
            const { role } = req.body;
            if (!role) return res.status(400).json({ message: "Укажите роль" });

            console.log(`🤖 Generating Smart Roadmap for: ${role}...`);

            const prompt = `
                Ты — Senior Technical Mentor.
                Составь подробную карту развития (Roadmap) для профессии: "${role}".
                
                СТРУКТУРА:
                1. Создай 5-7 КЛЮЧЕВЫХ этапов (Main Nodes).
                2. Для каждого этапа 2-3 подтемы (Subtopics).
                
                ОБЯЗАТЕЛЬНО верни данные в формате JSON (массив объектов).
                Каждый объект (и тема, и подтема) должен содержать:
                - "label": "Название темы"
                - "desc": "Краткое описание"
                - "difficulty": "easy", "medium" или "hard" (оцени сложность для новичка)
                - "time": "2h", "5h", "1 day" (примерное время на изучение)
                - "xpEarned": число от 50 до 300 (очки опыта за прохождение)
                - "resources": массив из 2 полезных ссылок (реальных или сгенерированных ТОЛЬКО ТЕКСТОВЫЕ СТАТЬИ БЕЗ ВИДЕО):
                    [ { "title": "...", "type": "video" или "article", "link": "..." } ]
                
                ТРЕБОВАНИЯ:
                - Язык: РУССКИЙ.
                - Технические термины на английском.
                - Верни ТОЛЬКО валидный JSON.

                Пример структуры:
                [
                    { 
                        "label": "Основы", 
                        "desc": "...", 
                        "difficulty": "easy",
                        "time": "5h",
                        "xpEarned": 100,
                        "resources": [],
                        "subtopics": [ ... ] 
                    }
                ]
            `;

            const aiResponse = await aiService.getCompletion([{ role: 'user', content: prompt }]);

            // Чистка JSON
            let cleanJson = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
            // Исправление обрыва строки (иногда ИИ обрывает JSON)
            if (!cleanJson.endsWith(']') && !cleanJson.endsWith('}')) {
               // Пытаемся закрыть, если обрезалось (примитивно)
               cleanJson += ']';
            }

            let steps = [];
            try {
                // Попытка 1: Просто парсим
                steps = JSON.parse(cleanJson);
            } catch (parseError) {
                // Попытка 2: Ищем массив внутри текста
                const firstBracket = aiResponse.indexOf('[');
                const lastBracket = aiResponse.lastIndexOf(']');
                if (firstBracket !== -1 && lastBracket !== -1) {
                    try {
                        steps = JSON.parse(aiResponse.substring(firstBracket, lastBracket + 1));
                    } catch (e2) {
                        console.error("JSON Parsing failed completely");
                        return res.status(500).json({ message: "Ошибка обработки ответа ИИ" });
                    }
                } else {
                    return res.status(500).json({ message: "ИИ вернул неверный формат" });
                }
            }

            // Доп. валидация структуры (на всякий случай проставляем дефолты)
            const validateNode = (node) => {
                if (!node.difficulty) node.difficulty = 'medium';
                if (!node.time) node.time = '2h';
                if (!node.xpEarned) node.xpEarned = 100;
                if (!node.resources) node.resources = [];
                if (node.subtopics) node.subtopics.forEach(validateNode);
            };
            steps.forEach(validateNode);

            res.json(steps);

        } catch (e) {
            console.error("Roadmap Error:", e);
            res.status(500).json({ message: "Ошибка генерации roadmap" });
        }
    }

    // --- QUIZ (ЗАДАЧА) ---
    generateNodeQuiz = async (req, res) => {
        try {
            const { topic, description } = req.body;
            const prompt = `
                Ты — Интервьюер. Тема: "${topic}" (${description}).
                Придумай 1 практическую задачу.
                Верни JSON: { "question": "...", "hint": "..." }
            `;
            const aiResponse = await aiService.getCompletion([{ role: 'user', content: prompt }]);
            const clean = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
            const json = JSON.parse(clean.match(/\{[\s\S]*\}/)[0]);
            res.json(json);
        } catch (e) {
            res.status(500).json({ message: "Ошибка создания теста" });
        }
    }

    // --- ПРОВЕРКА ОТВЕТА ---
    checkNodeQuiz = async (req, res) => {
        try {
            const { topic, question, answer } = req.body;
            const prompt = `
                Тема: ${topic}. Вопрос: ${question}. Ответ: "${answer}".
                Оцени ответ.
                Верни JSON: { "passed": true/false, "feedback": "Markdown текст...", "score": 85 }
            `;
            const aiResponse = await aiService.getCompletion([{ role: 'user', content: prompt }]);
            const clean = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
            const json = JSON.parse(clean.match(/\{[\s\S]*\}/)[0]);
            res.json(json);
        } catch (e) {
            res.status(500).json({ message: "Ошибка проверки" });
        }
    }

    // --- СОХРАНЕНИЕ ---
    saveRoadmap = async (req, res) => {
        try {
            const userId = req.user.id;
            const { roadmapData, role } = req.body;
            if (!roadmapData) return res.status(400).json({message: "Нет данных"});

            const dataToSave = { role: role || "My Roadmap", nodes: roadmapData };
            await db.query('UPDATE graduates SET roadmap_data = $1 WHERE user_id = $2', [JSON.stringify(dataToSave), userId]);
            res.json({ message: "Saved" });
        } catch (e) {
            res.status(500).json({ message: "Error saving" });
        }
    }

    // 1. ПОЛУЧЕНИЕ (С МИГРАЦИЕЙ)
    getRoadmap = async (req, res) => {
        try {
            const userId = req.user.id;
            const result = await db.query('SELECT roadmap_data FROM graduates WHERE user_id = $1', [userId]);

            let data = result.rows[0]?.roadmap_data;

            // Миграция: Если там старый формат (просто массив), оборачиваем в список
            if (data && Array.isArray(data)) {
                data = {
                    activeId: 'default',
                    list: [{ id: 'default', role: 'My Roadmap', nodes: data }]
                };
                await db.query('UPDATE graduates SET roadmap_data = $1 WHERE user_id = $2', [JSON.stringify(data), userId]);
            }

            if (!data) data = { activeId: null, list: [] };
            res.json(data);
        } catch (e) {
            res.status(500).json({ message: "Error loading" });
        }
    }

    archiveRoadmap = async (req, res) => {
        try {
            const userId = req.user.id;
            const gradRes = await db.query('SELECT roadmap_data FROM graduates WHERE user_id = $1', [userId]);
            const currentData = gradRes.rows[0]?.roadmap_data;

            if (!currentData) return res.status(400).json({ message: "Нет роадмапа" });

            let roleTitle = "IT Roadmap";
            let nodes = [];
            if (Array.isArray(currentData)) {
                nodes = currentData;
                roleTitle = req.body.roleTitle || "My Roadmap";
            } else if (currentData.nodes) {
                nodes = currentData.nodes;
                roleTitle = currentData.role || req.body.roleTitle;
            }

            const { finalProgress } = req.body;
            await db.query(
                'INSERT INTO roadmap_history (user_id, role_title, progress, roadmap_data) VALUES ($1, $2, $3, $4)',
                [userId, roleTitle, finalProgress || 0, JSON.stringify(nodes)]
            );
            await db.query('UPDATE graduates SET roadmap_data = NULL WHERE user_id = $1', [userId]);
            res.json({ message: "Archived" });
        } catch (e) {
            res.status(500).json({ message: "Error archiving" });
        }
    }

    getRoadmapHistory = async (req, res) => {
        try {
            const userId = req.user.id;
            const result = await db.query('SELECT * FROM roadmap_history WHERE user_id = $1 ORDER BY completed_at DESC', [userId]);
            res.json(result.rows);
        } catch (e) {
            res.status(500).json({ message: "Error history" });
        }
    }

    generateUniversityReport = async (req, res) => {
        try {
            // 1. Сначала собираем цифры из БД
            const stats = await db.query(`
                SELECT 
                    (SELECT COUNT(*) FROM graduates) as total,
                    (SELECT COUNT(*) FROM graduates WHERE status='employed') as employed,
                    (SELECT AVG(salary) FROM graduates WHERE salary > 0) as salary
            `);

            const { total, employed, salary } = stats.rows[0];
            const rate = total > 0 ? Math.round((employed / total) * 100) : 0;

            // 2. Формируем промпт
            const prompt = `
                Ты аналитик данных в университете. 
                Проанализируй показатели:
                - Выпускников: ${total}
                - Трудоустроено: ${employed} (${rate}%)
                - Средняя ЗП: ${Math.round(salary || 0)} руб.
                
                Дай 3 совета декану (кратко, с эмодзи):
                1. Оценка ситуации.
                2. Что улучшить в обучении.
                3. Совет студентам.
            `;

            // 3. Спрашиваем AI (используем твой aiService)
            const aiResponse = await aiService.getCompletion([{ role: 'user', content: prompt }]);

            res.json({ report: aiResponse });

        } catch (e) {
            console.error("University AI Error:", e);
            res.status(500).json({ message: "Ошибка генерации отчета" });
        }
    }
}

module.exports = new ChatController();