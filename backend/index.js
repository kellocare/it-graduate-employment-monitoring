require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path'); // Для работы с путями файлов
const db = require('./db');

// Импорт Middleware (ВАЖНО: нужно для защиты роутов)
const authMiddleware = require('./middleware/authMiddleware');

// Импорт роутеров и контроллеров
const newsRouter = require('./routes/newsRoutes');
const companiesRouter = require('./routes/companiesRoutes');
const resumeRoutes = require('./routes/resumeRoutes');
const interviewController = require('./controllers/interviewController');
const adminTablesRouter = require('./routes/adminTables');
const usersRouter = require('./routes/usersRoutes');
const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 5,
	message: { message: "Слишком много попыток входа. Попробуйте через 15 минут." }
});

const app = express();
const PORT = process.env.PORT || 4000;

// Настройки безопасности (CORS)
app.use(cors({ origin: '*' })); // Разрешаем запросы с любого фронтенда
app.use(express.json());

// Делаем папку uploads доступной для браузера (чтобы видеть аватарки)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ==============================================
// ПОДКЛЮЧЕНИЕ ВСЕХ МАРШРУТОВ (РОУТОВ)
// ==============================================

// 1. Авторизация и пользователи
app.use('/api/auth/', authLimiter);
app.use('/api/auth', require('./routes/authRoutes'));

// 2. Профиль выпускника
app.use('/api/graduates', require('./routes/graduateRoutes'));

// 3. Справочники (города, компании, навыки)
app.use('/api/dict', require('./routes/dictionaryRoutes'));

// 4. Опыт работы (Трудоустройство)
app.use('/api/employment', require('./routes/employmentRoutes'));

// 5. Аналитика для дашборда
app.use('/api/analytics', require('./routes/analyticsRoutes'));

// 6. Искусственный интеллект
app.use('/api/ai', require('./routes/aiRoutes'));

// 7. Вакансии
app.use('/api/vacancies', require('./routes/vacancyRoutes'));

// 8. Отклики и Тестирование
app.use('/api/applications', require('./routes/applicationRoutes'));

// 9. Чат-бот (AI консультант)
app.use('/api/chat', require('./routes/chatRoutes'));

// 10. Кабинет Работодателя (Компании)
app.use('/api/employer', require('./routes/employerRoutes'));

// 11. Поиск кандидатов (для HR)
app.use('/api/candidates', require('./routes/candidateRoutes'));

// 12. Уведомления
app.use('/api/notifications', require('./routes/notificationRoutes'));

// 13. Приглашения
app.use('/api/invites', require('./routes/inviteRoutes'));

// 14. Личные сообщения (Мессенджер)
app.use('/api/messages', require('./routes/messagesRoutes'));

// 15. Рекрутеры
app.use('/api/recruiters', require('./routes/recruiterRoutes'));

// 16. Админка
app.use('/api/admin', require('./routes/adminRoutes'));

// 17. Резюме (PDF)
app.use('/api/resumes', resumeRoutes);

// 18. Новости
app.use('/api/news', newsRouter);

// 19. Компании (публичный список)
app.use('/api/companies', companiesRouter);

// ==============================================
// СПЕЦИАЛЬНЫЕ РОУТЫ (Контроллеры напрямую)
// ==============================================

// Планирование интервью (добавил /api/ для единообразия)
app.post('/api/interviews/schedule', authMiddleware, interviewController.schedule);

app.use('/api/admin/tables', adminTablesRouter);

app.use('/api/users', usersRouter);



// Тестовый маршрут (проверка жизни сервера)
app.get('/', (req, res) => {
    res.json({ message: 'Server is running correctly!' });
});

// Запуск сервера
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server started on port ${PORT}`);
});