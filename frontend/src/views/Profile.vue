<template>
  <div class="profile-container">
    <h2>Мой профиль</h2>

    <div v-if="loading">Загрузка...</div>

    <div v-else class="profile-card">
      <!-- Режим просмотра -->
      <div v-if="!isEditing">
        <p><strong>Фамилия:</strong> {{ profile.last_name }}</p>
        <p><strong>Имя:</strong> {{ profile.first_name }}</p>
        <p><strong>Отчество:</strong> {{ profile.middle_name || '-' }}</p>
        <p><strong>Год выпуска:</strong> {{ profile.graduation_year || '-' }}</p>
        <p><strong>Портфолио:</strong>
          <a v-if="profile.portfolio_link" :href="profile.portfolio_link" target="_blank">Ссылка</a>
          <span v-else>-</span>
        </p>

        <button class="btn-edit" @click="enableEdit">Редактировать</button>
        <button class="btn-back" @click="$router.push('/')">На главную</button>
      </div>

      <!-- Режим редактирования -->
      <form v-else @submit.prevent="saveProfile">
        <div class="form-group">
          <label>Фамилия</label>
          <input v-model="form.last_name" required>
        </div>
        <div class="form-group">
          <label>Имя</label>
          <input v-model="form.first_name" required>
        </div>
        <div class="form-group">
          <label>Отчество</label>
          <input v-model="form.middle_name">
        </div>
        <div class="form-group">
          <label>Год выпуска</label>
          <input type="number" v-model="form.graduation_year" min="2000" max="2030">
        </div>
        <div class="form-group">
          <label>Ссылка на портфолио</label>
          <input v-model="form.portfolio_link" placeholder="https://github.com/...">
        </div>

        <div class="actions">
          <button type="submit" class="btn-save">Сохранить</button>
          <button type="button" class="btn-cancel" @click="cancelEdit">Отмена</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
// Импортируем НАШ настроенный axios, а не обычный
import api from '../axios';

export default {
  data() {
    return {
      profile: {}, // Данные для отображения
      form: {},    // Данные для формы редактирования
      loading: true,
      isEditing: false
    };
  },
  async mounted() {
    await this.loadData();
  },
  methods: {
    async loadData() {
      try {
        const response = await api.get('/graduates/me');
        this.profile = response.data;
      } catch (e) {
        alert('Ошибка загрузки профиля');
      } finally {
        this.loading = false;
      }
    },
    enableEdit() {
      // Копируем данные в форму, чтобы не менять оригинал сразу
      this.form = { ...this.profile };
      this.isEditing = true;
    },
    cancelEdit() {
      this.isEditing = false;
    },
    async saveProfile() {
      try {
        const response = await api.put('/graduates/me', this.form);
        this.profile = response.data; // Обновляем данные на странице
        this.isEditing = false;
        alert('Профиль сохранен!');
      } catch (e) {
        alert('Ошибка сохранения');
      }
    }
  }
};
</script>

<style scoped>
.profile-container {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}
.profile-card {
  border: 1px solid #ddd;
  padding: 20px;
  border-radius: 8px;
  background: #fff;
  color: #333; /* <--- ДОБАВИЛИ ЭТУ СТРОКУ (Темно-серый текст) */
  box-shadow: 0 2px 10px rgba(0,0,0,0.1); /* Можно добавить тень для красоты */
}
.form-group {
  margin-bottom: 15px;
}
label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}
input {
  width: 100%;
  padding: 8px;
  box-sizing: border-box;
}
button {
  padding: 8px 16px;
  margin-right: 10px;
  cursor: pointer;
  border: none;
  border-radius: 4px;
}
.btn-edit { background: #3498db; color: white; }
.btn-save { background: #2ecc71; color: white; }
.btn-cancel { background: #e74c3c; color: white; }
.btn-back { background: #95a5a6; color: white; }
</style>