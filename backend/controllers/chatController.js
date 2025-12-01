const db = require('../db');
const aiService = require('../services/aiService');
const pdf = require('pdf-parse');

const parseAIResponse = (text) => {
    try {
        // 1. Попытка распарсить "как есть"
        return JSON.parse(text);
    } catch (e) {
        try {
            // 2. Очистка от Markdown ```json ... ```
            let clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
            // 3. Поиск первой { и последней }
            const start = clean.indexOf('{');
            const end = clean.lastIndexOf('}');
            if (start !== -1 && end !== -1) {
                clean = clean.substring(start, end + 1);
                return JSON.parse(clean);
            }
        } catch (e2) {
            console.error("JSON Parse Error:", text);
            throw new Error("AI вернул некорректный формат данных");
        }
    }
    return null;
};

class ChatController {

    // --- ВСПОМОГАТЕЛЬНЫЙ МЕТОД: ПЕРЕСЧЕТ XP + НАГРАДЫ ---
    async _recalcAndSaveXP(userId) {
        try {
            let totalXp = 0;

            // 1. Считаем XP из Активных треков (graduates table)
            const gradRes = await db.query('SELECT xp, roadmap_data, unlocked_rewards FROM graduates WHERE user_id = $1', [userId]);
            const currentDbXp = gradRes.rows[0]?.xp || 0;
            const currentRewards = gradRes.rows[0]?.unlocked_rewards || []; // Postgres возвращает массив строк
            const roadmapData = gradRes.rows[0]?.roadmap_data;

            if (roadmapData && roadmapData.list && Array.isArray(roadmapData.list)) {
                roadmapData.list.forEach(track => {
                    if (track.nodes && Array.isArray(track.nodes)) {
                        track.nodes.forEach(node => {
                            if (node.subtopics && Array.isArray(node.subtopics)) {
                                node.subtopics.forEach(sub => {
                                    if (sub.done) totalXp += (sub.xpEarned || 50);
                                });
                            } else if (node.data?.done || node.done) {
                                totalXp += 50;
                            }
                        });
                    }
                });
            }

            // 2. Считаем XP из Архива (roadmap_history table)
            const historyRes = await db.query('SELECT roadmap_data FROM roadmap_history WHERE user_id = $1', [userId]);

            historyRes.rows.forEach(row => {
                let nodes = row.roadmap_data;
                if (typeof nodes === 'string') {
                    try { nodes = JSON.parse(nodes); } catch(e) { nodes = []; }
                }
                if (Array.isArray(nodes)) {
                    nodes.forEach(node => {
                        if (node.subtopics && Array.isArray(node.subtopics)) {
                            node.subtopics.forEach(sub => {
                                if (sub.done) totalXp += (sub.xpEarned || 50);
                            });
                        } else if (node.data?.done || node.done) {
                            totalXp += 50;
                        }
                    });
                }
            });

            // 3. ПРОВЕРКА УРОВНЯ И ВЫДАЧА НАГРАД
            const oldLevel = Math.floor(currentDbXp / 500) + 1;
            const newLevel = Math.floor(totalXp / 500) + 1;

            let newRewards = [...currentRewards];
            let rewardGranted = null;

            // Если уровень вырос
            if (newLevel > oldLevel) {
                const rewardsMap = {
                    2:  { id: 'frame_blue', name: '🎨 Синяя рамка аватара' },
                    3:  { id: 'ai_token', name: '📄 AI-разбор резюме' },
                    5:  { id: 'fire_effect', name: '🔥 Эффект "В огне"' },
                    7:  { id: 'profile_boost', name: '🚀 Буст профиля' },
                    10: { id: 'theme_dark', name: '🕶 Тёмная тема' },
                    15: { id: 'badge_top', name: '🌟 Бейдж Топ-талант' },
                    20: { id: 'mentor_status', name: '🎓 Статус Ментора' },
                    30: { id: 'crown', name: '👑 Корона Guru' }
                };

                // Проверяем все уровни, которые прошли (вдруг сразу на 2 скакнули)
                for (let l = oldLevel + 1; l <= newLevel; l++) {
                    if (rewardsMap[l] && !newRewards.includes(rewardsMap[l].id)) {
                        newRewards.push(rewardsMap[l].id);
                        rewardGranted = rewardsMap[l].name; // Запоминаем последнюю полученную для уведомления
                    }
                }
            }

            // 4. Сохраняем в базу
            await db.query(
                'UPDATE graduates SET xp = $1, unlocked_rewards = $2 WHERE user_id = $3',
                [totalXp, newRewards, userId]
            );

            return { totalXp, newLevel, rewardGranted };
        } catch (e) {
            console.error("XP Recalc Error:", e);
            return { totalXp: 0, newLevel: 1, rewardGranted: null };
        }
    }

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
            const userId = req.user.id;
            if (!role) return res.status(400).json({ message: "Укажите роль" });

