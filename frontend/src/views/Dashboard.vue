<template>
  <div>
    <header>
      <h1>Личный кабинет</h1>
      <div class="user-info" v-if="user">
        <span>Привет, {{ user.email }} ({{ user.role }})</span>
        <button @click="$router.push('/profile')" class="profile-btn">Мой профиль</button>
        <button @click="logout" class="logout-btn">Выйти</button>
      </div>
    </header>

    <main>
      <p>Добро пожаловать в систему мониторинга трудоустройства!</p>
      <p>Здесь скоро появятся графики и таблицы.</p>
    </main>
  </div>
</template>

<script>
export default {
  data() {
    return {
      user: null
    }
  },
  mounted() {
    // 1. Проверяем, есть ли токен
    const token = localStorage.getItem('token');
    if (!token) {
      // Если нет — отправляем на вход
      this.$router.push('/login');
      return;
    }

    // 2. Достаем данные пользователя из памяти
    const userData = localStorage.getItem('user');
    if (userData) {
      this.user = JSON.parse(userData);
    }
  },
  methods: {
    logout() {
      // Очищаем память и идем на логин
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      this.$router.push('/login');
    }
  }
}
</script>

<style scoped>
header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 2px solid #eee;
  padding-bottom: 10px;
  margin-bottom: 20px;
}
.logout-btn {
  background-color: #ff4444;
  color: white;
  border: none;
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;
  margin-left: 10px;
}
.profile-btn {
  background-color: #3498db;
  color: white;
  border: none;
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;
  margin-left: 10px;
}
</style>