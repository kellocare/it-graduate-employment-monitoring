const db = require('../db');

class ResumeController {
    // Получить список резюме
    async getMyResumes(req, res) {
        try {
            const userId = req.user.id;
            const resumes = await db.query('SELECT * FROM resumes WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
            res.json(resumes.rows);
        } catch (e) { res.status(500).json({ message: "Error" }); }
    }

    // Загрузить файл (Multer уже должен быть настроен в роуте)
    async uploadResume(req, res) {
        try {
            if (!req.file) return res.status(400).json({ message: "Файл не выбран" });

            const userId = req.user.id;
            // В реальном проекте тут нужно сохранять файл на диск или S3.
            // Для простоты предположим, что multer сохранил его в 'uploads/'
            // и мы пишем путь.
            const filePath = `/uploads/${req.file.filename}`;
            const fileType = req.file.mimetype.includes('word') ? 'docx' : 'pdf';

            const newResume = await db.query(
                'INSERT INTO resumes (user_id, filename, file_path, type) VALUES ($1, $2, $3, $4) RETURNING *',
                [userId, req.file.originalname, filePath, fileType]
            );
            res.json(newResume.rows[0]);
        } catch (e) { res.status(500).json({ message: "Error upload" }); }
    }

    // Удалить
    async deleteResume(req, res) {
        try {
            await db.query('DELETE FROM resumes WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
            res.json({ message: "Deleted" });
        } catch (e) { res.status(500).json({ message: "Error" }); }
    }
}
module.exports = new ResumeController();