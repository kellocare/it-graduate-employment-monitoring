const db = require('../db');

class DictionaryController {
    async getSpecialties(req, res) {
        try {
            const result = await db.query('SELECT * FROM specialties ORDER BY code');
            res.json(result.rows);
        } catch (e) {
            console.error(e);
            res.status(500).json({ message: 'Ошибка получения справочника' });
        }
    }

    async getCompanies(req, res) {
        try {
            const result = await db.query('SELECT * FROM companies ORDER BY name');
            res.json(result.rows);
        } catch (e) {
            console.error(e);
            res.status(500).json({ message: 'Ошибка получения списка компаний' });
        }
    }
}

module.exports = new DictionaryController();