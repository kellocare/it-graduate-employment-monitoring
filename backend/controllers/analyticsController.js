const db = require('../db');

class AnalyticsController {
    async getStats(req, res) {
        try {
            // 1. Всего выпускников
            const totalGradsQuery = await db.query('SELECT COUNT(*) FROM graduates');
            const totalGrads = parseInt(totalGradsQuery.rows[0].count);

            // 2. Количество трудоустроенных сейчас
            // Ищем уникальных выпускников, у которых есть запись с is_current = true
            const employedQuery = await db.query(
                'SELECT COUNT(DISTINCT graduate_id) FROM employment_records WHERE is_current = true'
            );
            const employedCount = parseInt(employedQuery.rows[0].count);

            // 3. Средняя зарплата (только по текущим работам)
            const salaryQuery = await db.query(
                'SELECT AVG(salary_amount) FROM employment_records WHERE is_current = true'
            );
            const avgSalary = Math.round(parseFloat(salaryQuery.rows[0].avg || 0));

            // 4. Топ-5 компаний
            const topCompaniesQuery = await db.query(
                `SELECT c.name, COUNT(DISTINCT er.graduate_id) as hire_count 
                 FROM companies c 
                 JOIN employment_records er ON c.id = er.company_id 
                 GROUP BY c.name 
                 ORDER BY hire_count DESC 
                 LIMIT 5`
            );

            res.json({
                totalGrads,
                employedCount,
                employmentRate: totalGrads ? Math.round((employedCount / totalGrads) * 100) : 0,
                avgSalary,
                topCompanies: topCompaniesQuery.rows
            });

        } catch (e) {
            console.error(e);
            res.status(500).json({ message: 'Ошибка получения статистики' });
        }
    }
}

module.exports = new AnalyticsController();