            console.log(`🤖 Generating Smart Roadmap for: ${role}...`);

            // 1. Сначала получаем ТЕКУЩИЕ данные, чтобы не стереть их
            const currentRes = await db.query('SELECT roadmap_data FROM graduates WHERE user_id = $1', [userId]);
            let currentData = currentRes.rows[0]?.roadmap_data || { list: [], activeId: null };

            // Если вдруг там старый формат (просто массив), конвертируем
            if (Array.isArray(currentData)) {
                currentData = { list: [{ id: 'legacy', role: 'Old Roadmap', nodes: currentData }], activeId: 'legacy' };
            }
            if (!currentData.list) currentData.list = [];

            // 2. Генерируем новый контент через AI
            const prompt = `
                Ты — Senior Technical Mentor.
                Составь карту развития (Roadmap) для: "${role}".
                Верни JSON (массив объектов).
                Структура: 
                [
                  { 
                    "label": "Название этапа", 
                    "desc": "Кратко", 
                    "difficulty": "easy/medium/hard",
                    "subtopics": [ 
                       { "label": "Подтема", "desc": "Что изучить", "xpEarned": 100 } 
                    ] 
                  }
                ]
                Только JSON, без лишнего текста.
            `;

            const aiResponse = await aiService.getCompletion([{ role: 'user', content: prompt }]);

            // Чистим ответ от ```json ... ```
            let cleanJson = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
            let newNodes = JSON.parse(cleanJson);

            // Валидация полей
            const validateNode = (node) => {
                if (!node.difficulty) node.difficulty = 'medium';
                if (!node.subtopics) node.subtopics = [];
                node.subtopics.forEach(s => {
                    s.done = false; // Важно: новый трек не пройден
                    if (!s.xpEarned) s.xpEarned = 50;
                });
                node.data = { done: false }; // Совместимость
            };
            newNodes.forEach(validateNode);

            // 3. Создаем новый объект трека
            const newTrackId = `track-${Date.now()}`;
            const newTrack = {
                id: newTrackId,
                role: role,
                created_at: new Date(),
                nodes: newNodes
            };

            // 4. ДОБАВЛЯЕМ в список (а не заменяем)
            currentData.list.push(newTrack);
            currentData.activeId = newTrackId; // Переключаем на новый

            // 5. Сохраняем обновленный список
            await db.query('UPDATE graduates SET roadmap_data = $1 WHERE user_id = $2', [JSON.stringify(currentData), userId]);

            await this._recalcAndSaveXP(userId);

