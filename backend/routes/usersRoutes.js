const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/users/:id/public-info
router.get('/:id/public-info', async (req, res) => {
    const userId = req.params.id;

    try {
        // 1. Базовые данные пользователя из таблицы USERS
        // Добавили phone, avatar_url, telegram, city сюда, так как они могут быть общими
        const userRes = await db.query(`
            SELECT id, email, role, phone, avatar_url, telegram, city 
            FROM users WHERE id = $1
        `, [userId]);

        if (userRes.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = userRes.rows[0];

        // Инициализируем дефолтные данные
        let profileData = {};
        let skills = [];
        let employment = [];
        let roadmapHistory = [];

        // === РОЛЬ: СТУДЕНТ ===
        if (user.role === 'graduate') {
            const gradRes = await db.query(`
                SELECT id, first_name, last_name, patronymic, city, about_me, avatar_url, telegram, graduation_year, faculty
                FROM graduates WHERE user_id = $1
            `, [userId]);

            if (gradRes.rows.length > 0) {
                profileData = gradRes.rows[0];
                const graduateId = profileData.id;

                // Навыки
                try {
                    // Проверка таблицы с навыками (если есть)
                    const skillsRes = await db.query(`
                        SELECT s.name FROM skills s
                        JOIN graduate_skills gs ON gs.skill_id = s.id
                        WHERE gs.graduate_id = $1
                    `, [graduateId]).catch(() => ({ rows: [] })); // гасим ошибку, если таблицы нет
                    skills = skillsRes.rows.map(r => r.name);
                } catch (err) {}

                // Опыт работы
                try {
                    const empRes = await db.query(`
                        SELECT e.*, c.name as company_name 
                        FROM employment_records e
                        LEFT JOIN companies c ON e.company_id = c.id
                        WHERE e.graduate_id = $1
                        ORDER BY e.start_date DESC
                    `, [graduateId]);
                    employment = empRes.rows;
                } catch (err) {}

                // История обучения
                try {
                    const rhRes = await db.query(`
                        SELECT * FROM roadmap_history WHERE user_id = $1 ORDER BY completed_at DESC
                    `, [userId]);
                    roadmapHistory = rhRes.rows;
                } catch (err) {}
            }

        // === РОЛЬ: РЕКРУТЕР ===
        } else if (user.role === 'employer') {
            try {
                const recRes = await db.query(`
                    SELECT first_name, last_name, position, avatar_url, telegram 
                    FROM recruiters WHERE user_id = $1
                `, [userId]);
                if (recRes.rows.length > 0) profileData = recRes.rows[0];
            } catch (err) {}

        // === РОЛЬ: СОТРУДНИК ВУЗА (ДОБАВЛЕНО) ===
        } else if (user.role === 'university_staff') {
            try {
                const staffRes = await db.query(`
                    SELECT full_name, university_name, position, department, office, about_me
                    FROM university_staff WHERE user_id = $1
                `, [userId]);

                if (staffRes.rows.length > 0) {
                    const s = staffRes.rows[0];
                    // Разбиваем full_name на части для удобства
                    const parts = (s.full_name || '').split(' ');
                    const lastName = parts[0] || '';
                    const firstName = parts[1] || '';
                    const patronymic = parts.slice(2).join(' ') || '';

                    profileData = {
                        ...s,
                        first_name: firstName,
                        last_name: lastName,
                        patronymic: patronymic,
                        // Аватар берем из users (он уже загружен в переменную user)
                        avatar_url: user.avatar_url
                    };
                }
            } catch (err) {
                console.warn("Ошибка загрузки профиля вуза:", err.message);
            }
        }

        // Сборка ответа (ФИО)
        let fullName = user.email.split('@')[0]; // Дефолт
        if (profileData.first_name || profileData.last_name) {
            fullName = `${profileData.last_name || ''} ${profileData.first_name || ''} ${profileData.patronymic || ''}`.trim();
        }

        // Приоритет данных: Специфичная таблица -> Таблица users -> null
        res.json({
            id: user.id,
            email: user.email,
            role: user.role,
            name: fullName,

            // Личные данные (с приоритетом профиля)
            first_name: profileData.first_name,
            last_name: profileData.last_name,
            patronymic: profileData.patronymic,
            avatar_url: profileData.avatar_url || user.avatar_url || null,
            phone: user.phone || null,
            telegram: profileData.telegram || user.telegram || null,
            city: profileData.city || user.city || null,
            about_me: profileData.about_me || null,

            // Специфичные поля Студента/Рекрутера
            graduation_year: profileData.graduation_year || null,
            faculty: profileData.faculty || null,
            position: profileData.position || null, // Должность (Рекрутер или ВУЗ)

            // Специфичные поля ВУЗа
            university_name: profileData.university_name || null,
            department: profileData.department || null,
            office: profileData.office || null,

            // Списки
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