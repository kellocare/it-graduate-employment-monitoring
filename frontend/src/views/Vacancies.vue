<template>
  <div class="page-container">
    <header class="page-header">
      <h1>📋 Биржа вакансий</h1>
      <div class="actions">
        <button @click="showCreateForm = !showCreateForm" class="btn-primary">
          {{ showCreateForm ? 'Скрыть форму' : '+ Создать вакансию' }}
        </button>
        <button @click="$router.push('/')" class="btn-back">На главную</button>
      </div>
    </header>

    <!-- Форма создания -->
    <div v-if="showCreateForm" class="create-card">
      <h3>Новая вакансия (AI анализ включен 🤖)</h3>
      <form @submit.prevent="createVacancy">
        <div class="form-group">
          <label>Компания</label>
          <select v-model="form.company_id" required>
            <option :value="null">Выберите компанию...</option>
            <option v-for="c in companies" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>
        <div class="form-group">
          <label>Название должности</label>
          <input v-model="form.title" required placeholder="Python Developer">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Мин. зарплата</label>
            <input type="number" v-model="form.salary_min">
          </div>
          <div class="form-group">
            <label>Email</label>
            <input v-model="form.contact_email">
          </div>
        </div>
        <div class="form-group">
          <label>Описание</label>
          <textarea v-model="form.description" rows="5" required></textarea>
        </div>
        <button type="submit" class="btn-save" :disabled="aiLoading">
          {{ aiLoading ? 'ИИ анализирует...' : 'Опубликовать' }}
        </button>
      </form>
    </div>

    <!-- Список вакансий -->
    <div v-if="loading" class="loading">Загрузка вакансий...</div>

    <div v-else class="vacancy-list">
      <div v-for="vac in vacancies" :key="vac.id" class="vacancy-card">
        <div class="vac-header">
          <h2>{{ vac.title }}</h2>
          <span class="salary" v-if="vac.salary_min">от {{ formatMoney(vac.salary_min) }} ₽</span>
        </div>
        <div class="vac-company">🏢 {{ vac.company_name }}</div>

        <div class="skills-cloud" v-if="vac.skills && vac.skills[0]">
          <span v-for="skill in vac.skills" :key="skill" class="skill-tag">{{ skill }}</span>
        </div>

        <div class="vac-desc">{{ vac.description }}</div>

        <div class="vac-footer">
          <span class="date">📅 {{ formatDate(vac.created_at) }}</span>
          <button class="btn-apply" @click="startApplication(vac.id)">Откликнуться (Пройти тест)</button>
        </div>
      </div>
    </div>

    <!-- МОДАЛЬНОЕ ОКНО -->
    <div v-if="showTestModal" class="modal-overlay">
      <div class="modal-content">

        <!-- 1. Загрузка -->
        <div v-if="testLoading" class="modal-body center">
          <div class="spinner">🧠</div>
          <h3>ИИ генерирует тестовое задание...</h3>
          <p>Пожалуйста, подождите, это может занять 10-15 секунд.</p>
        </div>

        <!-- 2. Форма с вопросами -->
        <div v-else-if="currentApplication && !testResult" class="modal-body">
          <h3>📝 Отклик на вакансию</h3>
          <p class="subtitle">Заполните форму, чтобы отправить заявку работодателю.</p>

          <!-- Сопроводительное письмо -->
          <div class="form-group mt-20">
            <label>Сопроводительное письмо (по желанию)</label>
            <textarea
              v-model="coverLetter"
              rows="3"
              placeholder="Расскажите, почему вы хотите работать у нас..."
              class="answer-input"
            ></textarea>
          </div>

          <hr>
          <h4>⚡ Блиц-тест от ИИ</h4>

          <div class="questions-list">
             <div v-for="(question, index) in currentApplication.test_tasks" :key="index" class="question-item">
              <p class="q-text"><strong>Вопрос {{ index + 1 }}:</strong> {{ question }}</p>
              <textarea
                v-model="studentAnswers[index]"
                rows="2"
                placeholder="Ваш ответ..."
                class="answer-input"
              ></textarea>
            </div>
          </div>

          <div class="modal-actions">
            <button class="btn-submit" @click="submitAnswers" :disabled="submitting">
              {{ submitting ? 'Проверка...' : 'Отправить отклик' }}
            </button>
            <button class="btn-close-text" @click="cancelAndClose">Отмена</button>
          </div>
        </div>

        <!-- 3. Результат (ОБНОВЛЕННЫЙ БЛОК) -->
        <div v-else-if="testResult" class="modal-body result-box" :class="testResult.status">

          <!-- Оценка (оставляем, чтобы студент понимал свой уровень) -->
          <div class="score-circle">
            {{ testResult.ai_score }}
          </div>

          <!-- Текст зависит от статуса -->
          <div v-if="testResult.status === 'accepted'">
            <h3>✅ Заявка успешно отправлена!</h3>
            <p class="result-msg">
              Поздравляем! Ваши ответы прошли автоматическую проверку.
              Мы передали вашу анкету, контакты и сопроводительное письмо работодателю.
            </p>
            <p class="small-text">Ждите ответа на email: {{ userEmail }}</p>
          </div>

          <div v-else>
            <h3>❌ Не пройдено</h3>
            <p class="result-msg">
              К сожалению, автоматическая система оценила ваши ответы ниже проходного балла.
              Заявка не была передана работодателю.
            </p>
            <p class="small-text">
              Вы можете подтянуть знания и попробовать откликнуться снова (текущая попытка будет удалена).
            </p>
          </div>

          <button class="btn-close-main" @click="closeModal">Закрыть</button>
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
      vacancies: [],
      companies: [],
      loading: true,
      aiLoading: false,
      showCreateForm: false,

      showTestModal: false,
      testLoading: false,
      submitting: false,

      currentApplication: null,
      studentAnswers: [],
      coverLetter: '',
      testResult: null,
      userEmail: '', // Для отображения в результате

      form: { company_id: null, title: '', description: '', salary_min: null, contact_email: '' }
    };
  },
  async mounted() {
    // Достаем email юзера из памяти для красоты
    const userData = localStorage.getItem('user');
    if (userData) this.userEmail = JSON.parse(userData).email;

    await Promise.all([this.loadVacancies(), this.loadCompanies()]);
  },
  methods: {
    async loadVacancies() {
      try { const r = await api.get('/vacancies'); this.vacancies = r.data; }
      catch (e) { console.error(e); } finally { this.loading = false; }
    },
    async loadCompanies() {
      try { const r = await api.get('/dict/companies'); this.companies = r.data; } catch (e) {}
    },
    async createVacancy() {
      this.aiLoading = true;
      try {
        await api.post('/vacancies', this.form);
        alert('Вакансия создана!');
        this.showCreateForm = false;
        this.form = { company_id: null, title: '', description: '', salary_min: null, contact_email: '' };
        await this.loadVacancies();
      } catch (e) { alert('Ошибка создания'); } finally { this.aiLoading = false; }
    },

    async startApplication(vacancyId) {
      this.showTestModal = true;
      this.testLoading = true;
      this.currentApplication = null;
      this.testResult = null;
      this.studentAnswers = [];
      this.coverLetter = '';

      try {
        const response = await api.post('/applications/start', { vacancy_id: vacancyId });
        this.currentApplication = response.data;

        // Парсинг вопросов
        let tasks = this.currentApplication.test_tasks;
        if (!tasks) tasks = ['Ошибка. Попробуйте снова.'];
        else if (typeof tasks === 'string') {
             try {
                 if (tasks.startsWith('"')) tasks = JSON.parse(tasks);
                 tasks = JSON.parse(tasks);
             } catch(e) { tasks = [tasks]; }
        }
        else if (!Array.isArray(tasks)) tasks = [JSON.stringify(tasks)];

        this.currentApplication.test_tasks = tasks;
        this.studentAnswers = new Array(tasks.length).fill('');
      } catch (e) {
        alert(e.response?.data?.message || 'Ошибка.');
        this.showTestModal = false;
      } finally {
        this.testLoading = false;
      }
    },

    async submitAnswers() {
      if (this.studentAnswers.some(a => a.trim() === '')) {
        alert('Пожалуйста, ответьте на все вопросы.');
        return;
      }
      this.submitting = true;
      try {
        const response = await api.post('/applications/submit', {
          application_id: this.currentApplication.id,
          answers: this.studentAnswers,
          cover_letter: this.coverLetter
        });
        this.testResult = response.data;
      } catch (e) {
        alert('Ошибка отправки');
      } finally {
        this.submitting = false;
      }
    },

    async cancelAndClose() {
      if (this.currentApplication && this.currentApplication.id) {
        try {
          await api.post('/applications/cancel', { application_id: this.currentApplication.id });
        } catch (e) { console.error('Ошибка отмены', e); }
      }
      this.closeModal();
    },

    closeModal() {
      this.showTestModal = false;
    },

    formatMoney(val) { return new Intl.NumberFormat('ru-RU').format(val); },
    formatDate(val) { return new Date(val).toLocaleDateString('ru-RU'); }
  }
};
</script>

