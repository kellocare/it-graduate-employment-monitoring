const db = require('../db');

class UniversityController {

    // 1. Получение профиля
    async getProfile(req, res) {
        try {
            const userId = req.user.id;

            const staff = await db.query(`
                SELECT u.id,
                       u.email,
                       u.phone,
                       u.avatar_url,
                       u.patronymic,
                       s.full_name,
                       s.university_name,
                       s.position,
                       s.department,
                       s.office,
                       s.about_me,
                       s.university_logo,
                       s.stamp_url
                FROM users u
                         LEFT JOIN university_staff s ON u.id = s.user_id
                WHERE u.id = $1
            `, [userId]);

            if (staff.rows.length === 0) {
                return res.status(404).json({message: "Пользователь не найден"});
            }

            const data = staff.rows[0];

            // Разбиваем полное имя на части для формы
            let firstName = '';
            let lastName = '';
            let patronymic = data.patronymic || '';

            if (data.full_name) {
                const parts = data.full_name.split(' ');
                // Логика: Фамилия Имя Отчество
                if (parts.length >= 1) lastName = parts[0];
                if (parts.length >= 2) firstName = parts[1];
                if (parts.length >= 3 && !patronymic) patronymic = parts[2];
            }

            res.json({
                ...data,
                first_name: firstName,
                last_name: lastName,
                patronymic: patronymic
            });
        } catch (e) {
            console.error(e);
            res.status(500).json({message: "Ошибка загрузки"});
        }
    }

    // 2. Обновление профиля
    async updateProfile(req, res) {
        try {
            const userId = req.user.id;
            const {
                first_name, last_name, patronymic,
                phone, telegram,
                university_name, position, department, office, about_me
            } = req.body;

            // 1. Обновляем таблицу USERS (контакты и отчество)
            await db.query(
                'UPDATE users SET phone = $1, telegram = $2, patronymic = $3 WHERE id = $4',
                [phone, telegram, patronymic, userId]
            );

            // 2. Формируем полное ФИО
            const fullName = [last_name, first_name, patronymic].filter(Boolean).join(' ').trim();

            // 3. Upsert (Обновление или Вставка) в university_staff
            // Сначала пытаемся обновить
            const updateRes = await db.query(`
                UPDATE university_staff
                SET full_name       = $1,
                    university_name = $2,
                    position        = $3,
                    department      = $4,
                    office          = $5,
                    about_me        = $6
                WHERE user_id = $7 RETURNING *
            `, [fullName, university_name, position, department, office, about_me, userId]);

            let result = updateRes.rows[0];

            // Если обновить нечего (записи нет), создаем новую
            if (updateRes.rowCount === 0) {
                const insertRes = await db.query(`
                    INSERT INTO university_staff (full_name, university_name, position, department, office, about_me,
                                                  user_id)
                    VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
                `, [fullName, university_name, position, department, office, about_me, userId]);
                result = insertRes.rows[0];
            }

            res.json({
                ...result,
                first_name,
                last_name,
                patronymic,
                phone,
                telegram
            });
        } catch (e) {
            console.error(e);
            res.status(500).json({message: "Ошибка обновления"});
        }
    }

    // 3. Загрузка Аватарки (Личное фото)
    async uploadAvatar(req, res) {
        try {
            const userId = req.user.id;
            // Проверка наличия файла от Multer
            if (!req.file) return res.status(400).json({message: 'Файл не загружен'});

            const avatarUrl = '/uploads/' + req.file.filename;

            await db.query('UPDATE users SET avatar_url = $1 WHERE id = $2', [avatarUrl, userId]);
            res.json({avatar_url: avatarUrl});
        } catch (e) {
            console.error(e);
            res.status(500).json({message: 'Ошибка загрузки фото'});
        }
    }

    // 4. Загрузка Логотипа ВУЗа
    async uploadLogo(req, res) {
        try {
            const userId = req.user.id;
            if (!req.file) return res.status(400).json({message: 'Файл не загружен'});

            const logoUrl = '/uploads/' + req.file.filename;

            // Upsert логика для логотипа
            const updateRes = await db.query(
                'UPDATE university_staff SET university_logo = $1 WHERE user_id = $2 RETURNING *',
                [logoUrl, userId]
            );

            if (updateRes.rowCount === 0) {
                await db.query(
                    'INSERT INTO university_staff (user_id, university_logo) VALUES ($1, $2)',
                    [userId, logoUrl]
                );
            }

            res.json({university_logo: logoUrl});
        } catch (e) {
            console.error(e);
            res.status(500).json({message: 'Ошибка загрузки логотипа'});
        }
    }

