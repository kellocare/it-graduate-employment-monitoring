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
];

const router = createRouter({
    history: createWebHistory(),
    routes
});

export default router;