const db = require('../db');
const aiService = require('../services/aiService');

class CandidateController {

    // 1. Получить список всех выпускников (у кого заполнен профиль)
    async getAllCandidates(req, res) {
        try {
            const employerId = req.user.id; // ID работодателя

            const candidates = await db.query(`
                SELECT g.id, g.user_id, g.first_name, g.last_name, g.about_me, 
                       s.name as specialty, g.portfolio_links, g.avatar_url,
                       i.status as invite_status  -- <--- НОВОЕ ПОЛЕ
                FROM graduates g
                LEFT JOIN specialties s ON g.specialty_id = s.id
                LEFT JOIN invitations i ON g.user_id = i.student_user_id AND i.employer_user_id = $1
                WHERE g.about_me IS NOT NULL AND g.about_me != ''
            `, [employerId]);

            res.json(candidates.rows);
        } catch (e) {
            console.error(e);
            res.status(500).json({ message: 'Ошибка получения списка' });
        }
    }

    // 2. AI Анализ конкретного кандидата
    async analyzeCandidate(req, res) {
        try {
            const { candidate_id } = req.body;
            const employerUserId = req.user.id;

            // Получаем данные студента
            const studRes = await db.query(`
                SELECT g.*, s.name as specialty_name 
                FROM graduates g
                LEFT JOIN specialties s ON g.specialty_id = s.id
                WHERE g.id = $1
            `, [candidate_id]);

            if (studRes.rows.length === 0) {
                return res.status(404).json({ message: 'Кандидат не найден' });
            }

            const student = studRes.rows[0];
            const studentText = `
                Имя: ${student.first_name} ${student.last_name}.
                Специальность: ${student.specialty_name}.
                О себе и навыки: ${student.about_me}.
                Портфолио: ${JSON.stringify(student.portfolio_links)}.
            `;

            // Получаем данные компании работодателя
            const compRes = await db.query('SELECT name, description FROM companies WHERE user_id = $1', [employerUserId]);
            const company = compRes.rows[0];

            const targetText = company
                ? `Компания: ${company.name}. Описание деятельности и требования: ${company.description}`
                : "Стандартная IT компания.";

            // Запускаем AI
            const match = await aiService.calculateMatch(studentText, targetText);

            res.json(match);

        } catch (e) {
            console.error(e);
            res.status(500).json({ message: 'Ошибка AI анализа' });
        }
    }

    // 3. Отправить приглашение (Уведомление)
    async inviteCandidate(req, res) {
        try {
            const senderId = req.user.id;
            const { candidate_user_id, message } = req.body;

            // Узнаем название компании
            const compRes = await db.query('SELECT name FROM companies WHERE user_id = $1', [senderId]);
            const companyName = compRes.rows[0]?.name || 'Работодатель';

            // Создаем уведомление в БД
            await db.query(
                `INSERT INTO notifications (user_id, sender_id, title, message, type) 
                 VALUES ($1, $2, $3, $4, 'invite')`,
                [candidate_user_id, senderId, `Приглашение от ${companyName}`, message]
            );

            res.json({ message: 'Приглашение успешно отправлено!' });
        } catch (e) {
            console.error(e);
            res.status(500).json({ message: 'Ошибка отправки приглашения' });
        }
    }
}

module.exports = new CandidateController();