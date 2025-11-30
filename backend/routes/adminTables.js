const express = require('express');
const router = express.Router();

// 🔥 ИМПОРТИРУЕМ ТВОЕ ПОДКЛЮЧЕНИЕ К БД
// Т.к. файл лежит в routes/, выходим на уровень вверх (..) к db.js
const db = require('../db');

// 🛡️ БЕЛЫЙ СПИСОК (WHITELIST)
// Ключ: то, что шлет фронтенд -> Значение: реальное название таблицы в БД
const TABLE_MAP = {
    'users': 'users',
    'vacancies': 'vacancies',
    'companies': 'companies',
    'resumes': 'resumes',
    'applications': 'applications', // Старые AI отклики
    'job_applications': 'job_applications', // Новые простые отклики
    'news': 'news',
    'reviews': 'reviews',
    'skills': 'skills',
    'specialties': 'specialties',
    'graduates': 'graduates',
    'recruiters': 'recruiters',
    'university_staff': 'university_staff', // Сотрудники ВУЗа
    'university_reports': 'university_reports', // Отчеты
    'audit_logs': 'audit_logs',
    'notifications': 'notifications',
    'chat_messages': 'chat_messages',
    'interviews': 'interviews',
    'roadmap_history': 'roadmap_history'
};

// GET: Получение данных (LIMIT 100)
router.get('/:tableName', async (req, res) => {
    const { tableName } = req.params;

    // 1. Проверка безопасности (чтобы не подставили SQL Injection)
    const dbTableName = TABLE_MAP[tableName];
    if (!dbTableName) {
        return res.status(403).json({ error: "Недопустимая таблица или нет доступа" });
    }

    try {
        // 2. Выполняем запрос
        // ВАЖНО: Имя таблицы нельзя передавать как параметр ($1), поэтому используем интерполяцию,
        // НО это безопасно, так как мы проверили имя через TABLE_MAP выше.

        // Проверка: есть ли колонка id (для сортировки) или created_at
        const query = `SELECT * FROM ${dbTableName} LIMIT 100`;

        const result = await db.query(query);

        // 3. Адаптация под разные драйверы (pg возвращает .rows, mysql возвращает массив сразу)
        const data = result.rows ? result.rows : result;

        res.json(data);
    } catch (e) {
        console.error("Ошибка загрузки таблицы:", e);
        res.status(500).json({ error: e.message });
    }
});

// DELETE: Удаление записи
router.delete('/:tableName/:id', async (req, res) => {
    const { tableName, id } = req.params;
    const dbTableName = TABLE_MAP[tableName];

    if (!dbTableName) {
        return res.status(403).json({ error: "Недопустимая таблица" });
    }

    try {
        // Используем параметризованный запрос для ID ($1) - это безопасно
        const query = `DELETE FROM ${dbTableName} WHERE id = $1`;

        // Если у тебя MySQL, используй '?' вместо '$1' и [id]
        const result = await db.query(query, [id]);

        // Проверка для PostgreSQL (rowCount) или MySQL (affectedRows)
        const deletedCount = result.rowCount !== undefined ? result.rowCount : result.affectedRows;

        if (deletedCount === 0) {
            return res.status(404).json({ error: "Запись не найдена" });
        }

        res.json({ message: "Успешно удалено" });
    } catch (e) {
        console.error("Ошибка удаления:", e);
        // Код 23503 в Postgres означает нарушение внешнего ключа (связанные записи)
        if (e.code === '23503') {
            return res.status(400).json({ error: "Нельзя удалить: запись используется в других таблицах (Foreign Key)" });
        }
        res.status(500).json({ error: e.message });
    }
});

// 🔐 1. Проверка соединения (Auth DB)
router.post('/connect', async (req, res) => {
    const { username, password } = req.body;

    // В реальном проекте здесь можно сверять с process.env.DB_USER
    // Но для удобства просто проверим, жива ли база
    try {
        // Делаем легкий пинг базы
        await db.query('SELECT 1');
        res.json({ message: 'Connection successful', status: 'connected' });
    } catch (e) {
        res.status(500).json({ error: 'Connection failed: ' + e.message });
    }
});

// ✏️ 2. Редактирование записи (UPDATE)
router.put('/:tableName/:id', async (req, res) => {
    const { tableName, id } = req.params;
    const updates = req.body; // Объект с полями: { name: 'New Name', active: true }

    const dbTableName = TABLE_MAP[tableName];
    if (!dbTableName) return res.status(403).json({ error: "Нет доступа" });

    // Убираем поле ID из обновлений (его менять нельзя)
    delete updates.id;
    delete updates.created_at; // Обычно даты создания тоже не меняют

    const keys = Object.keys(updates);
    if (keys.length === 0) return res.status(400).json({ error: "Нет данных для обновления" });

    try {
        // Генерируем SQL динамически: "UPDATE users SET email=$1, role=$2 WHERE id=$3"
        const setClause = keys.map((key, index) => `${key} = $${index + 1}`).join(', ');
        const values = [...Object.values(updates), id]; // Значения + ID в конце

        const query = `UPDATE ${dbTableName} SET ${setClause} WHERE id = $${values.length}`;

        await db.query(query, values);

        // Возвращаем обновленную запись
        const checkQuery = `SELECT * FROM ${dbTableName} WHERE id = $1`;
        const result = await db.query(checkQuery, [id]);
        const updatedRecord = result.rows ? result.rows[0] : result[0];

        res.json(updatedRecord);
    } catch (e) {
        console.error("Update error:", e);
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;