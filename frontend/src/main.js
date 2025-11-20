import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

// Подключаем Ant Design Vue
import Antd from 'ant-design-vue';
// Подключаем CSS файл сброса и стилей (для версии 4.x)
import 'ant-design-vue/dist/reset.css';

import './style.css' // Твой глобальный файл стилей

const app = createApp(App);

app.use(router);
app.use(Antd); // <-- Активируем библиотеку
app.mount('#app');