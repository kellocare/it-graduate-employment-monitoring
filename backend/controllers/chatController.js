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

            // Парсинг JSON
            let cleanJson = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
            const nodes = JSON.parse(cleanJson);

            res.json(nodes);
        } catch (e) {
            console.error("Roadmap Gen Error:", e);
            res.status(500).json({ message: "Ошибка генерации" });
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
            const { roadmapId, nodes, role, activeId } = req.body;
            // roadmapId - какой трек обновляем (если null -> создаем новый)
            // activeId - какой трек сделать активным

            // Получаем текущие данные
            const result = await db.query('SELECT roadmap_data FROM graduates WHERE user_id = $1', [userId]);
            let data = result.rows[0]?.roadmap_data || { activeId: null, list: [] };

            // Убедимся, что структура правильная
            if (!data.list) data = { activeId: null, list: [] };

            if (nodes && role) {
                // Если переданы узлы - значит сохраняем конкретный роадмап
                const idToSave = roadmapId || require('crypto').randomUUID(); // Генерируем ID если новый

                const existingIndex = data.list.findIndex(item => item.id === idToSave);

                const newTrack = { id: idToSave, role, nodes };

                if (existingIndex !== -1) {
                    // Обновляем существующий
                    data.list[existingIndex] = newTrack;
                } else {
                    // Добавляем новый
                    data.list.push(newTrack);
                }

                // Делаем его активным
                data.activeId = idToSave;
            }

            // Если просто переключили вкладку (передан только activeId)
            if (activeId) {
                data.activeId = activeId;
            }

            await db.query('UPDATE graduates SET roadmap_data = $1 WHERE user_id = $2', [JSON.stringify(data), userId]);
            res.json({ message: "Saved", roadmapId: data.activeId });

        } catch (e) {
            console.error(e);
            res.status(500).json({ message: "Error saving" });
        }
    }

    // 1. ПОЛУЧЕНИЕ (С МИГРАЦИЕЙ)
    getRoadmap = async (req, res) => {
        try {
            const userId = req.user.id;
            const result = await db.query('SELECT roadmap_data FROM graduates WHERE user_id = $1', [userId]);
            let data = result.rows[0]?.roadmap_data;

            // МИГРАЦИЯ ДАННЫХ НА ЛЕТУ
            // Если данные в старом формате (просто массив узлов или объект {role, nodes}), превращаем в { activeId, list: [] }
            if (data && (Array.isArray(data) || (data.nodes && !data.list))) {
                const oldNodes = Array.isArray(data) ? data : data.nodes;
                const oldRole = data.role || "My Roadmap";
                const newId = 'default-id';

                const newData = {
                    activeId: newId,
                    list: [{ id: newId, role: oldRole, nodes: oldNodes }]
                };

                // Сохраняем обновленную структуру
                await db.query('UPDATE graduates SET roadmap_data = $1 WHERE user_id = $2', [JSON.stringify(newData), userId]);
                data = newData;
            }

            // Если данных нет вообще
            if (!data) {
                data = { activeId: null, list: [] };
            }

            res.json(data);
        } catch (e) {
            console.error(e);
            res.status(500).json({ message: "Error loading roadmap" });
        }
    }

    archiveRoadmap = async (req, res) => {
        try {
            const userId = req.user.id;
            const { roadmapId } = req.body; // ID трека, который архивируем

            const result = await db.query('SELECT roadmap_data FROM graduates WHERE user_id = $1', [userId]);
            let data = result.rows[0]?.roadmap_data;

            if (!data || !data.list) return res.status(400).json({ message: "Нет данных" });

            // Находим трек
            const trackIndex = data.list.findIndex(t => t.id === roadmapId);
            if (trackIndex === -1) return res.status(404).json({ message: "Трек не найден" });

            const track = data.list[trackIndex];

            // Рассчитываем прогресс перед архивацией
            const totalNodes = track.nodes.filter(n => n.type !== 'sub').length; // Примерно
            const doneNodes = track.nodes.filter(n => n.data && n.data.done).length; // Нужно адаптировать под структуру VueFlow
            // У тебя структура VueFlow: nodes хранятся плоско.
            // Проще взять прогресс с фронтенда, но если надо на бэке - считаем done:true

            // Сохраняем в историю
            await db.query(
                'INSERT INTO roadmap_history (user_id, role_title, progress, roadmap_data) VALUES ($1, $2, $3, $4)',
                [userId, track.role, 100, JSON.stringify(track.nodes)] // Progress заглушка, лучше передавать с фронта
            );

            // Удаляем из активного списка
            data.list.splice(trackIndex, 1);

            // Если удалили активный - переключаем на первый доступный или null
            if (data.activeId === roadmapId) {
                data.activeId = data.list.length > 0 ? data.list[0].id : null;
            }

            await db.query('UPDATE graduates SET roadmap_data = $1 WHERE user_id = $2', [JSON.stringify(data), userId]);
            res.json({ message: "Archived" });

        } catch (e) {
            console.error(e);
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