require('dotenv').config();
const { OpenAI } = require("openai");

class AiService {
    constructor() {
        console.log("Groq Key check:", process.env.GROQ_API_KEY ? "Ключ есть" : "КЛЮЧ ОТСУТСТВУЕТ!");
        this.client = new OpenAI({
            baseURL: "https://api.groq.com/openai/v1",
            apiKey: process.env.GROQ_API_KEY,
        });

        // БЫЛО: "llama3-70b-8192" (Устарела)

        // СТАЛО: Самая новая и мощная модель на данный момент
        this.model = "llama-3.3-70b-versatile";

        // Если вдруг и она не пойдет, вот запасные варианты:
        // "llama-3.1-70b-versatile"
        // "mixtral-8x7b-32768"
    }

    // Метод с повторными попытками (оставляем, это полезно)
    async getCompletion(messages) {
        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
            try {
                const completion = await this.client.chat.completions.create({
                    model: this.model,
                    messages: messages,
                    // У Groq параметры немного другие, temperature можно оставить
                    temperature: 0.6,
                    max_tokens: 1024,
                });

                const content = completion.choices[0].message.content;

                if (content && content.trim().length > 0) {
                    return content;
                }
                console.warn(`AI attempt ${attempts + 1} returned empty response.`);
            } catch (error) {
                console.error(`AI attempt ${attempts + 1} failed:`, error.message);
                // Если ошибка 429 (лимит), Groq восстанавливается быстро
                await new Promise(r => setTimeout(r, 2000));
            }
            attempts++;
        }
        throw new Error("ИИ не отвечает. Попробуйте позже.");
    }

    async calculateMatch(studentProfile, vacancyDescription) {
        const prompt = `
            Ты — профессиональный HR-аналитик.
            
            ПРОФИЛЬ КАНДИДАТА:
            ${studentProfile}
            
            ОПИСАНИЕ ВАКАНСИИ / КОМПАНИИ:
            ${vacancyDescription}
            
            Твоя задача:
            1. Проанализируй, насколько кандидат подходит под требования.
            2. Оцени релевантность от 0 до 100.
            3. Напиши ОДНО короткое предложение с обоснованием.
            
            Верни СТРОГО JSON:
            {
                "score": 85,
                "reason": "Отличное знание стека, но мало опыта в коммерческой разработке."
            }
        `;

        try {
            // Используем тот же метод получения ответа, что и раньше
            const result = await this.getCompletion([{ role: "user", content: prompt }]);

            // Очистка от Markdown
            const cleanJson = result.replace(/```json/g, '').replace(/```/g, '').trim();

            // Попытка найти JSON в ответе
            const match = cleanJson.match(/\{[\s\S]*\}/);
            if (match) {
                return JSON.parse(match[0]);
            }
            return JSON.parse(cleanJson);
        } catch (e) {
            console.error("AI Match Error:", e);
            return { score: 0, reason: "Не удалось провести автоматический анализ." };
        }
    }

    async generateComplexTask(vacancyTitle, vacancyDescription) {
        const prompt = `
            Ты — Senior Tech Lead. Нам нужно проверить кандидата на позицию "${vacancyTitle}".
            Описание вакансии: "${vacancyDescription}".
            
            Составь подробное Тестовое Задание (Technical Task).
            
            Оно должно включать:
            1. Суть задачи (реальный кейс, например: разработать API, спроектировать БД, написать скрипт анализа).
            2. Технические требования (стек, библиотеки).
            3. Что должно быть в результате (код, диаграмма, ссылка на репозиторий).
            
            Формат вывода: Красивый MARKDOWN. Используй заголовки, списки, блоки кода.
            Не пиши вступлений, сразу само задание.
        `;

        return await this.getCompletion([{ role: "user", content: prompt }]);
    }

    // 2. Финальная оценка (Блиц + Решение)
    async evaluateFinal(vacancyTitle, blitzScore, blitzFeedback, solutionText) {
        const prompt = `
            Ты — нанимающий менеджер. Прими финальное решение по кандидату на позицию "${vacancyTitle}".
            
            ДАННЫЕ:
            1. Результат блиц-опроса: ${blitzScore}/100. Фидбек: ${blitzFeedback}.
            2. Решение большого тестового задания (описание от студента или контент): "${solutionText}".
            
            ЗАДАЧА:
            Проанализируй всё вместе. Если блиц был слабый, но тестовое крутое — дай шанс. Если всё плохо — отказ.
            
            ВЕРНИ JSON:
            {
                "decision": "HIRED" или "REJECTED",
                "message": "Текст сообщения кандидату от лица компании. Обоснуй решение вежливо и профессионально."
            }
        `;

        try {
            const result = await this.getCompletion([{ role: "user", content: prompt }]);
            const clean = result.replace(/```json/g, '').replace(/```/g, '').trim();
            const match = clean.match(/\{[\s\S]*\}/);
            return JSON.parse(match ? match[0] : clean);
        } catch (e) {
            return { decision: "REJECTED", message: "Ошибка анализа. Требуется ручной пересмотр." };
        }
    }

    async generateVacancySummary(title, description) {
        const prompt = `
            Проанализируй вакансию "${title}".
            Описание: "${description}".
            
            Напиши краткий инсайт (максимум 3 предложения) для кандидата:
            1. В чем суть работы (простыми словами).
            2. Какие главные технологии/навыки критичны.
            3. Какой тип личности ищется (например, "внимательный к деталям" или "коммуникабельный").
            
            Используй эмодзи. Формат: обычный текст, не Markdown.
        `;
        try {
            return await this.getCompletion([{ role: "user", content: prompt }]);
        } catch (e) {
            return "ИИ анализирует эту вакансию...";
        }
    }

    async extractSkills(vacancyDescription) {
        const prompt = `Извлеки технические навыки (hard skills) из текста. Только список через запятую. Текст: "${vacancyDescription}"`;
        const result = await this.getCompletion([{ role: "user", content: prompt }]);
        return result;
    }


    async generateTestTasks(vacancyTitle, vacancyDescription) {
        const prompt = `
            Ты — технический лид. Вакансия: "${vacancyTitle}". Описание: "${vacancyDescription}".
            Придумай 2 проверочных вопроса для кандидата.
            Верни ТОЛЬКО валидный JSON массив строк. Без Markdown.
            Пример: ["Вопрос 1", "Вопрос 2"]
        `;
        try {
            const result = await this.getCompletion([{ role: "user", content: prompt }]);
            const cleanResult = result.replace(/```json/g, '').replace(/```/g, '').trim();
            const jsonMatch = cleanResult.match(/\[[\s\S]*\]/);
            if (jsonMatch) return JSON.parse(jsonMatch[0]);
            return JSON.parse(cleanResult);
        } catch (e) {
            return ["Расскажите о вашем опыте.", "Почему вы хотите к нам?"];
        }
    }

    async reviewTest(questions, answers) {
        let qaText = "";
        questions.forEach((q, index) => { qaText += `Вопрос ${index + 1}: ${q}\nОтвет: ${answers[index] || "-"}\n\n`; });
        const prompt = `
            Проверь ответы кандидата.
            ${qaText}
            Верни JSON: { "score": 85, "feedback": "Текст..." }
        `;
        const result = await this.getCompletion([{ role: "user", content: prompt }]);
        try {
            const cleanJson = result.replace(/```json/g, '').replace(/```/g, '').trim();
            // Groq иногда добавляет лишний текст в конце, ищем фигурную скобку
            const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
            return JSON.parse(jsonMatch ? jsonMatch[0] : cleanJson);
        } catch (e) {
            return { score: 0, feedback: "Ошибка проверки." };
        }
    }
}

module.exports = new AiService();