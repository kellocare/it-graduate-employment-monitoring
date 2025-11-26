const express = require('express');
const router = express.Router();
const db = require('../db'); // Проверь, что путь к db.js верный

// GET /api/users/:id/public-info
router.get('/:id/public-info', async (req, res) => {
    const userId = req.params.id;

    try {
        // 1. Базовые данные пользователя
        const userRes = await db.query('SELECT id, email, role FROM users WHERE id = $1', [userId]);

        if (userRes.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = userRes.rows[0];

        // Инициализируем дефолтные данные
        let profileData = {};
        let skills = [];
        let employment = [];
        let roadmapHistory = [];

        if (user.role === 'graduate') {
            // 2. Профиль студента
            const gradRes = await db.query(`
                SELECT id, first_name, last_name, city, about_me, avatar_url, telegram, graduation_year 
                FROM graduates WHERE user_id = $1
            `, [userId]);

            if (gradRes.rows.length > 0) {
                profileData = gradRes.rows[0];
                const graduateId = profileData.id;

                // --- БЛОК НАВЫКОВ (Безопасный) ---
                try {
                    // ВАЖНО: Проверь, есть ли у тебя таблица graduate_skills или student_skills?
                    // Если нет, этот запрос упадет, но мы поймаем ошибку и вернем пустой массив.
                    const skillsRes = await db.query(`
                        SELECT s.name FROM skills s
                        JOIN graduate_skills gs ON gs.skill_id = s.id
                        WHERE gs.graduate_id = $1
                    `, [graduateId]);
                    skills = skillsRes.rows.map(r => r.name);
                } catch (err) {
                    console.warn("⚠️ Ошибка загрузки навыков (проверь таблицу graduate_skills):", err.message);
                }

                // --- БЛОК ОПЫТА РАБОТЫ (Безопасный) ---
                try {
                    const empRes = await db.query(`
                        SELECT e.*, c.name as company_name 
                        FROM employment_records e
                        LEFT JOIN companies c ON e.company_id = c.id
                        WHERE e.graduate_id = $1
                        ORDER BY e.start_date DESC
                    `, [graduateId]);
                    employment = empRes.rows;
                } catch (err) {
                    console.warn("⚠️ Ошибка загрузки опыта работы:", err.message);
                }

                try {
                    const rhRes = await db.query(`
                        SELECT id, role_title, progress, completed_at 
                        FROM roadmap_history 
                        WHERE user_id = $1 
                        ORDER BY completed_at DESC
                    `, [userId]); // userId - это id из таблицы users
                    roadmapHistory = rhRes.rows;
                } catch (e) {
                    console.warn("Ошибка загрузки истории:", e.message);
                }

                // --- БЛОК ИСТОРИИ ОБУЧЕНИЯ (Безопасный) ---
                try {
                    const rhRes = await db.query(`
                        SELECT * FROM roadmap_history WHERE graduate_id = $1 ORDER BY completed_at DESC
                    `, [graduateId]);
                    roadmapHistory = rhRes.rows;
                } catch (err) {
                    console.warn("⚠️ Ошибка загрузки Roadmap:", err.message);
                }
            }
        } else if (user.role === 'employer') {
            // Профиль рекрутера
            try {
                const recRes = await db.query(`
                    SELECT first_name, last_name, position, avatar_url, telegram 
                    FROM recruiters WHERE user_id = $1
                `, [userId]);
                if (recRes.rows.length > 0) profileData = recRes.rows[0];
            } catch (err) {
                console.warn("⚠️ Ошибка загрузки профиля рекрутера:", err.message);
            }
        }

        // Сборка ответа
        const fullName = (profileData.first_name && profileData.last_name)
            ? `${profileData.first_name} ${profileData.last_name}`
            : user.email.split('@')[0];

        res.json({
            id: user.id,
            email: user.email,
            role: user.role,
            name: fullName,
            avatar_url: profileData.avatar_url || null,
            city: profileData.city || null,
            about_me: profileData.about_me || null,
            telegram: profileData.telegram || null,
            graduation_year: profileData.graduation_year || null,
            position: profileData.position || null,
            skills: skills,
            employment: employment,
            roadmapHistory: roadmapHistory
        });

    } catch (e) {
        console.error("🔥 CRITICAL ERROR in /users/public-info:", e);
        res.status(500).json({ error: 'Server error fetching profile' });
    }
});

module.exports = router;