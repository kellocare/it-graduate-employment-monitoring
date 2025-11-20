<template>
  <div class="login-container">
    <div class="card">
      <h2>Вход в систему</h2>
      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label>Email:</label>
          <input
            v-model="email"
            type="email"
            required
            placeholder="student@example.com"
          >
        </div>
        <div class="form-group">
          <label>Пароль:</label>
          <input
            v-model="password"
            type="password"
            required
            placeholder="Ваш пароль"
          >
        </div>

        <div v-if="errorMessage" class="error">{{ errorMessage }}</div>

        <button type="submit" :disabled="isLoading">
          {{ isLoading ? 'Вход...' : 'Войти' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script>
import api from '../axios';

export default {
  data() {
    return {
      email: '',
      password: '',
      errorMessage: '',
      isLoading: false
    }
  },
  methods: {
    async handleLogin() {
      this.isLoading = true;
      this.errorMessage = '';

      try {
        const response = await api.post('/auth/login', {
          email: this.email,
          password: this.password
        });

        // 1. Если успех — сервер вернул токен
        const token = response.data.token;
        const user = response.data.user;

        // 2. Сохраняем токен в память браузера (localStorage)
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));

        // 3. Перенаправляем в личный кабинет
        this.$router.push('/');

      } catch (error) {
        console.error('ПОЛНАЯ ОШИБКА:', error);

        if (error.response) {
          // Сервер ответил, но с ошибкой (например, неверный пароль)
          alert(`Ошибка от сервера: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
          this.errorMessage = error.response.data.message;
        } else if (error.request) {
          // Запрос ушел, но ответа нет
          console.log('Запрос:', error.request);
          alert('Запрос отправлен, но сервер молчит. Проверь консоль (F12).');
          this.errorMessage = 'Сервер не отвечает';
        } else {
          // Ошибка настройки запроса
          alert(`Ошибка настройки: ${error.message}`);
          this.errorMessage = error.message;
        }
      } finally {
        this.isLoading = false;
      }
    }
  }
}
</script>

<style scoped>
/* Немного красоты */
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 80vh;
}
.card {
  border: 1px solid #ccc;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  width: 300px;
}
.form-group {
  margin-bottom: 15px;
}
input {
  width: 100%;
  padding: 8px;
  margin-top: 5px;
  box-sizing: border-box;
}
button {
  width: 100%;
  padding: 10px;
  background-color: #42b983;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
button:disabled {
  background-color: #a0dca0;
}
.error {
  color: red;
  margin-bottom: 10px;
  font-size: 0.9em;
}
</style>