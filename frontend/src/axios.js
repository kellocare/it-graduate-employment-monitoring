import axios from 'axios';
import router from './router';

// Создаем экземпляр axios с базовым URL
const instance = axios.create({
    // ВАЖНО: Убедись, что порт совпадает с твоим Бэкендом (4000 или 5001)
    baseURL: 'http://127.0.0.1:4000/api'
});

// Перехватчик запросов (Interceptors)
instance.interceptors.request.use(config => {
    // Перед отправкой запроса берем токен из памяти
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Перехватчик ответов (если токен протух)
instance.interceptors.response.use(response => {
    return response;
}, error => {
    if (error.response && error.response.status === 401) {
        // Если сервер сказал "401 Unauthorized", значит токен плохой
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login'); // Выкидываем на вход
    }
    return Promise.reject(error);
});

export default instance;