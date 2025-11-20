import { createRouter, createWebHistory } from 'vue-router';
import Login from './views/Login.vue';
import Dashboard from './views/Dashboard.vue'; // Старый дашборд
import Home from './views/Home.vue'; // <--- Новый лендинг
import Profile from './views/Profile.vue';
import Vacancies from './views/Vacancies.vue';
import Chat from './views/Chat.vue';

const routes = [
    { path: '/', component: Home }, // Главная теперь Home
    { path: '/dashboard', component: Dashboard }, // Статистика теперь тут
    { path: '/login', component: Login },
    { path: '/profile', component: Profile },
    { path: '/vacancies', component: Vacancies },
    { path: '/chat', component: Chat },
];

const router = createRouter({
    history: createWebHistory(),
    routes
});

export default router;