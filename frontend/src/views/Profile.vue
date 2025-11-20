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
        <p><strong>Специальность:</strong>&nbsp;
           <span v-if="profile.specialty_code">
             {{ profile.specialty_code }} - {{ profile.specialty_name }}
           </span>
           <span v-else>Не выбрана</span>
        </p>
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
          <label>Специальность</label>
          <select v-model="form.specialty_id" class="form-select">
            <option :value="null">Выберите специальность</option>
            <option v-for="spec in specialties" :key="spec.id" :value="spec.id">
              {{ spec.code }} - {{ spec.name }}
            </option>
          </select>
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

    <!-- Карточка Опыта работы -->
    <div class="profile-card mt-20">
      <div class="header-row">
        <h2>Опыт работы</h2>
        <button v-if="!showJobForm" @click="showJobForm = true" class="btn-add">+ Добавить</button>
      </div>

      <!-- Форма добавления работы -->
      <div v-if="showJobForm" class="job-form-box">
        <h3>Новое место работы</h3>
        <form @submit.prevent="addJob">
          <div class="form-group">
            <label>Компания</label>
            <select v-model="jobForm.company_id" required>
              <option :value="null">Выберите компанию...</option>
              <option v-for="c in companies" :key="c.id" :value="c.id">
                {{ c.name }} ({{ c.city }})
              </option>
            </select>
          </div>

          <div class="form-group">
            <label>Должность</label>
            <input v-model="jobForm.position_title" required placeholder="Например, Junior Developer">
          </div>

          <div class="form-group">
            <label>Зарплата (руб.)</label>
            <input type="number" v-model="jobForm.salary_amount" placeholder="80000">
          </div>

          <div class="form-group-row">
            <div>
              <label>Дата начала</label>
              <input type="date" v-model="jobForm.start_date" required>
            </div>
            <div class="checkbox-wrapper">
               <label>
                 <input type="checkbox" v-model="jobForm.is_current">
                 Работаю сейчас
               </label>
            </div>
          </div>

          <button type="submit" class="btn-save">Добавить</button>
          <button type="button" class="btn-cancel" @click="showJobForm = false">Отмена</button>
        </form>
      </div>

      <!-- Список работ -->
      <div v-if="employmentRecords.length === 0 && !showJobForm" class="empty-state">
        Записей пока нет. Добавьте свое первое место работы!
      </div>

      <div v-else class="job-list">
        <div v-for="job in employmentRecords" :key="job.id" class="job-item">
          <div class="job-info">
            <div class="job-title">{{ job.position_title }}</div>
            <div class="job-company">🏢 {{ job.company_name }} ({{ job.company_city }})</div>
            <div class="job-dates">
              📅 {{ formatDate(job.start_date) }} — {{ job.is_current ? 'По настоящее время' : formatDate(job.end_date) }}
            </div>
            <div class="job-salary" v-if="job.salary_amount">
              💰 {{ job.salary_amount }} ₽
            </div>
          </div>
          <button class="btn-delete" @click="deleteJob(job.id)">🗑</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import api from '../axios';

