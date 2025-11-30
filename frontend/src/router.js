import { createRouter, createWebHistory } from 'vue-router';
import Login from './views/Login.vue';
import Dashboard from './views/Dashboard.vue';
import Home from './views/Home.vue';
import Profile from './views/Profile.vue';
import Vacancies from './views/Vacancies.vue';
import Chat from './views/Chat.vue';
import EmployerDashboard from './views/EmployerDashboard.vue';
import Messages from './views/Messages.vue';
import VideoRoom from './views/VideoRoom.vue';
import AdminLayout from './components/AdminLayout.vue';
import AdminDashboard from './views/admin/AdminDashboard.vue';
import AdminVacancies from './views/admin/AdminVacancies.vue';
import AdminUsers from './views/admin/AdminUsers.vue';
import AdminNews from './views/admin/AdminNews.vue';
import AdminLogs from './views/admin/AdminLogs.vue';
import TopCompanies from './views/TopCompanies.vue';
import AdminReviews from './views/admin/AdminReviews.vue';
import Roadmap from './views/Roadmap.vue';
import AdminTables from './views/admin/AdminDataManager.vue';
import PublicProfile from './views/PublicProfile.vue';

// Ленивая загрузка компонентов ВУЗа
const UniversityDashboard = () => import('./views/Dashboard.vue');
const UniversityStudents = () => import('./views/Students.vue');
const UniversityLayout = () => import('./components/UniversityLayout.vue');
const UniversityReports = () => import('./views/ReportsCenter.vue');

const routes = [
    {
        path: '/',
        component: Home,
        meta: { title: 'Главная' }
    },
    {
        path: '/dashboard',
        component: Dashboard,
        meta: { title: 'Статистика' }
    },
    {
        path: '/login',
        component: Login,
        meta: { title: 'Вход' }
    },
    {
        path: '/profile',
        component: Profile,
        meta: { title: 'Мой профиль', requiresAuth: true }
    },
    {
        path: '/vacancies',
        component: Vacancies,
        meta: { title: 'Вакансии' }
    },
    {
        path: '/chat',
        component: Chat,
        meta: { title: 'AI Ассистент', requiresAuth: true }
    },
    {
        path: '/employer',
        component: EmployerDashboard,
        meta: { title: 'Кабинет работодателя', requiresAuth: true }
    },
    {
        path: '/messages',
        component: Messages,
        meta: { title: 'Сообщения', requiresAuth: true }
    },
    {
        path: '/room/:roomId',
        component: VideoRoom,
        meta: { title: 'Видеозвонок', requiresAuth: true }
    },
    {
        path: '/top-companies',
        component: TopCompanies,
        meta: { title: 'Топ компаний' }
    },
    {
        path: '/roadmap',
        name: 'Roadmap',
        component: Roadmap,
        meta: { title: 'Карта развития', requiresAuth: true }
    },
    {
        path: '/profile/:id',
        name: 'PublicProfile',
        component: PublicProfile,
        props: true,
        meta: { title: 'Профиль пользователя' }
    },
    {
        path: '/university',
        component: UniversityLayout,
        meta: { requiresAuth: true, role: 'university_staff' },
        children: [
            {
                path: 'dashboard',
                name: 'UniversityDashboard',
                component: UniversityDashboard,
                meta: { title: 'Дашборд ВУЗа' }
            },
            {
                path: 'students',
                name: 'UniversityStudents',
                component: UniversityStudents,
                meta: { title: 'Студенты' }
            },
            {
                path: 'reports',
                name: 'UniversityReports',
                component: UniversityReports,
                meta: { title: 'Центр отчетов' }
            }
        ]
    },
    {
        path: '/admin',
        component: AdminLayout,
        meta: { requiresAuth: true, role: 'admin' },
        children: [
            { path: '', component: AdminDashboard, meta: { title: 'Админ-панель' } },
            { path: 'vacancies', component: AdminVacancies, meta: { title: 'Управление вакансиями' } },
            { path: 'users', component: AdminUsers, meta: { title: 'Управление пользователями' } },
            { path: 'news', component: AdminNews, meta: { title: 'Новости' } },
            { path: 'logs', component: AdminLogs, meta: { title: 'Логи системы' } },
            { path: 'reviews', component: AdminReviews, meta: { title: 'Отзывы' } },
            { path: 'data', component: AdminTables, meta: { title: 'База данных' } }
        ]
    }
];

const router = createRouter({
    history: createWebHistory(),
    routes
});

// Глобальный хук для проверки авторизации и смены заголовка
router.beforeEach((to, from, next) => {
    // 1. Смена заголовка вкладки
    const defaultTitle = 'IT Monitor';
    document.title = to.meta.title ? `${to.meta.title} | ${defaultTitle}` : defaultTitle;

    // 2. Проверка токена
    const token = localStorage.getItem('token');
    if (to.meta.requiresAuth && !token) {
        next({ name: 'Login' });
    } else {
        // Здесь можно добавить проверку ролей (decode token), если нужно строже
        next();
    }
});

export default router;