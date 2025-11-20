require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');
const authRouter = require('./routes/authRoutes');
const graduateRouter = require('./routes/graduateRoutes');
const dictionaryRouter = require('./routes/dictionaryRoutes');
const employmentRouter = require('./routes/employmentRoutes');
const analyticsRouter = require('./routes/analyticsRoutes');

const app = express();
const PORT = process.env.PORT || 4000; // Убедись, что тут или в .env стоит 4000

// 1. Самый разрешающий CORS
app.use(cors({
    origin: '*', // Разрешить всем фронтендам
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
}));

app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/graduates', graduateRouter);
app.use('/api/dict', dictionaryRouter);
app.use('/api/employment', employmentRouter);
app.use('/api/analytics', analyticsRouter);

app.get('/', (req, res) => {
    res.json({ message: 'Server is working correctly!' });
});

// ... твой тест базы ...
app.get('/api/test-db', async (req, res) => {
    try {
        const result = await db.query('SELECT NOW()');
        res.json({ message: 'Database connection successful', time: result.rows[0].now });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Слушаем на 0.0.0.0 (IPv4 принудительно)
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server started on port ${PORT}`);
});