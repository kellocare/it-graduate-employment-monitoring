const { OpenAI } = require("openai");

class AiService {
    constructor() {
        // Инициализируем клиента.
        // Если ключа нет, сервис не упадет сразу, но выдаст ошибку при попытке вызова.
        this.client = new OpenAI({
            baseURL: "https://router.huggingface.co/v1",
            apiKey: process.env.HF_TOKEN,
        });

        // Используем модель, которую ты указал, или запасную (Qwen часто хорош для русского)
        this.model = "MiniMaxAI/MiniMax-M2:novita";
        // Альтернатива, если MiniMax будет капризничать: "Qwen/Qwen2.5-72B-Instruct"
    }

    // Умный метод с повторными попытками
    async getCompletion(messages) {
        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
            try {
                const completion = await this.client.chat.completions.create({
                    model: this.model,
                    messages: messages,
                    max_tokens: 1000,
                    temperature: 0.7,
                });

                const content = completion.choices[0].message.content;

                // Если ответ есть и он не пустой — возвращаем
                if (content && content.trim().length > 0) {
                    return content;
                }

                console.warn(`AI attempt ${attempts + 1} returned empty response. Retrying...`);

            } catch (error) {
                console.error(`AI attempt ${attempts + 1} failed:`, error.message);
                // Если ошибка 429 (Too Many Requests) или 503 — ждем немного
                await new Promise(r => setTimeout(r, 2000));
            }

            attempts++;
        }

        throw new Error("ИИ не отвечает после 3 попыток. Попробуйте позже.");
    }

    // Метод специально для извлечения навыков из вакансии
    async extractSkills(vacancyDescription) {
        const prompt = `
            Твоя задача - извлечь технические навыки (hard skills) из текста вакансии.
            
            Текст: "${vacancyDescription}"
            
            Верни ТОЛЬКО список навыков через запятую. Не пиши никаких вводных слов, не используй маркеры списка.
            Пример хорошего ответа: JavaScript, Node.js, PostgreSQL, Git, Docker
            Пример плохого ответа: Из текста можно выделить: JavaScript, Git...
        `;

        const result = await this.getCompletion([{ role: "user", content: prompt }]);
        return result; // Возвращает строку "Skill1, Skill2, Skill3"
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
            console.log("Raw AI response:", result);

            // Очистка от Markdown (```json ... ```)
            const cleanResult = result.replace(/```json/g, '').replace(/```/g, '').trim();

            // 1. Пробуем найти массив через регулярку
            const jsonMatch = cleanResult.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }

            // 2. Пробуем распарсить как есть
            return JSON.parse(cleanResult);

        } catch (e) {
            console.error("AI Error in generateTestTasks:", e);
            // Если совсем беда — возвращаем заглушку, чтобы сайт не ломался
            return [
                "Расскажите о вашем опыте работы с технологиями из вакансии.",
                "Почему вы хотите работать именно в нашей компании?"
            ];
        }
    }

    async reviewTest(questions, answers) {
        // Формируем текст диалога для проверки
        let qaText = "";
        questions.forEach((q, index) => {
            qaText += `Вопрос ${index + 1}: ${q}\nОтвет студента: ${answers[index] || "Нет ответа"}\n\n`;
        });

        const prompt = `
            Ты — строгий технический интервьюер. Тебе нужно проверить ответы кандидата на тестовое задание.
            
            ${qaText}
            
            Твоя задача:
            1. Оцени качество ответов по шкале от 0 до 100 (где 100 - идеально, 0 - полный бред).
            2. Напиши краткий конструктивный фидбек: что правильно, а где ошибка.
            
            Верни ответ СТРОГО в формате JSON:
            {
                "score": 85,
                "feedback": "Текст фидбека здесь..."
            }
        `;

        const result = await this.getCompletion([{ role: "user", content: prompt }]);
        console.log("AI Review Result:", result);

        try {
            // Очистка от markdown, если модель добавила ```json
            const cleanJson = result.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(cleanJson);
        } catch (e) {
            console.error("AI Review Parse Error", e);
            return { score: 0, feedback: "Ошибка автоматической проверки. Требуется ручной ревью." };
        }
    }
}

module.exports = new AiService();