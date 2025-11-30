const db = require('../db');
const aiService = require('../services/aiService');
const ExcelJS = require('exceljs');
const bcrypt = require('bcrypt');
const auditService = require('../services/auditService');

class AdminController {

    // --- 1. Статистика для Дашборда ---
    getStats = async (req, res) => {
        try {
            if (req.user.role !== 'admin') return res.status(403).json({ message: "Доступ запрещен" });

            const usersCount = await db.query('SELECT count(*) FROM users');
            const vacanciesCount = await db.query('SELECT count(*) FROM vacancies');
            const applicationsCount = await db.query('SELECT count(*) FROM applications');
            const companiesCount = await db.query('SELECT count(*) FROM companies');

            const chartData = await db.query(`
                SELECT to_char(created_at, 'Day') as day, count(*) as count
                FROM users
                WHERE created_at > current_date - interval '7 days'
                GROUP BY day, created_at::date
                ORDER BY created_at::date
            `);

            const topSkills = await db.query(`
                SELECT s.name, count(vs.skill_id) as count
                FROM vacancy_skills vs
                JOIN skills s ON vs.skill_id = s.id
                GROUP BY s.name
                ORDER BY count DESC
                LIMIT 5
            `);

            const roles = await db.query(`SELECT role, count(*) as count FROM users GROUP BY role`);

            res.json({
                counts: {
                    users: parseInt(usersCount.rows[0].count),
                    vacancies: parseInt(vacanciesCount.rows[0].count),
                    applications: parseInt(applicationsCount.rows[0].count),
                    companies: parseInt(companiesCount.rows[0].count)
                },
                chart: chartData.rows,
                skills: topSkills.rows,
                roles: roles.rows
            });

        } catch (e) {
            console.error("Admin Stats Error:", e);
            res.status(500).json({ message: "Ошибка получения статистики" });
        }
    }

    // --- 2. AI Отчет ---
    generateAiReport = async (req, res) => {
        try {
            if (req.user.role !== 'admin') return res.status(403).json({ message: "Нет доступа" });

            const stats = await this._getRawStatsForAi();

            const prompt = `
                Ты — главный бизнес-аналитик платформы по трудоустройству студентов IT-специальностей.
                ПОКАЗАТЕЛИ: Пользователей: ${stats.users}, Вакансий: ${stats.vacancies}, Откликов: ${stats.applications}, Топ навыки: ${stats.topSkills}.
                
                ЗАДАЧА: Напиши краткий аналитический отчет (Executive Summary) для ректората в формате Markdown.
                СТРУКТУРА:
                ### 📊 Состояние платформы
                ### 💡 Тренды рынка
                ### 🚀 Стратегическая рекомендация (1 совет)
            `;

            const report = await aiService.getCompletion([{ role: 'user', content: prompt }]);
            res.json({ report });

        } catch (e) {
            console.error("AI Report Error:", e);
            res.status(500).json({ message: "Не удалось сгенерировать отчет" });
        }
    }

    _getRawStatsForAi = async () => {
        const u = await db.query('SELECT count(*) FROM users');
        const v = await db.query("SELECT count(*) FROM vacancies WHERE status = 'active'");
        const a = await db.query('SELECT count(*) FROM applications');
        const s = await db.query(`
            SELECT s.name FROM vacancy_skills vs 
            JOIN skills s ON vs.skill_id = s.id 
            GROUP BY s.name ORDER BY count(vs.skill_id) DESC LIMIT 3
        `);

        return {
            users: u.rows[0].count,
            vacancies: v.rows[0].count,
            applications: a.rows[0].count,
            topSkills: s.rows.map(r => r.name).join(', ') || 'Нет данных'
        };
    }

    // --- 3. Список пользователей ---
    getAllUsers = async (req, res) => {
        try {
            if (req.user.role !== 'admin') return res.status(403).json({ message: "Нет доступа" });

            // 🔥 ДОБАВИЛ LEFT JOIN university_staff
            const result = await db.query(`
                SELECT u.id, u.email, u.role, u.is_verified, u.created_at, u.avatar_url,
                       g.first_name as g_name, g.last_name as g_last,
                       r.first_name as r_name, r.last_name as r_last,
                       s.full_name as s_name, s.university_name as s_uni
                FROM users u
                LEFT JOIN graduates g ON u.id = g.user_id
                LEFT JOIN recruiters r ON u.id = r.user_id
                LEFT JOIN university_staff s ON u.id = s.user_id
                ORDER BY u.created_at DESC
            `);

            const users = result.rows.map(u => {
                let name = 'Не указано';

                // Логика выбора имени в зависимости от роли
                if (u.role === 'employer') {
                    name = `${u.r_name || ''} ${u.r_last || ''}`.trim();
                } else if (u.role === 'graduate') {
                    name = `${u.g_name || ''} ${u.g_last || ''}`.trim();
                } else if (u.role === 'university_staff') {
                    name = u.s_name || 'Сотрудник ВУЗа';
                }

                return {
                    id: u.id,
                    email: u.email,
                    role: u.role,
                    is_verified: u.is_verified,
                    created_at: u.created_at,
                    avatar_url: u.avatar_url,
                    name: name || 'Без имени',
                    university: u.s_uni // Доп поле для вуза
                };
            });

            res.json(users);
        } catch (e) {
            console.error(e);
            res.status(500).json({ message: "Ошибка списка пользователей" });
        }
    }

