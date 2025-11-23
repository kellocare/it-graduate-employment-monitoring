import { createRouter, createWebHistory } from 'vue-router';
import Login from './views/Login.vue';
import Dashboard from './views/Dashboard.vue'; // Старый дашборд
import Home from './views/Home.vue'; // <--- Новый лендинг
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


const routes = [
    { path: '/', component: Home }, // Главная теперь Home
    { path: '/dashboard', component: Dashboard }, // Статистика теперь тут
    { path: '/login', component: Login },
    { path: '/profile', component: Profile },
    { path: '/vacancies', component: Vacancies },
    { path: '/chat', component: Chat },
    { path: '/employer', component: EmployerDashboard },
    { path: '/messages', component: Messages },
    { path: '/room/:roomId', component: VideoRoom },
    { path: '/top-companies', component: TopCompanies },
    {
    path: '/roadmap',
    name: 'Roadmap',
    component: Roadmap,
    meta: { requiresAuth: true }
    },
    {
    path: '/admin',
    component: AdminLayout,
    meta: { requiresAuth: true, role: 'admin' },
    children: [
      { path: '', component: AdminDashboard },
      { path: 'vacancies', component: AdminVacancies },
      { path: 'users', component: AdminUsers },
      { path: 'news', component: AdminNews }, // <--- Новое
      { path: 'logs', component: AdminLogs },  // <--- Новое
      { path: 'reviews', component: AdminReviews }
    ]
  }
];

const router = createRouter({
    history: createWebHistory(),
    routes
});

export default router;