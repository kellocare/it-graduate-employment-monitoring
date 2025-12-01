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
            // Уровень считается каждые 500 XP
            const oldLevel = Math.floor(currentDbXp / 500) + 1;
            const newLevel = Math.floor(totalXp / 500) + 1;

            let newRewards = [...currentRewards];
            let rewardGranted = null;

            // Если уровень вырос
            if (newLevel > oldLevel) {
                // 🔥 РАСШИРЕННАЯ КАРТА НАГРАД (30 уровней)
                const rewardsMap = {
                    2:  { id: 'frame_blue', name: '🎨 Синяя рамка' },
                    3:  { id: 'ai_token', name: '📄 AI-разбор резюме (токен)' },
                    4:  { id: 'badge_fast', name: '⚡ Бейдж "Быстрый старт"' },
                    5:  { id: 'frame_green', name: '🌿 Эко-рамка' },
                    6:  { id: 'effect_confetti', name: '🎉 Эффект "Конфетти"' },
                    7:  { id: 'profile_boost', name: '🚀 Буст профиля в поиске' },
                    8:  { id: 'badge_book', name: '📚 Бейдж "Теоретик"' },
                    9:  { id: 'frame_gold', name: '🏆 Золотая рамка' },
                    10: { id: 'theme_dark', name: '🕶 Тёмная тема' },
                    11: { id: 'effect_snow', name: '❄ Эффект "Холод"' },
                    12: { id: 'badge_puzzle', name: '🧩 Бейдж "Problem Solver"' },
                    13: { id: 'frame_red', name: '🔴 Красная рамка агрессора' },
                    14: { id: 'ai_token_pro', name: '🤖 AI-ментор (токен)' },
                    15: { id: 'badge_top', name: '🌟 Бейдж "Топ-талант"' },
                    16: { id: 'effect_fire', name: '🔥 Эффект "В огне"' },
                    17: { id: 'frame_neon', name: '👾 Неоновая кибер-рамка' },
                    18: { id: 'badge_rocket', name: '🚀 Бейдж "На взлет"' },
                    19: { id: 'theme_matrix', name: '📟 Тема "Матрица"' },
                    20: { id: 'mentor_status', name: '🎓 Статус Ментора' },
                    21: { id: 'effect_lightning', name: '⚡ Эффект "Молнии"' },
                    22: { id: 'frame_diamond', name: '💎 Алмазная рамка' },
                    23: { id: 'badge_star', name: '⭐ Бейдж "Суперзвезда"' },
                    24: { id: 'effect_rainbow', name: '🌈 Эффект "Радуга"' },
                    25: { id: 'frame_cyber', name: '🤖 Рамка "Киберпанк"' },
                    26: { id: 'badge_guru', name: '🧙‍♂️ Бейдж "Гуру кода"' },
                    27: { id: 'effect_matrix', name: '🟢 Эффект "Код"' },
                    28: { id: 'frame_royal', name: '👑 Королевская рамка' },
                    29: { id: 'theme_gold', name: '🥇 Тема "Лакшери"' },
                    30: { id: 'crown_animated', name: '🤴 Анимированная Корона' }
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

            await db.query(
                'INSERT INTO chat_messages (user_id, role, content, mode) VALUES ($1, $2, $3, $4)',
                [userId, 'user', message, currentMode]
            );

            const gradRes = await db.query(`SELECT g.first_name FROM graduates g WHERE g.user_id = $1`, [userId]);
            const studentName = gradRes.rows[0]?.first_name || 'Кандидат';

            let systemPrompt = "";

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
                const vacanciesRes = await db.query('SELECT title FROM vacancies ORDER BY created_at DESC LIMIT 5');
                const vacs = vacanciesRes.rows.map(v => `- ${v.title}`).join('\n');
                systemPrompt = `Ты карьерный консультант. Вакансии:\n${vacs}`;
            }

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

    generateRoadmap = async (req, res) => {
        try {
            const { role } = req.body;
            const userId = req.user.id;
            if (!role) return res.status(400).json({ message: "Укажите роль" });

            console.log(`🤖 Generating Smart Roadmap for: ${role}...`);

            const currentRes = await db.query('SELECT roadmap_data FROM graduates WHERE user_id = $1', [userId]);
            let currentData = currentRes.rows[0]?.roadmap_data || { list: [], activeId: null };

            if (Array.isArray(currentData)) {
                currentData = { list: [{ id: 'legacy', role: 'Old Roadmap', nodes: currentData }], activeId: 'legacy' };
            }
            if (!currentData.list) currentData.list = [];

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
            let cleanJson = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
            let newNodes = JSON.parse(cleanJson);

            const validateNode = (node) => {
                if (!node.difficulty) node.difficulty = 'medium';
                if (!node.subtopics) node.subtopics = [];
                node.subtopics.forEach(s => {
                    s.done = false;
                    if (!s.xpEarned) s.xpEarned = 50;
                });
                node.data = { done: false };
            };
            newNodes.forEach(validateNode);

            const newTrackId = `track-${Date.now()}`;
            const newTrack = {
                id: newTrackId,
                role: role,
                created_at: new Date(),
                nodes: newNodes
            };

            currentData.list.push(newTrack);
            currentData.activeId = newTrackId;

            await db.query('UPDATE graduates SET roadmap_data = $1 WHERE user_id = $2', [JSON.stringify(currentData), userId]);

            await this._recalcAndSaveXP(userId);

            res.json(currentData);

        } catch (e) {
            console.error("Roadmap Error:", e);
            res.status(500).json({ message: "Ошибка генерации roadmap" });
        }
    }

    generateNodeQuiz = async (req, res) => {
        try {
            const { topic, description } = req.body;

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

    saveRoadmap = async (req, res) => {
        try {
            const userId = req.user.id;
            const { activeId, roadmapId, nodes } = req.body;

            const currentRes = await db.query('SELECT roadmap_data FROM graduates WHERE user_id = $1', [userId]);
            let data = currentRes.rows[0]?.roadmap_data;

            if (!data || !data.list) return res.status(400).json({message: "Нет данных"});

            if (activeId) {
                data.activeId = activeId;
            }

            if (roadmapId && nodes) {
                const trackIndex = data.list.findIndex(t => t.id === roadmapId);
                if (trackIndex !== -1) {
                    data.list[trackIndex].nodes = nodes;
                }
            }

            await db.query('UPDATE graduates SET roadmap_data = $1 WHERE user_id = $2', [JSON.stringify(data), userId]);

            const xpResult = await this._recalcAndSaveXP(userId);

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

    getRoadmap = async (req, res) => {
        try {
            const userId = req.user.id;
            const result = await db.query('SELECT roadmap_data FROM graduates WHERE user_id = $1', [userId]);
            let data = result.rows[0]?.roadmap_data;

            if (data && (Array.isArray(data) || (data.nodes && !data.list))) {
                const oldNodes = Array.isArray(data) ? data : data.nodes;
                const oldRole = data.role || "My Roadmap";
                const newId = 'default-id';

                const newData = {
                    activeId: newId,
                    list: [{ id: newId, role: oldRole, nodes: oldNodes }]
                };

                await db.query('UPDATE graduates SET roadmap_data = $1 WHERE user_id = $2', [JSON.stringify(newData), userId]);
                data = newData;
            }

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
            const { roadmapId } = req.body;

            const gradRes = await db.query('SELECT roadmap_data FROM graduates WHERE user_id = $1', [userId]);
            let currentData = gradRes.rows[0]?.roadmap_data;

            if (!currentData || !currentData.list) return res.status(400).json({ message: "Нет данных" });

            const trackIndex = currentData.list.findIndex(t => t.id === roadmapId);
            if (trackIndex === -1) return res.status(404).json({ message: "Трек не найден" });

            const trackToArchive = currentData.list[trackIndex];

            let total = 0;
            let done = 0;
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
            const finalProgress = total === 0 ? 0 : Math.round((done / total) * 100);

            await db.query(
                'INSERT INTO roadmap_history (user_id, role_title, progress, roadmap_data, completed_at) VALUES ($1, $2, $3, $4, NOW())',
                [
                    userId,
                    trackToArchive.role || 'Roadmap',
                    finalProgress,
                    JSON.stringify(trackToArchive.nodes)
                ]
            );

            currentData.list.splice(trackIndex, 1);

            if (currentData.activeId === roadmapId) {
                currentData.activeId = currentData.list.length > 0 ? currentData.list[currentData.list.length - 1].id : null;
            }

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
            const stats = await db.query(`
                SELECT 
                    (SELECT COUNT(*) FROM graduates) as total,
                    (SELECT COUNT(*) FROM graduates WHERE status='employed') as employed,
                    (SELECT AVG(salary) FROM graduates WHERE salary > 0) as salary
            `);

            const { total, employed, salary } = stats.rows[0];
            const rate = total > 0 ? Math.round((employed / total) * 100) : 0;

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

            const aiResponse = await aiService.getCompletion([{ role: 'user', content: prompt }]);

            res.json({ report: aiResponse });

        } catch (e) {
            console.error("University AI Error:", e);
            res.status(500).json({ message: "Ошибка генерации отчета" });
        }
    }
}

module.exports = new ChatController();