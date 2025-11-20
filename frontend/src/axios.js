import axios from 'axios';
import router from './router';

const instance = axios.create({
    baseURL: 'http://127.0.0.1:4000/api' // Убедись, что адрес верный
});

// Автоматическое добавление токена
instance.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) {
        // ВАЖНО: Пробел после Bearer обязателен!
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Обработка ошибок (выкидывание на логин)
instance.interceptors.response.use(response => {
    return response;
}, error => {
    if (error.response && error.response.status === 401) {
        console.warn('Токен протух или неверен, разлогиниваем...');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
    }
    return Promise.reject(error);
});

export default instance;