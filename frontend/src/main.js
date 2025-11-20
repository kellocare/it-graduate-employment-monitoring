import { createApp } from 'vue'
import './style.css' // Если есть
import App from './App.vue'
import router from './router' // <-- Импортируем роутер

createApp(App)
    .use(router) // <-- Подключаем его
    .mount('#app')