    // --- 4. Удаление пользователя ---
    deleteUser = async (req, res) => {
        try {
            if (req.user.role !== 'admin') return res.status(403).json({ message: "Нет доступа" });
            const id = req.params.id;

            // Сначала узнаем кого удаляем, чтобы записать в лог
            const userCheck = await db.query('SELECT email FROM users WHERE id = $1', [id]);
            const userEmail = userCheck.rows[0]?.email || 'Unknown';

            await db.query('DELETE FROM users WHERE id = $1', [id]);

            // ПИШЕМ ЛОГ
            await auditService.log(req.user.id, 'DELETE_USER', id, `Удален пользователь ${userEmail}`);

            res.json({ message: "Пользователь удален" });
        } catch (e) {
            console.error(e);
            res.status(500).json({ message: "Ошибка удаления" });
        }
    }

    async getAuditLogs(req, res) {
        try {
            const logs = await db.query(`
                SELECT 
                    l.id, l.action, l.details, l.created_at, l.ip_address as ip,
                    u.email as admin_email
                FROM audit_logs l
                LEFT JOIN users u ON l.admin_id = u.id
                ORDER BY l.created_at DESC
                LIMIT 100
            `);
            res.json(logs.rows);
        } catch (e) {
            console.error(e);
            res.status(500).json({message: "Ошибка логов"});
        }
    }

    // --- 5. ЭКСПОРТ В EXCEL ---
    exportUsersExcel = async (req, res) => {
        try {
            if (req.user.role !== 'admin') return res.status(403).json({ message: "Нет доступа" });

            // Тот же запрос с JOIN
            const result = await db.query(`
                SELECT u.id, u.email, u.role, u.is_verified, u.created_at,
                       g.first_name as g_name, g.last_name as g_last,
                       r.first_name as r_name, r.last_name as r_last,
                       s.full_name as s_name
                FROM users u
                LEFT JOIN graduates g ON u.id = g.user_id
                LEFT JOIN recruiters r ON u.id = r.user_id
                LEFT JOIN university_staff s ON u.id = s.user_id
                ORDER BY u.created_at DESC
            `);

            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Пользователи');

            worksheet.columns = [
                { header: 'ID', key: 'id', width: 10 },
                { header: 'Роль', key: 'role', width: 20 },
                { header: 'Email', key: 'email', width: 30 },
                { header: 'Имя / Организация', key: 'name', width: 35 },
                { header: 'Статус', key: 'status', width: 15 },
                { header: 'Дата регистрации', key: 'date', width: 20 },
            ];

            worksheet.getRow(1).font = { bold: true };

            result.rows.forEach(u => {
                let name = '';
                let roleName = '';

                if (u.role === 'employer') {
                    name = `${u.r_name || ''} ${u.r_last || ''}`;
                    roleName = 'Работодатель';
                } else if (u.role === 'university_staff') {
                    name = u.s_name;
                    roleName = 'ВУЗ';
                } else if (u.role === 'admin') {
                    name = 'Administrator';
                    roleName = 'Админ';
                } else {
                    name = `${u.g_name || ''} ${u.g_last || ''}`;
                    roleName = 'Студент';
                }

                worksheet.addRow({
                    id: u.id,
                    role: roleName,
                    email: u.email,
                    name: name.trim() || 'Не указано',
                    status: u.is_verified ? 'Активен' : 'Не подтвержден',
                    date: new Date(u.created_at).toLocaleDateString('ru-RU')
                });
            });

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=users_report.xlsx');

            await workbook.xlsx.write(res);
            res.end();

        } catch (e) {
            console.error("Excel Export Error:", e);
            res.status(500).json({ message: "Ошибка экспорта" });
        }
    }

    // --- 6. ИМПОРТ СТУДЕНТОВ ИЗ EXCEL ---
    importUsersExcel = async (req, res) => {
        try {
            if (req.user.role !== 'admin') return res.status(403).json({ message: "Нет доступа" });
            if (!req.file) return res.status(400).json({ message: "Файл не загружен" });

            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(req.file.buffer);

            const worksheet = workbook.getWorksheet(1);
            let importedCount = 0;
            let errorsCount = 0;

            const rows = [];
            worksheet.eachRow((row, rowNumber) => {
                if (rowNumber > 1) rows.push(row);
            });

            for (const row of rows) {
                try {
                    const email = row.getCell(1).text?.trim();
                    const password = row.getCell(2).text?.trim() || 'student123';
                    const firstName = row.getCell(3).text?.trim();
                    const lastName = row.getCell(4).text?.trim();

                    if (!email) continue;

                    const check = await db.query('SELECT id FROM users WHERE email = $1', [email]);
                    if (check.rows.length > 0) {
                        errorsCount++;
                        continue;
                    }

                    const hashPassword = await bcrypt.hash(password, 5);

                    // ! ИСПРАВЛЕНО ЗДЕСЬ: password -> password_hash
                    const newUser = await db.query(
                        `INSERT INTO users (email, password_hash, role, is_verified, created_at) 
                         VALUES ($1, $2, 'graduate', true, NOW()) RETURNING id`,
                        [email, hashPassword]
                    );
                    const userId = newUser.rows[0].id;

                    await db.query(
                        `INSERT INTO graduates (user_id, first_name, last_name) VALUES ($1, $2, $3)`,
                        [userId, firstName, lastName]
                    );

                    importedCount++;
                } catch (err) {
                    console.error("Row Error:", err.message);
                    errorsCount++;
                }
            }

            res.json({
                message: `Импорт завершен. Успешно: ${importedCount}, Пропущено/Ошибок: ${errorsCount}`,
                success: true
            });

        } catch (e) {
            console.error("Import Error:", e);
            res.status(500).json({ message: "Ошибка обработки файла" });
        }
    }
}

module.exports = new AdminController();