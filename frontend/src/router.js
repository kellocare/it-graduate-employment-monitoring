import { createRouter, createWebHistory } from 'vue-router';
import Login from './views/Login.vue';
import Dashboard from './views/Dashboard.vue';
import Profile from './views/Profile.vue';
import Vacancies from './views/Vacancies.vue';
import Chat from './views/Chat.vue';

const routes = [
    { path: '/login', component: Login },
    { path: '/', component: Dashboard },
    { path: '/profile', component: Profile },
    { path: '/vacancies', component: Vacancies },
    { path: '/chat', component: Chat },
];

const router = createRouter({
    history: createWebHistory(),
    routes
});

export default router;