export default {
  data() {
    return {
      // Профиль
      profile: {},
      specialties: [],
      form: {},
      loading: true,
      isEditing: false,

      // Трудоустройство (Новое)
      employmentRecords: [],
      companies: [],
      showJobForm: false, // Открыта ли форма добавления работы
      jobForm: {
        company_id: null,
        position_title: '',
        salary_amount: null,
        start_date: '',
        is_current: true
      }
    };
  },
  async mounted() {
    await Promise.all([
      this.loadData(),
      this.loadSpecialties(),
      this.loadEmployment(), // <--- Загружаем стаж
      this.loadCompanies()   // <--- Загружаем список компаний
    ]);
  },
  methods: {
    // --- Методы Профиля (Оставляем как были) ---
    async loadData() {
      try {
        const response = await api.get('/graduates/me');
        this.profile = response.data;
      } catch (e) { console.error(e); }
      finally { this.loading = false; }
    },
    async loadSpecialties() {
      try {
        const response = await api.get('/dict/specialties');
        this.specialties = response.data;
      } catch (e) { console.error(e); }
    },
    enableEdit() {
      this.form = { ...this.profile };
      this.isEditing = true;
    },
    cancelEdit() {
      this.isEditing = false;
    },
    async saveProfile() {
      try {
        const response = await api.put('/graduates/me', this.form);
        this.profile = response.data;
        // Обновляем отображение специальности
        const selectedSpec = this.specialties.find(s => s.id === this.form.specialty_id);
        if (selectedSpec) {
          this.profile.specialty_code = selectedSpec.code;
          this.profile.specialty_name = selectedSpec.name;
        }
        this.isEditing = false;
        alert('Профиль сохранен!');
      } catch (e) {
        alert('Ошибка сохранения');
      }
    },

    // --- НОВЫЕ Методы Трудоустройства ---

    async loadEmployment() {
      try {
        const response = await api.get('/employment');
        this.employmentRecords = response.data;
      } catch (e) { console.error(e); }
    },
    async loadCompanies() {
      try {
        const response = await api.get('/dict/companies');
        this.companies = response.data;
      } catch (e) { console.error(e); }
    },
    async addJob() {
      try {
        if (!this.jobForm.company_id) {
          alert('Выберите компанию');
          return;
        }
        await api.post('/employment', this.jobForm);

        // Сброс формы и перезагрузка списка
        this.showJobForm = false;
        this.jobForm = { company_id: null, position_title: '', salary_amount: null, start_date: '', is_current: true };
        await this.loadEmployment();

        alert('Запись добавлена!');
      } catch (e) {
        alert('Ошибка добавления записи');
        console.error(e);
      }
    },
    async deleteJob(id) {
      if (!confirm('Удалить эту запись?')) return;
      try {
        await api.delete(`/employment/${id}`);
        await this.loadEmployment();
      } catch (e) {
        alert('Ошибка удаления');
      }
    },
    // Вспомогательный метод для красивой даты (обрезает время)
    formatDate(dateString) {
      if (!dateString) return 'Н.в.';
      return dateString.split('T')[0];
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
  color: #333; /* Темный текст для самой карточки */
  box-shadow: 0 4px 15px rgba(0,0,0,0.1);
}

.form-group {
  margin-bottom: 15px;
}

label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
  color: #555;
}

/* ВАЖНО: Принудительные стили для полей ввода, чтобы они не были черными */
input, select {
  width: 100%;
  padding: 10px;
  box-sizing: border-box;
  background-color: #ffffff !important; /* Белый фон */
  color: #000000 !important;            /* Черный текст */
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 14px;
}

/* Стиль при наведении/фокусе */
input:focus, select:focus {
  outline: none;
  border-color: #3498db;
}

button {
  padding: 10px 20px;
  margin-right: 10px;
  cursor: pointer;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: bold;
}

.btn-edit { background: #3498db; color: white; }
.btn-save { background: #2ecc71; color: white; }
.btn-cancel { background: #e74c3c; color: white; }
.btn-back { background: #95a5a6; color: white; }

/* Отступ для второй карточки */
.mt-20 {
  margin-top: 20px;
}

.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.job-form-box {
  background: #f9f9f9;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
  border: 1px solid #eee;
}

.form-group-row {
  display: flex;
  gap: 20px;
  align-items: center;
  margin-bottom: 15px;
}

.checkbox-wrapper input {
  width: auto; /* Чтобы чекбокс был маленьким */
  margin-right: 5px;
}

.job-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 15px;
  border-bottom: 1px solid #eee;
}
.job-item:last-child {
  border-bottom: none;
}

.job-title { font-weight: bold; font-size: 1.1em; color: #2c3e50; }
.job-company { color: #555; margin-top: 4px; }
.job-dates { font-size: 0.9em; color: #777; margin-top: 4px; }
.job-salary { font-weight: bold; color: #27ae60; margin-top: 5px; }

.btn-add {
  background-color: #3498db;
  color: white;
  padding: 5px 15px;
  border-radius: 20px;
  font-size: 0.9em;
}

.btn-delete {
  background: transparent;
  color: #e74c3c;
  font-size: 1.2em;
  padding: 0 5px;
}
.btn-delete:hover {
  background: #ffebeb;
}

.empty-state {
  text-align: center;
  color: #999;
  padding: 20px;
}
</style>