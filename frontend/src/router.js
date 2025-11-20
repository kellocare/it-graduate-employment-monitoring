import { createRouter, createWebHistory } from 'vue-router';
import Login from './views/Login.vue';
import Dashboard from './views/Dashboard.vue';
import Profile from './views/Profile.vue'; // <--- ВОТ ЭТОЙ СТРОКИ НЕ ХВАТАЛО

const routes = [
    { path: '/login', component: Login },
    { path: '/', component: Dashboard },
    { path: '/profile', component: Profile },
];

const router = createRouter({
    history: createWebHistory(),
    routes
});

export default router;