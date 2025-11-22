<template>
  <div class="page-container">
    <header class="page-header">
      <h1><solution-outlined /> Биржа вакансий</h1>

      <div class="actions">
        <button
          v-if="user && user.role !== 'graduate'"
          @click="showCreateForm = !showCreateForm"
          class="btn-primary"
        >
          <plus-outlined v-if="!showCreateForm" />
          {{ showCreateForm ? 'Скрыть форму' : ' Создать вакансию' }}
        </button>
      </div>
    </header>

    <!-- Форма создания вакансии -->
    <div v-if="showCreateForm && user && user.role !== 'graduate'" class="create-card">

      <div class="form-header-row">
        <h3>Новая вакансия</h3>

        <!-- ТУМБЛЕР AI -->
        <div class="ai-toggle-wrapper">
          <span>AI Анализ навыков:</span>
          <a-switch v-model:checked="useAi" checked-children="ВКЛ" un-checked-children="ВЫКЛ" />
        </div>
      </div>

      <form @submit.prevent="createVacancy">
        <div class="form-group">
          <label>Компания</label>
          <div v-if="user.role === 'employer'">
             <a-input v-if="employersCompany" :value="employersCompany.name" disabled style="color: #333; font-weight: bold;" />
             <a-alert v-else message="Сначала создайте профиль компании в кабинете!" type="error" show-icon />
          </div>
          <a-select v-else v-model:value="form.company_id" placeholder="Выберите компанию" style="width: 100%">
            <a-select-option v-for="c in companies" :key="c.id" :value="c.id">{{ c.name }}</a-select-option>
          </a-select>
        </div>

        <div class="form-group">
          <label>Название должности</label>
          <a-input v-model:value="form.title" placeholder="Python Developer" />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Мин. зарплата</label>
            <a-input-number v-model:value="form.salary_min" style="width: 100%" />
          </div>
          <div class="form-group">
            <label>Email</label>
            <a-input v-model:value="form.contact_email" />
          </div>
        </div>

        <div class="form-group">
          <label>Описание</label>
          <a-textarea v-model:value="form.description" :rows="5" placeholder="Опишите задачи и требования..." />
        </div>

        <!-- ПОЛЕ РУЧНОГО ВВОДА НАВЫКОВ (Если AI выключен) -->
        <div class="form-group" v-if="!useAi">
          <label>Ключевые навыки (через запятую)</label>
          <a-input v-model:value="manualSkills" placeholder="Например: Python, Django, PostgreSQL, Docker" />
          <span class="hint">Введите навыки вручную, и они будут прикреплены к вакансии.</span>
        </div>

        <div class="form-group" v-else>
           <a-alert type="info" show-icon message="ИИ автоматически проанализирует описание и выделит навыки после публикации." banner />
        </div>

        <button type="submit" class="btn-save" :disabled="aiLoading">
          <loading-outlined v-if="aiLoading" />
          {{ aiLoading ? ' Обработка...' : 'Опубликовать' }}
        </button>
      </form>
    </div>

    <!-- Список вакансий -->
    <div v-if="loading" class="loading"><loading-outlined spin /> Загрузка вакансий...</div>

    <div v-else class="vacancy-list">
      <div v-for="vac in vacancies" :key="vac.id" class="vacancy-card">
        <div class="vac-header">
          <h2>{{ vac.title }}</h2>
          <span class="salary" v-if="vac.salary_min">от {{ formatMoney(vac.salary_min) }} ₽</span>
        </div>
        <div class="vac-company"><bank-outlined /> {{ vac.company_name }}</div>

        <div class="skills-cloud" v-if="vac.skills && vac.skills[0]">
          <span v-for="skill in vac.skills" :key="skill" class="skill-tag">{{ skill }}</span>
        </div>

        <div class="vac-desc">{{ vac.description }}</div>

        <div class="vac-footer">
          <span class="date"><calendar-outlined /> {{ formatDate(vac.created_at) }}</span>
          <button v-if="user && user.role === 'graduate'" class="btn-apply" @click="startApplication(vac.id)">
            Откликнуться (Пройти тест)
          </button>
        </div>
      </div>
    </div>

    <!-- МОДАЛЬНОЕ ОКНО ТЕСТА (Оставляем без изменений) -->
    <a-modal v-model:open="showTestModal" :footer="null" width="600px">
      <div class="modal-content-wrapper">
        <div v-if="testLoading" class="modal-body center">
          <div class="spinner-icon"><robot-outlined spin /></div>
          <h3>ИИ генерирует тестовое задание...</h3>
          <p>Пожалуйста, подождите, это может занять 10-15 секунд.</p>
        </div>
        <div v-else-if="currentApplication && !testResult" class="modal-body">
          <h3><form-outlined /> Отклик на вакансию</h3>
          <p class="subtitle">Заполните форму, чтобы отправить заявку работодателю.</p>
          <div class="form-group mt-20">
            <label>Сопроводительное письмо (по желанию)</label>
            <a-textarea v-model:value="coverLetter" :rows="3" placeholder="Расскажите, почему вы хотите работать у нас..." />
          </div>
          <a-divider />
          <h4><thunderbolt-two-tone two-tone-color="#fa8c16" /> Блиц-тест от ИИ</h4>
          <div class="questions-list">
             <div v-for="(question, index) in currentApplication.test_tasks" :key="index" class="question-item">
              <p class="q-text"><strong>Вопрос {{ index + 1 }}:</strong> {{ question }}</p>
              <a-textarea v-model:value="studentAnswers[index]" :rows="2" placeholder="Ваш ответ..." />
            </div>
          </div>
          <div class="modal-actions">
            <button class="btn-submit" @click="submitAnswers" :disabled="submitting">
              <loading-outlined v-if="submitting" /> {{ submitting ? ' Проверка...' : 'Отправить отклик' }}
            </button>
            <button class="btn-close-text" @click="cancelAndClose">Отмена</button>
          </div>
        </div>
        <div v-else-if="testResult" class="modal-body result-box" :class="testResult.status">
          <div class="score-circle">{{ testResult.ai_score }}</div>
          <div v-if="testResult.status === 'accepted'">
            <h3><check-circle-two-tone two-tone-color="#52c41a" /> Заявка успешно отправлена!</h3>
            <p class="result-msg">Поздравляем! Ваши ответы прошли автоматическую проверку.</p>
          </div>
          <div v-else>
            <h3><close-circle-two-tone two-tone-color="#eb2f96" /> Не пройдено</h3>
            <p class="result-msg">К сожалению, автоматическая система оценила ваши ответы ниже проходного балла.</p>
          </div>
          <button class="btn-close-main" @click="closeModal">Закрыть</button>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script>
