const db = require('../db');

class GraduateController {
    // Получить мой профиль
    async getProfile(req, res) {
        try {
            const userId = req.user.id;

            // Джойним users, чтобы получить общие данные (пол, др, отчество)
            const profile = await db.query(
                `SELECT g.*,
                        u.email,
                        u.gender,
                        u.birth_date,
                        u.patronymic,
                        u.city as user_city,
                        u.is_verified,
                        s.code as specialty_code,
                        s.name as specialty_name,
                        g.xp, g.unlocked_rewards, g.equipped_rewards
                 FROM graduates g
                          JOIN users u ON g.user_id = u.id
                          LEFT JOIN specialties s ON g.specialty_id = s.id
                 WHERE g.user_id = $1`,
                [userId]
            );

            if (profile.rows.length === 0) {
                return res.status(404).json({message: 'Профиль не найден'});
            }

            const data = profile.rows[0];
            // Если в graduates города нет, берем из users
            if (!data.city && data.user_city) {
                data.city = data.user_city;
            }

            res.json(data);
        } catch (e) {
            console.error(e);
            res.status(500).json({message: 'Ошибка получения профиля'});
        }
    }

    // 🔥 НОВЫЙ МЕТОД: Надеть/Снять предмет
    async equipReward(req, res) {
        try {
            const userId = req.user.id;
            const { type, itemId } = req.body; // type: 'frame' | 'effect', itemId: 'frame_blue' или null (снять)

            // 1. Получаем текущие настройки
            const current = await db.query('SELECT equipped_rewards, unlocked_rewards FROM graduates WHERE user_id = $1', [userId]);
            let equipped = current.rows[0]?.equipped_rewards || {};
            const unlocked = current.rows[0]?.unlocked_rewards || [];

            // 2. Проверяем, куплен ли предмет (если мы его надеваем)
            if (itemId && !unlocked.includes(itemId)) {
                return res.status(403).json({ message: "Этот предмет еще не открыт!" });
            }

            // 3. Обновляем
            if (itemId) {
                equipped[type] = itemId; // Надеваем
            } else {
                delete equipped[type]; // Снимаем
            }

            // 4. Сохраняем
            await db.query('UPDATE graduates SET equipped_rewards = $1 WHERE user_id = $2', [JSON.stringify(equipped), userId]);

            res.json({ success: true, equipped });
        } catch (e) {
            console.error(e);
            res.status(500).json({ message: "Ошибка сохранения" });
        }
    }

    // Обновить мой профиль
    async updateProfile(req, res) {
        try {
            const userId = req.user.id;
            const {
                first_name, last_name, middle_name,
                patronymic, // Новое поле с фронта
                graduation_year,
                portfolio_links,
                specialty_id, about_me, phone, city, telegram,
                birth_date, gender, education_level, faculty
            } = req.body;

            const linksJson = typeof portfolio_links === 'string'
                ? portfolio_links
                : JSON.stringify(portfolio_links || []);

            // Приоритет: patronymic (новое) -> middle_name (старое)
            const finalPatronymic = patronymic || middle_name;

            // 1. Обновляем таблицу USERS
            await db.query(`
                UPDATE users
                SET phone      = $1,
                    telegram   = $2,
                    city       = $3,
                    gender     = $4,
                    birth_date = $5,
                    patronymic = $6
                WHERE id = $7
            `, [phone, telegram, city, gender, birth_date, finalPatronymic, userId]);

            // 2. Обновляем таблицу GRADUATES
            // ИСПРАВЛЕНИЕ: Нумерация параметров теперь последовательная ($1 ... $12)
            // Поле education_level пока не пишем, если колонки нет в БД, иначе раскомментируйте

            const updatedProfile = await db.query(
                `UPDATE graduates
                 SET first_name      = $1,
                     last_name       = $2,
                     middle_name     = $3,
                     graduation_year = $4,
                     portfolio_links = $5,
                     specialty_id    = $6,
                     about_me        = $7,
                     city            = $8,
                     phone           = $9,
                     telegram        = $10,
                     faculty         = $11
                 WHERE user_id = $12 RETURNING *`,
                [
                    first_name,      // $1
                    last_name,       // $2
                    finalPatronymic, // $3
                    graduation_year, // $4
                    linksJson,       // $5
                    specialty_id,    // $6
                    about_me,        // $7
                    city,            // $8
                    phone,           // $9
                    telegram,        // $10
                    faculty,         // $11
                    userId           // $12
                ]
            );

            // Если обновилось успешно
            if (updatedProfile.rows.length > 0) {
                res.json({
                    ...updatedProfile.rows[0],
                    gender,
                    birth_date,
                    patronymic: finalPatronymic,
                    education_level, // Возвращаем обратно, чтобы фронт не сбрасывал, даже если в БД не сохранили
                    email: req.user.email
                });
            } else {
                // Если записи в graduates не было (редкий кейс, но возможен при ручном создании юзера)
                res.status(404).json({message: 'Запись выпускника не найдена'});
            }

        } catch (e) {
            console.error("Update Profile Error:", e);
            res.status(500).json({message: 'Ошибка обновления профиля'});
        }
    }

    // Загрузка аватарки
    async uploadAvatar(req, res) {
        try {
            const userId = req.user.id;
            if (!req.file) return res.status(400).json({message: 'Файл не загружен'});
            const avatarUrl = '/uploads/' + req.file.filename;

            // Обновляем в users
            await db.query('UPDATE users SET avatar_url = $1 WHERE id = $2', [avatarUrl, userId]);
            // И в graduates для совместимости
            await db.query('UPDATE graduates SET avatar_url = $1 WHERE user_id = $2', [avatarUrl, userId]);

            res.json({avatar_url: avatarUrl});
        } catch (e) {
            console.error(e);
            res.status(500).json({message: 'Ошибка загрузки фото'});
        }
    }
}

module.exports = new GraduateController();