<style scoped>
/* Стили оставляем ТЕ ЖЕ, что были в прошлом шаге, они работают хорошо.
   Ничего менять в <style> не нужно, если ты уже заменил style.css и почистил scoped.
   Я продублирую только новые классы для результата.
*/
.page-container { max-width: 900px; margin: 0 auto; padding: 20px; color: #333; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
.page-header h1 { color: #2c3e50; margin: 0; }
button { cursor: pointer; font-family: inherit; }
.btn-primary { background: #3498db; color: white; padding: 10px 20px; border: none; border-radius: 6px; }
.btn-back { background: #95a5a6; color: white; padding: 10px 20px; border: none; border-radius: 6px; margin-left: 10px; }
.btn-save { background: #27ae60; color: white; padding: 12px 24px; border: none; border-radius: 6px; font-weight: bold; }
.btn-save:disabled { background: #95a5a6; cursor: not-allowed; }
.create-card { background: #ffffff; color: #333; padding: 20px; border-radius: 10px; margin-bottom: 30px; border: 1px solid #ddd; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
.form-group { margin-bottom: 15px; }
.form-row { display: flex; gap: 20px; }
.form-row .form-group { flex: 1; }
label { display: block; margin-bottom: 5px; font-weight: bold; color: #444; }
input, select, textarea { width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; font-family: inherit; background-color: #ffffff !important; color: #000000 !important; }
.vacancy-card { background: #ffffff; color: #333; padding: 25px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); margin-bottom: 20px; border: 1px solid #eee; }
.vac-header h2 { margin: 0; color: #2c3e50; }
.salary { color: #27ae60; font-weight: bold; font-size: 1.1em; }
.vac-company { color: #7f8c8d; margin-bottom: 10px; font-weight: bold; }
.vac-desc { white-space: pre-wrap; margin: 15px 0; line-height: 1.5; color: #333; }
.skills-cloud { display: flex; flex-wrap: wrap; gap: 8px; margin: 10px 0; }
.skill-tag { background: #e8f4fc; color: #2980b9; padding: 5px 10px; border-radius: 15px; font-size: 0.85em; font-weight: 600; }
.vac-footer { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f1f1f1; padding-top: 15px; }
.date { color: #999; font-size: 0.9em; }
.btn-apply { background: #8e44ad; color: white; border: none; padding: 8px 16px; border-radius: 4px; font-weight: bold; transition: 0.2s; }
.btn-apply:hover { background: #732d91; }
.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.6); display: flex; justify-content: center; align-items: center; z-index: 1000; }
.modal-content { background: #ffffff; color: #333; padding: 30px; border-radius: 12px; width: 90%; max-width: 600px; max-height: 90vh; overflow-y: auto; box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
.center { text-align: center; }
.spinner { font-size: 3em; animation: spin 2s infinite linear; margin-bottom: 20px; display: block; }
@keyframes spin { from {transform: rotate(0deg);} to {transform: rotate(360deg);} }
.question-item { margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 15px; }
.q-text { font-weight: bold; color: #000000; margin-bottom: 10px; font-size: 1.1em; }
.answer-input { width: 100%; padding: 10px; border: 1px solid #3498db; border-radius: 6px; min-height: 60px; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
.btn-submit { background: #27ae60; color: white; padding: 10px 20px; border: none; border-radius: 6px; font-weight: bold; }
.btn-close-text { background: #e74c3c; border: none; color: white; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: bold; }
.result-box { text-align: center; }
.score-circle { width: 80px; height: 80px; border-radius: 50%; background: #333; color: white; display: flex; justify-content: center; align-items: center; font-size: 2em; font-weight: bold; margin: 0 auto 20px; }
.result-box.accepted .score-circle { background: #2ecc71; }
.result-box.rejected .score-circle { background: #e74c3c; }
.btn-close-main { background: #333; color: white; padding: 10px 30px; border: none; border-radius: 6px; }
.mt-20 { margin-top: 20px; }
.result-msg { font-size: 1.1em; margin-bottom: 10px; line-height: 1.5; }
.small-text { font-size: 0.9em; color: #666; }
</style>