import api from '../axios';
import { message } from 'ant-design-vue';
import {
  SolutionOutlined, PlusOutlined, RobotOutlined, LoadingOutlined,
  BankOutlined, CalendarOutlined, FormOutlined,
  ThunderboltTwoTone, CheckCircleTwoTone, CloseCircleTwoTone
} from '@ant-design/icons-vue';

export default {
  components: {
    SolutionOutlined, PlusOutlined, RobotOutlined, LoadingOutlined,
    BankOutlined, CalendarOutlined, FormOutlined,
    ThunderboltTwoTone, CheckCircleTwoTone, CloseCircleTwoTone
  },
  data() {
    return {
      user: null,
      vacancies: [],
      companies: [],
      loading: true,
      aiLoading: false,
      showCreateForm: false,
      employersCompany: null,

      // НОВЫЕ ПОЛЯ
      useAi: true,
      manualSkills: '',

      showTestModal: false,
      testLoading: false,
      submitting: false,
      currentApplication: null,
      studentAnswers: [],
      coverLetter: '',
      testResult: null,
      form: { company_id: null, title: '', description: '', salary_min: null, contact_email: '' }
    };
  },
  async mounted() {
    const userData = localStorage.getItem('user');
    if (userData) this.user = JSON.parse(userData);

    if (this.user && this.user.role === 'employer') {
       try {
         const r = await api.get('/employer/company');
         this.employersCompany = r.data;
         if (this.employersCompany && this.employersCompany.id) {
             this.form.company_id = this.employersCompany.id;
         }
       } catch (e) {}
    }
    await Promise.all([this.loadVacancies(), this.loadCompanies()]);
  },
  methods: {
    async loadVacancies() {
      try { const r = await api.get('/vacancies'); this.vacancies = r.data; }
      catch (e) { console.error(e); } finally { this.loading = false; }
    },
    async loadCompanies() { try { const r = await api.get('/dict/companies'); this.companies = r.data; } catch (e) {} },

    async createVacancy() {
      if (this.user.role === 'employer' && (!this.employersCompany || !this.employersCompany.id)) {
          message.warning('Пожалуйста, заполните профиль компании в личном кабинете.');
          this.$router.push('/employer');
          return;
      }

      this.aiLoading = true;
      try {
        // ОТПРАВЛЯЕМ НОВЫЕ ФЛАГИ
        await api.post('/vacancies', {
            ...this.form,
            use_ai: this.useAi,
            manual_skills: this.manualSkills
        });

        message.success('Вакансия успешно создана!');
        this.showCreateForm = false;

        // Сброс формы
        this.form = { company_id: this.employersCompany?.id || null, title: '', description: '', salary_min: null, contact_email: '' };
        this.manualSkills = '';
        this.useAi = true;

        await this.loadVacancies();
      } catch (e) {
          message.error('Ошибка при создании вакансии');
      } finally {
          this.aiLoading = false;
      }
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
        let tasks = this.currentApplication.test_tasks;
        if (!tasks) tasks = ['Ошибка загрузки вопросов.'];
        else if (typeof tasks === 'string') { try { if (tasks.startsWith('"')) tasks = JSON.parse(tasks); tasks = JSON.parse(tasks); } catch(e) { tasks = [tasks]; } }
        else if (!Array.isArray(tasks)) tasks = [JSON.stringify(tasks)];
        this.currentApplication.test_tasks = tasks;
        this.studentAnswers = new Array(tasks.length).fill('');
      } catch (e) {
        message.error(e.response?.data?.message || 'Ошибка при создании заявки.');
        this.showTestModal = false;
      } finally { this.testLoading = false; }
    },

    async submitAnswers() {
      if (this.studentAnswers.some(a => a.trim() === '')) return message.warning('Пожалуйста, ответьте на все вопросы.');
      this.submitting = true;
      try {
        const response = await api.post('/applications/submit', { application_id: this.currentApplication.id, answers: this.studentAnswers, cover_letter: this.coverLetter });
        this.testResult = response.data;
      } catch (e) { message.error('Ошибка отправки ответов'); } finally { this.submitting = false; }
    },
    async cancelAndClose() {
      if (this.currentApplication && this.currentApplication.id) {
        try { await api.post('/applications/cancel', { application_id: this.currentApplication.id }); } catch (e) {}
      }
      this.closeModal();
    },
    closeModal() { this.showTestModal = false; },
    formatMoney(val) { return new Intl.NumberFormat('ru-RU').format(val); },
    formatDate(val) { return new Date(val).toLocaleDateString('ru-RU'); }
  }
};
</script>