            res.json(currentData); // Возвращаем полный объект

        } catch (e) {
            console.error("Roadmap Error:", e);
            res.status(500).json({ message: "Ошибка генерации roadmap" });
        }
    }

    // --- QUIZ (ЗАДАЧА) ---
    generateNodeQuiz = async (req, res) => {
        try {
            const { topic, description } = req.body; // topic = подтема, description = родительская тема

            const prompt = `
                Ты технический интервьюер.
                Родительская тема: "${description}".
                Конкретная подтема для проверки: "${topic}".
                
                Сгенерируй 1 (один) короткий проверочный вопрос или мини-задачу на проверку понимания этой подтемы.
                
                Верни ОТВЕТ ТОЛЬКО В ФОРМАТЕ JSON:
                {
                    "question": "Текст вопроса...",
                    "hint": "Маленькая подсказка (не обязательна)"
                }
            `;

            const aiResponse = await aiService.getCompletion([{ role: 'user', content: prompt }]);
            const json = parseAIResponse(aiResponse);

            if (!json) return res.status(500).json({ message: "Ошибка генерации вопроса (неверный формат)" });

            res.json(json);
        } catch (e) {
            console.error("Quiz Gen Error:", e);
            res.status(500).json({ message: "Ошибка сервера при создании теста" });
        }
    }

    // --- ПРОВЕРКА ОТВЕТА ---
    checkNodeQuiz = async (req, res) => {
        try {
            const { topic, question, answer } = req.body;

            const prompt = `
                Я изучаю тему: "${topic}".
                Вопрос был: "${question}".
                Мой ответ: "${answer}".
                
                Оцени, правильно ли я ответил. Будь строг, но справедлив.
                
                Верни ОТВЕТ ТОЛЬКО В ФОРМАТЕ JSON:
                {
                    "passed": true или false,
                    "feedback": "Краткое объяснение в формате Markdown (почему правильно или нет)",
                    "score": число от 0 до 100
                }
            `;

            const aiResponse = await aiService.getCompletion([{ role: 'user', content: prompt }]);
            const json = parseAIResponse(aiResponse);

            if (!json) return res.status(500).json({ message: "Ошибка проверки (неверный формат)" });

            res.json(json);
        } catch (e) {
            console.error("Quiz Check Error:", e);
            res.status(500).json({ message: "Ошибка сервера при проверке" });
        }
    }

    // --- СОХРАНЕНИЕ ROADMAP + ПОДСЧЕТ XP ---
    // 🔥 ИСПРАВЛЕННОЕ СОХРАНЕНИЕ ПРОГРЕССА
    saveRoadmap = async (req, res) => {
        try {
            const userId = req.user.id;
            const { activeId, roadmapId, nodes } = req.body;

            // Получаем текущие данные
            const currentRes = await db.query('SELECT roadmap_data FROM graduates WHERE user_id = $1', [userId]);
            let data = currentRes.rows[0]?.roadmap_data;

            if (!data || !data.list) return res.status(400).json({message: "Нет данных"});

            // 1. Если просто переключаем вкладку
            if (activeId) {
                data.activeId = activeId;
            }

            // 2. Если обновляем прогресс конкретного трека
            if (roadmapId && nodes) {
                const trackIndex = data.list.findIndex(t => t.id === roadmapId);
                if (trackIndex !== -1) {
                    data.list[trackIndex].nodes = nodes;
                }
            }

            await db.query('UPDATE graduates SET roadmap_data = $1 WHERE user_id = $2', [JSON.stringify(data), userId]);

            // 🔥 ВАЖНО: Получаем результат пересчета (включая награду)
            const xpResult = await this._recalcAndSaveXP(userId);

            // 🔥 Отправляем всё на фронт
            res.json({
                message: "Saved",
                totalXp: xpResult.totalXp,
                newLevel: xpResult.newLevel,
                rewardGranted: xpResult.rewardGranted
            });
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

    // --- АРХИВАЦИЯ (ИСПРАВЛЕННАЯ) ---
    archiveRoadmap = async (req, res) => {
        try {
            const userId = req.user.id;
            const { roadmapId } = req.body;

            // 1. Получаем текущие данные
            const gradRes = await db.query('SELECT roadmap_data FROM graduates WHERE user_id = $1', [userId]);
            let currentData = gradRes.rows[0]?.roadmap_data;

            if (!currentData || !currentData.list) return res.status(400).json({ message: "Нет данных" });

            // 2. Находим нужный трек
            const trackIndex = currentData.list.findIndex(t => t.id === roadmapId);
            if (trackIndex === -1) return res.status(404).json({ message: "Трек не найден" });

            const trackToArchive = currentData.list[trackIndex];

            // 3. СЧИТАЕМ ПРОГРЕСС ПЕРЕД АРХИВАЦИЕЙ
            let total = 0;
            let done = 0;
            // Пробегаемся по узлам трека
            if (trackToArchive.nodes) {
                trackToArchive.nodes.forEach(node => {
                    if (node.subtopics && node.subtopics.length > 0) {
                        total += node.subtopics.length;
                        done += node.subtopics.filter(s => s.done).length;
                    } else {
                        total++;
                        if (node.data?.done || node.done) done++;
                    }
                });
            }
            // Вычисляем процент (если 0 задач, то 0%)
            const finalProgress = total === 0 ? 0 : Math.round((done / total) * 100);

            // 4. Сохраняем в таблицу истории
            await db.query(
                'INSERT INTO roadmap_history (user_id, role_title, progress, roadmap_data, completed_at) VALUES ($1, $2, $3, $4, NOW())',
                [
                    userId,
                    trackToArchive.role || 'Roadmap',
                    finalProgress, // <--- ЗАПИСЫВАЕМ РЕАЛЬНЫЙ ПРОГРЕСС
                    JSON.stringify(trackToArchive.nodes) // Сохраняем узлы, чтобы считать XP потом
                ]
            );

            // 5. Удаляем из активного списка
            currentData.list.splice(trackIndex, 1);

            // Если удалили активный, переключаем на последний доступный
            if (currentData.activeId === roadmapId) {
                currentData.activeId = currentData.list.length > 0 ? currentData.list[currentData.list.length - 1].id : null;
            }

            // 6. Обновляем таблицу graduates
            await db.query('UPDATE graduates SET roadmap_data = $1 WHERE user_id = $2', [JSON.stringify(currentData), userId]);

            const xpResult = await this._recalcAndSaveXP(userId);

            res.json({
                message: "Archived",
                progress: finalProgress,
                totalXp: xpResult.totalXp,
                newLevel: xpResult.newLevel,
                rewardGranted: xpResult.rewardGranted
            });
        } catch (e) {
            console.error("Archive Error:", e);
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