const { OpenAI } = require("openai");

class AiService {
    constructor() {
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

    // ... МЕТОДЫ generateTestTasks, extractSkills и reviewTest ОСТАВЛЯЕМ БЕЗ ИЗМЕНЕНИЙ ...
    // (Скопируй их из своего старого файла или прошлого моего ответа)

    // На всякий случай дублирую один метод, чтобы ты видел, что логика не меняется:
    async extractSkills(vacancyDescription) {
        const prompt = `Извлеки технические навыки (hard skills) из текста. Только список через запятую. Текст: "${vacancyDescription}"`;
        const result = await this.getCompletion([{ role: "user", content: prompt }]);
        return result;
    }

    // Вставь сюда generateTestTasks и reviewTest из прошлого кода
    // ...
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