<style scoped>
.page-container { max-width: 900px; margin: 0 auto; padding: 20px; color: #333; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
.page-header h1 { color: #2c3e50; margin: 0; display: flex; align-items: center; gap: 10px; }

/* Заголовок формы */
.form-header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.form-header-row h3 { margin: 0; color: #333; }
.ai-toggle-wrapper { display: flex; align-items: center; gap: 10px; font-weight: bold; color: #555; }

button { cursor: pointer; font-family: inherit; }
.btn-primary { background: #3498db; color: white; padding: 10px 20px; border: none; border-radius: 6px; display: flex; align-items: center; gap: 8px;}
.btn-save { background: #27ae60; color: white; padding: 12px 24px; border: none; border-radius: 6px; font-weight: bold; display: flex; align-items: center; gap: 8px; justify-content: center; width: 100%; margin-top: 10px;}
.btn-save:disabled { background: #95a5a6; cursor: not-allowed; }

.create-card { background: #ffffff; color: #333; padding: 20px; border-radius: 10px; margin-bottom: 30px; border: 1px solid #ddd; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
.form-group { margin-bottom: 15px; }
.form-row { display: flex; gap: 20px; }
.form-row .form-group { flex: 1; }
label { display: block; margin-bottom: 5px; font-weight: bold; color: #444; }
.hint { font-size: 0.85em; color: #888; margin-top: 4px; display: block; }

.vacancy-card { background: #ffffff; color: #333; padding: 25px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); margin-bottom: 20px; border: 1px solid #eee; }
.vac-header h2 { margin: 0; color: #2c3e50; }
.salary { color: #27ae60; font-weight: bold; font-size: 1.1em; }
.vac-company { color: #7f8c8d; margin-bottom: 10px; font-weight: bold; display: flex; align-items: center; gap: 5px;}
.vac-desc { white-space: pre-wrap; margin: 15px 0; line-height: 1.5; color: #333; }

.skills-cloud { display: flex; flex-wrap: wrap; gap: 8px; margin: 10px 0; }
.skill-tag { background: #e8f4fc; color: #2980b9; padding: 5px 10px; border-radius: 15px; font-size: 0.85em; font-weight: 600; }

.vac-footer { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f1f1f1; padding-top: 15px; }
.date { color: #999; font-size: 0.9em; display: flex; align-items: center; gap: 5px; }
.btn-apply { background: #8e44ad; color: white; border: none; padding: 8px 16px; border-radius: 4px; font-weight: bold; transition: 0.2s; }
.btn-apply:hover { background: #732d91; }

/* Модальное окно */
.modal-content-wrapper { padding: 10px; color: #333; }
.center { text-align: center; }
.spinner-icon { font-size: 3em; color: #1890ff; margin-bottom: 20px; }
.question-item { margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 15px; }
.q-text { font-weight: bold; color: #000000; margin-bottom: 10px; font-size: 1.1em; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
.btn-submit { background: #27ae60; color: white; padding: 10px 20px; border: none; border-radius: 6px; font-weight: bold; display: flex; align-items: center; gap: 8px; }
.btn-close-text { background: #e74c3c; border: none; color: white; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: bold; }
.result-box { text-align: center; }
.score-circle { width: 80px; height: 80px; border-radius: 50%; background: #333; color: white; display: flex; justify-content: center; align-items: center; font-size: 2em; font-weight: bold; margin: 0 auto 20px; }
.result-box.accepted .score-circle { background: #2ecc71; }
.result-box.rejected .score-circle { background: #e74c3c; }
.btn-close-main { background: #333; color: white; padding: 10px 30px; border: none; border-radius: 6px; margin-top: 20px; }
.mt-20 { margin-top: 20px; }
.result-msg { font-size: 1.1em; margin-bottom: 10px; line-height: 1.5; }
.small-text { font-size: 0.9em; color: #666; }
</style>