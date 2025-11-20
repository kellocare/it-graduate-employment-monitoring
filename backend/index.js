require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');
const authRouter = require('./routes/authRoutes');
const graduateRouter = require('./routes/graduateRoutes');
const dictionaryRouter = require('./routes/dictionaryRoutes');
const employmentRouter = require('./routes/employmentRoutes');
const analyticsRouter = require('./routes/analyticsRoutes');
const aiRouter = require('./routes/aiRoutes');
const vacancyRouter = require('./routes/vacancyRoutes');
const applicationRouter = require('./routes/applicationRoutes');
const chatRouter = require('./routes/chatRoutes');
const employerRouter = require('./routes/employerRoutes');

const app = express();
const PORT = process.env.PORT || 4000; // Убедись, что тут или в .env стоит 4000

const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
app.use('/api/ai', aiRouter);
app.use('/api/vacancies', vacancyRouter);
app.use('/api/applications', applicationRouter);
app.use('/api/chat', chatRouter);
app.use('/api/employer', employerRouter);
app.use('/api/candidates', require('./routes/candidateRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/invites', require('./routes/inviteRoutes'));
app.use('/api/messages', require('./routes/messagesRoutes'));


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