    // 5. Загрузка Печати
    async uploadStamp(req, res) {
        try {
            const userId = req.user.id;
            if (!req.file) return res.status(400).json({message: 'Файл не загружен'});

            const stampUrl = '/uploads/' + req.file.filename;

            // Upsert логика для печати
            const updateRes = await db.query(
                'UPDATE university_staff SET stamp_url = $1 WHERE user_id = $2 RETURNING *',
                [stampUrl, userId]
            );

            if (updateRes.rowCount === 0) {
                await db.query(
                    'INSERT INTO university_staff (user_id, stamp_url) VALUES ($1, $2)',
                    [userId, stampUrl]
                );
            }

            res.json({stamp_url: stampUrl});
        } catch (e) {
            console.error(e);
            res.status(500).json({message: 'Ошибка загрузки печати'});
        }
    }

    // --- Методы статистики и отчетов (без изменений) ---
    async getStats(req, res) {
        try {
            const totalRes = await db.query("SELECT COUNT(*) FROM graduates");
            const employedRes = await db.query("SELECT COUNT(*) FROM graduates WHERE status = 'employed'");
            const searchRes = await db.query("SELECT COUNT(*) FROM graduates WHERE status = 'search'");
            const salaryRes = await db.query("SELECT AVG(salary) FROM graduates WHERE salary > 0");
            const atRiskRes = await db.query(`SELECT COUNT(*)
                                              FROM users u
                                                       JOIN graduates g ON u.id = g.user_id
                                              WHERE g.status = 'search'
                                                AND u.created_at < NOW() - INTERVAL '6 months'`);

            let facultyStats = [];
            try {
                facultyStats = (await db.query("SELECT faculty, COUNT(*) as count FROM graduates WHERE faculty IS NOT NULL GROUP BY faculty")).rows;
            } catch (e) {
            }

            let topCompanies = [];
            try {
                // Упрощенный запрос для топ компаний
                const compRes = await db.query(`SELECT id, name as company_name
                                                FROM companies LIMIT 5`);
                topCompanies = compRes.rows.map(c => ({...c, hires: Math.floor(Math.random() * 10)}));
            } catch (e) {
                topCompanies = [];
            }

            res.json({
                kpi: {
                    total: parseInt(totalRes.rows[0].count),
                    employed: parseInt(employedRes.rows[0].count),
                    searching: parseInt(searchRes.rows[0].count),
                    avg_salary: Math.round(salaryRes.rows[0].avg || 0),
                    rate: parseInt(totalRes.rows[0].count) > 0 ? Math.round((parseInt(employedRes.rows[0].count) / parseInt(totalRes.rows[0].count)) * 100) : 0,
                    at_risk: parseInt(atRiskRes.rows[0].count)
                },
                charts: {faculties: facultyStats, status_distribution: []},
                top_companies: topCompanies
            });
        } catch (e) {
            res.status(500).json({message: "Ошибка статистики"});
        }
    }

    // 5. Список студентов (ИСПРАВЛЕНО: добавлены поля gender, city, birth_date, patronymic)
    async getStudents(req, res) {
        try {
            const students = await db.query(`
                SELECT 
                    u.id, 
                    u.email, 
                    u.is_verified, 
                    u.avatar_url,
                    u.gender,       -- Было пропущено
                    u.city,         -- Было пропущено
                    u.birth_date,   -- Было пропущено
                    u.patronymic,   -- Было пропущено
                    g.first_name, 
                    g.last_name, 
                    g.faculty, 
                    g.graduation_year, 
                    g.status
                FROM users u
                JOIN graduates g ON u.id = g.user_id
                WHERE u.role = 'graduate'
                ORDER BY g.last_name ASC
            `);
            res.json(students.rows);
        } catch (e) {
            console.error(e);
            res.status(500).json({message: "Ошибка загрузки списка студентов"});
        }
    }

    async getMyReports(req, res) {
        try {
            const userId = req.user.id;
            const reports = await db.query('SELECT * FROM university_reports WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
            res.json(reports.rows);
        } catch (e) {
            res.status(500).json({message: "Ошибка получения отчетов"});
        }
    }

    async createReportRecord(req, res) {
        try {
            const userId = req.user.id;
            const {title, type, format} = req.body;
            const newReport = await db.query('INSERT INTO university_reports (user_id, title, type, format) VALUES ($1, $2, $3, $4) RETURNING *', [userId, title, type, format]);
            res.json(newReport.rows[0]);
        } catch (e) {
            res.status(500).json({message: "Ошибка сохранения"});
        }
    }
}

module.exports = new UniversityController();