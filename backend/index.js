require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');
const authRouter = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRouter);

app.get('/', (req, res) => {
    res.json({ message: 'Server is working correctly!' });
});

app.get('/api/test-db', async (req, res) => {
    try {
        const result = await db.query('SELECT NOW()');
        res.json({
            message: 'Database connection successful',
            time: result.rows[0].now
        });
    } catch (err) {
        console.error('DB Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Запуск сервера
const server = app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});

// Обработка ошибок, чтобы сервер не падал молча
server.on('error', (err) => {
    console.error('Server error:', err);
});