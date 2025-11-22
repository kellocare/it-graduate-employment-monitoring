<template>
  <div class="page-container">
    <ParticlesBackground />

    <header class="page-header fade-in">
      <div class="header-left">
        <h1><solution-outlined /> Биржа вакансий</h1>
        <p class="subtitle">Найди работу мечты с помощью AI-аналитики</p>
      </div>

      <div class="controls-bar">
        <!-- СОРТИРОВКА С ИКОНКАМИ -->
        <a-select v-model:value="sortBy" style="width: 220px" class="sort-select">
           <a-select-option value="date_desc">
             <calendar-outlined /> Сначала новые
           </a-select-option>
           <a-select-option value="match_desc" v-if="user && user.role === 'graduate'">
             <thunderbolt-outlined /> По релевантности
           </a-select-option>
           <a-select-option value="salary_desc">
             <dollar-outlined /> По зарплате
           </a-select-option>
        </a-select>

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

    <!-- Форма создания -->
    <transition name="slide-fade">
      <div v-if="showCreateForm && user && user.role !== 'graduate'" class="create-card glass-effect">
         <div class="form-header-row">
           <h3>Новая вакансия</h3>
           <div class="ai-toggle-wrapper"><span>AI Анализ навыков:</span><a-switch v-model:checked="useAi" checked-children="ВКЛ" un-checked-children="ВЫКЛ" /></div>
         </div>
         <form @submit.prevent="createVacancy">
             <div class="form-group">
               <label>Компания</label>
               <div v-if="user.role === 'employer'"><a-input v-if="employersCompany" :value="employersCompany.name" disabled style="color: #333; font-weight: bold;" /><a-alert v-else message="Сначала создайте профиль компании!" type="error" show-icon /></div>
               <a-select v-else v-model:value="form.company_id" placeholder="Выберите компанию" style="width: 100%"><a-select-option v-for="c in companies" :key="c.id" :value="c.id">{{ c.name }}</a-select-option></a-select>
             </div>
             <div class="form-group"><label>Название должности</label><a-input v-model:value="form.title" placeholder="Python Developer" /></div>
             <div class="form-row">
               <div class="form-group"><label>Мин. зарплата</label><a-input-number v-model:value="form.salary_min" style="width: 100%" /></div>
               <div class="form-group"><label>Email</label><a-input v-model:value="form.contact_email" /></div>
             </div>
             <div class="form-group"><label>Описание</label><a-textarea v-model:value="form.description" :rows="5" /></div>
             <div class="form-group" v-if="!useAi"><label>Ключевые навыки (через запятую)</label><a-input v-model:value="manualSkills" placeholder="Python, SQL" /></div>
             <button type="submit" class="btn-save" :disabled="aiLoading"><loading-outlined v-if="aiLoading" /> {{ aiLoading ? 'Анализ...' : 'Опубликовать' }}</button>
         </form>
      </div>
    </transition>

    <!-- Список вакансий -->
    <div v-if="loading" class="loading"><loading-outlined spin /> Подбор вакансий...</div>

    <transition-group name="list" tag="div" class="vacancy-list" v-else>
      <div v-for="vac in sortedVacancies" :key="vac.id" class="vacancy-card glass-effect" @click="showDetails(vac)">

        <div v-if="user && user.role === 'graduate'" class="match-badge" :class="getMatchColor(vac.matchScore)">
           <thunderbolt-filled /> {{ vac.matchScore }}%
        </div>

        <div class="card-body">
            <div class="vac-header">
              <h2>{{ vac.title }}</h2>
              <span class="salary" v-if="vac.salary_min">{{ formatMoney(vac.salary_min) }} ₽</span>
            </div>
            <div class="vac-company"><bank-outlined /> {{ vac.company_name }}</div>
            <div class="skills-cloud" v-if="vac.skills && vac.skills[0]">
              <span v-for="skill in vac.skills" :key="skill" class="skill-tag">{{ skill }}</span>
            </div>
            <div class="vac-desc line-clamp">{{ vac.description }}</div>
        </div>

        <div class="vac-footer">
          <span class="date"><calendar-outlined /> {{ formatDate(vac.created_at) }}</span>
          <div class="footer-actions">
             <span class="detail-link">Подробнее <arrow-right-outlined /></span>
          </div>
        </div>
      </div>
    </transition-group>

    <!-- МОДАЛЬНОЕ ОКНО ДЕТАЛЕЙ -->
    <a-modal v-model:open="detailVisible" :footer="null" width="750px" centered class="vacancy-modal">
       <div v-if="selectedVacancy" class="modal-content-inner">
          <div class="modal-hero">
             <div class="modal-badge">{{ selectedVacancy.company_name }}</div>
             <h2>{{ selectedVacancy.title }}</h2>
             <div class="modal-meta">
                <span v-if="selectedVacancy.salary_min" class="salary-tag">{{ formatMoney(selectedVacancy.salary_min) }} ₽</span>
                <span class="date-tag"><calendar-outlined /> {{ formatDate(selectedVacancy.created_at) }}</span>
             </div>
          </div>

          <!-- AI ИНСАЙТ (ОПИСАНИЕ ОТ ИИ) -->
          <div class="ai-insight-box" v-if="selectedVacancy.ai_summary">
             <div class="ai-title">
               <robot-filled /> Мнение Искусственного Интеллекта
             </div>
             <p class="ai-text">{{ selectedVacancy.ai_summary }}</p>
          </div>

          <div class="modal-section">
             <h4>Требуемые навыки</h4>
             <div class="skills-cloud">
                <span v-for="skill in selectedVacancy.skills" :key="skill" class="skill-tag large">{{ skill }}</span>
             </div>
          </div>

          <div class="modal-section">
             <h4>Описание вакансии</h4>
             <p class="desc-text">{{ selectedVacancy.description }}</p>
          </div>

          <div class="modal-footer-row">
             <div class="contact-info" v-if="selectedVacancy.contact_email">
                <mail-outlined /> {{ selectedVacancy.contact_email }}
             </div>
             <a-button v-if="user && user.role === 'graduate'" type="primary" size="large" class="btn-respond" @click="startFromDetail(selectedVacancy.id)">
                Откликнуться на вакансию
             </a-button>
          </div>
       </div>
    </a-modal>

    <!-- МОДАЛКА ТЕСТА -->
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
          <div class="form-group mt-20"><label>Сопроводительное письмо</label><a-textarea v-model:value="coverLetter" :rows="3" placeholder="..." /></div>
          <a-divider />
          <h4><thunderbolt-two-tone two-tone-color="#fa8c16" /> Блиц-тест от ИИ</h4>
          <div class="questions-list">
             <div v-for="(question, index) in currentApplication.test_tasks" :key="index" class="question-item">
              <p class="q-text"><strong>Вопрос {{ index + 1 }}:</strong> {{ question }}</p>
              <a-textarea v-model:value="studentAnswers[index]" :rows="2" placeholder="Ваш ответ..." />
            </div>
          </div>
          <div class="modal-actions">
            <button class="btn-submit" @click="submitAnswers" :disabled="submitting"><loading-outlined v-if="submitting" /> {{ submitting ? ' Проверка...' : 'Отправить' }}</button>
            <button class="btn-close-text" @click="cancelAndClose">Отмена</button>
          </div>
        </div>
        <div v-else-if="testResult" class="modal-body result-box" :class="testResult.status">
          <div class="score-circle">{{ testResult.ai_score }}</div>
          <div v-if="testResult.status === 'accepted'"><h3><check-circle-two-tone two-tone-color="#52c41a" /> Успех!</h3><p>Заявка отправлена.</p></div>
          <div v-else><h3><close-circle-two-tone two-tone-color="#eb2f96" /> Отказ</h3><p>Попробуйте снова.</p></div>
          <button class="btn-close-main" @click="closeModal">Закрыть</button>
        </div>
      </div>
    </a-modal>

  </div>
</template>

<script>
import api from '../axios';
import { message } from 'ant-design-vue';
import ParticlesBackground from '../components/ParticlesBackground.vue';
import {
  SolutionOutlined, PlusOutlined, RobotOutlined, LoadingOutlined,
  BankOutlined, CalendarOutlined, FormOutlined, MailOutlined,
  ThunderboltTwoTone, CheckCircleTwoTone, CloseCircleTwoTone,
  ThunderboltFilled, ArrowRightOutlined, ThunderboltOutlined, DollarOutlined
} from '@ant-design/icons-vue';

export default {
  components: {
    ParticlesBackground,
    SolutionOutlined, PlusOutlined, RobotOutlined, LoadingOutlined,
    BankOutlined, CalendarOutlined, FormOutlined, MailOutlined,
    ThunderboltTwoTone, CheckCircleTwoTone, CloseCircleTwoTone,
    ThunderboltFilled, ArrowRightOutlined, ThunderboltOutlined, DollarOutlined
  },
  data() {
    return {
      user: null, vacancies: [], companies: [], loading: true, aiLoading: false, showCreateForm: false, employersCompany: null,
      sortBy: 'date_desc', useAi: true, manualSkills: '',
      detailVisible: false, selectedVacancy: null,
      showTestModal: false, testLoading: false, submitting: false, currentApplication: null, studentAnswers: [], coverLetter: '', testResult: null,
      form: { company_id: null, title: '', description: '', salary_min: null, contact_email: '' }
    };
  },
  computed: {
    sortedVacancies() {
        let list = [...this.vacancies];
        if (this.user && this.user.role === 'graduate') {
            list = list.map(v => {
                const score = this.calculateMatchScore(v.skills);
                return { ...v, matchScore: score };
            });
        }
        if (this.sortBy === 'date_desc') list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        else if (this.sortBy === 'salary_desc') list.sort((a, b) => (b.salary_min || 0) - (a.salary_min || 0));
        else if (this.sortBy === 'match_desc') list.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
        return list;
    }
  },
  async mounted() {
    const userData = localStorage.getItem('user');
    if (userData) this.user = JSON.parse(userData);

    if (this.user && this.user.role === 'graduate') {
        try {
            const r = await api.get('/graduates/me');
            this.user.fullProfile = r.data;
        } catch(e) {}
    }
    if (this.user && this.user.role === 'employer') {
       try { const r = await api.get('/employer/company'); this.employersCompany = r.data; if (this.employersCompany?.id) this.form.company_id = this.employersCompany.id; } catch (e) {}
    }
    await Promise.all([this.loadVacancies(), this.loadCompanies()]);
  },
  methods: {
    async loadVacancies() { try { const r = await api.get('/vacancies'); this.vacancies = r.data; } catch (e) { console.error(e); } finally { this.loading = false; } },
    async loadCompanies() { try { const r = await api.get('/dict/companies'); this.companies = r.data; } catch (e) {} },

    calculateMatchScore(vacancySkills) {
        if (!this.user?.fullProfile?.about_me || !vacancySkills || vacancySkills.length === 0) return 10;
        const userText = this.user.fullProfile.about_me.toLowerCase();
        let matches = 0;
        vacancySkills.forEach(skill => { if (userText.includes(skill.toLowerCase())) matches++; });
        let score = Math.round((matches / vacancySkills.length) * 100);
        if (score === 0) score = 10; if (score > 100) score = 100;
        return score;
    },
    getMatchColor(score) {
        if (score >= 70) return 'match-high';
        if (score >= 40) return 'match-mid';
        return 'match-low';
    },
    showDetails(vac) { this.selectedVacancy = vac; this.detailVisible = true; },
    startFromDetail(id) { this.detailVisible = false; this.startApplication(id); },

    async createVacancy() {
      if (this.user.role === 'employer' && (!this.employersCompany || !this.employersCompany.id)) { message.warning('Заполните профиль компании'); this.$router.push('/employer'); return; }
      this.aiLoading = true;
      try {
        await api.post('/vacancies', { ...this.form, use_ai: this.useAi, manual_skills: this.manualSkills });
        message.success('Вакансия успешно создана!');
        this.showCreateForm = false; this.form = { company_id: this.employersCompany?.id || null, title: '', description: '', salary_min: null, contact_email: '' };
        await this.loadVacancies();
      } catch (e) { message.error('Ошибка при создании вакансии'); } finally { this.aiLoading = false; }
    },

    async startApplication(vacancyId) {
      this.showTestModal = true; this.testLoading = true; this.currentApplication = null; this.testResult = null; this.studentAnswers = []; this.coverLetter = '';
      try {
        const response = await api.post('/applications/start', { vacancy_id: vacancyId });
        this.currentApplication = response.data;
        let tasks = this.currentApplication.test_tasks;
        if (!tasks) tasks = ['Ошибка загрузки'];
        else if (typeof tasks === 'string') { try { if (tasks.startsWith('"')) tasks = JSON.parse(tasks); tasks = JSON.parse(tasks); } catch(e) { tasks = [tasks]; } }
        else if (!Array.isArray(tasks)) tasks = [JSON.stringify(tasks)];
        this.currentApplication.test_tasks = tasks;
        this.studentAnswers = new Array(tasks.length).fill('');
      } catch (e) { message.error(e.response?.data?.message || 'Ошибка'); this.showTestModal = false; } finally { this.testLoading = false; }
    },
    async submitAnswers() {
      if (this.studentAnswers.some(a => a.trim() === '')) return message.warning('Ответьте на вопросы');
      this.submitting = true;
      try {
        const response = await api.post('/applications/submit', { application_id: this.currentApplication.id, answers: this.studentAnswers, cover_letter: this.coverLetter });
        this.testResult = response.data;
      } catch (e) { message.error('Ошибка'); } finally { this.submitting = false; }
    },
    async cancelAndClose() { if (this.currentApplication?.id) try { await api.post('/applications/cancel', { application_id: this.currentApplication.id }); } catch (e) {}; this.closeModal(); },
    closeModal() { this.showTestModal = false; },
    formatMoney(val) { return new Intl.NumberFormat('ru-RU').format(val); },
    formatDate(val) { return new Date(val).toLocaleDateString('ru-RU'); }
  }
};
</script>

<style scoped>
.page-container { max-width: 1000px; margin: 0 auto; padding: 20px; color: #333; position: relative; z-index: 2; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; flex-wrap: wrap; gap: 20px; }
.header-left h1 { font-size: 2.5rem; font-weight: 800; color: #2c3e50; margin: 0; display: flex; align-items: center; gap: 12px; }
.subtitle { color: #718096; font-size: 1.1rem; margin-top: 5px; }
.controls-bar { display: flex; gap: 15px; align-items: center; }

.vacancy-list { display: grid; grid-template-columns: 1fr; gap: 20px; }
.vacancy-card {
  background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 20px; padding: 25px; box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.07);
  transition: all 0.3s ease; cursor: pointer; position: relative; overflow: hidden;
}
.vacancy-card:hover { transform: translateY(-5px); box-shadow: 0 15px 40px rgba(31, 38, 135, 0.12); border-color: #a78bfa; }

.match-badge { position: absolute; top: 20px; right: 20px; padding: 6px 12px; border-radius: 20px; font-weight: 800; font-size: 0.85rem; display: flex; align-items: center; gap: 6px; }
.match-high { background: #def7ec; color: #03543f; }
.match-mid { background: #feebc8; color: #744210; }
.match-low { background: #edf2f7; color: #4a5568; }

.vac-header h2 { font-size: 1.4rem; font-weight: 700; margin: 0; color: #2d3748; }
.salary { font-size: 1.1rem; font-weight: 700; color: #52c41a; display: block; margin-top: 5px; }
.vac-company { color: #718096; font-weight: 600; margin: 10px 0; display: flex; align-items: center; gap: 6px; }
.vac-desc { color: #4a5568; line-height: 1.6; margin-top: 15px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.skills-cloud { display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0; }
.skill-tag { background: #ebf8ff; color: #3182ce; padding: 5px 12px; border-radius: 12px; font-size: 0.8rem; font-weight: 600; }

.vac-footer { margin-top: 20px; pt: 15px; border-top: 1px solid #edf2f7; display: flex; justify-content: space-between; align-items: center; }
.date { color: #a0aec0; font-size: 0.85rem; display: flex; align-items: center; gap: 6px; }
.detail-link { color: #764ba2; font-weight: 600; display: flex; align-items: center; gap: 5px; transition: 0.2s; }
.detail-link:hover { transform: translateX(5px); }

/* MODAL STYLES */
.modal-hero { text-align: center; margin-bottom: 30px; }
.modal-badge { display: inline-block; background: #edf2f7; padding: 4px 12px; border-radius: 6px; font-size: 0.85rem; color: #4a5568; font-weight: 600; margin-bottom: 10px; }
.modal-hero h2 { font-size: 2rem; font-weight: 800; color: #1a202c; line-height: 1.2; }
.modal-meta { display: flex; justify-content: center; gap: 15px; margin-top: 15px; }
.salary-tag { background: #def7ec; color: #046c4e; padding: 6px 12px; border-radius: 8px; font-weight: 700; }
.date-tag { background: #fff; border: 1px solid #e2e8f0; color: #718096; padding: 6px 12px; border-radius: 8px; font-size: 0.9rem; }

.ai-insight-box { background: linear-gradient(135deg, #f3e8ff 0%, #e9d8fd 100%); border: 1px solid #d6bcfa; padding: 20px; border-radius: 16px; margin-bottom: 30px; position: relative; overflow: hidden; }
.ai-title { font-weight: 800; color: #6b46c1; display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.ai-text { color: #553c9a; line-height: 1.6; font-size: 0.95rem; }

.modal-section { margin-bottom: 30px; }
.modal-section h4 { font-size: 1.1rem; font-weight: 700; color: #2d3748; margin-bottom: 15px; border-left: 4px solid #764ba2; padding-left: 10px; }
.skill-tag.large { font-size: 0.9rem; padding: 8px 16px; }
.desc-text { white-space: pre-line; color: #4a5568; line-height: 1.8; font-size: 1rem; }
.modal-footer-row { display: flex; justify-content: space-between; align-items: center; background: #f7fafc; padding: 20px; border-radius: 12px; margin-top: 20px; }
.contact-info { font-weight: 600; color: #4a5568; display: flex; align-items: center; gap: 8px; }
.btn-respond { background: #764ba2; border-color: #764ba2; font-weight: 700; }
.btn-respond:hover { background: #6b46c1; border-color: #6b46c1; }

/* Form */
.create-card { background: #ffffff; color: #333; padding: 20px; border-radius: 10px; margin-bottom: 30px; border: 1px solid #ddd; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
.form-header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.form-header-row h3 { margin: 0; color: #333; }
.ai-toggle-wrapper { display: flex; align-items: center; gap: 10px; font-weight: bold; color: #555; }
.form-group { margin-bottom: 15px; }
.form-row { display: flex; gap: 20px; }
.form-row .form-group { flex: 1; }
label { display: block; margin-bottom: 5px; font-weight: bold; color: #444; }
input, select, textarea { width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; font-family: inherit; background-color: #ffffff !important; color: #000000 !important; }

button { cursor: pointer; font-family: inherit; }
.btn-primary { background: #3498db; color: white; padding: 10px 20px; border: none; border-radius: 6px; display: flex; align-items: center; gap: 8px;}
.btn-save { background: #27ae60; color: white; padding: 12px 24px; border: none; border-radius: 6px; font-weight: bold; display: flex; align-items: center; gap: 8px; justify-content: center; width: 100%; margin-top: 10px;}
.btn-save:disabled { background: #95a5a6; cursor: not-allowed; }

/* Modal content wrapper */
.modal-content-wrapper { padding: 10px; color: #333; }
.center { text-align: center; }
.spinner-icon { font-size: 3em; color: #1890ff; margin-bottom: 20px; }
.question-item { margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 15px; }
.q-text { font-weight: bold; color: #000000; margin-bottom: 10px; font-size: 1.1em; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
.btn-submit { background: #27ae60; color: white; padding: 10px 20px; border: none; border-radius: 6px; font-weight: bold; }
.btn-close-text { background: #e74c3c; border: none; color: white; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: bold; }
.result-box { text-align: center; }
.score-circle { width: 80px; height: 80px; border-radius: 50%; background: #333; color: white; display: flex; justify-content: center; align-items: center; font-size: 2em; font-weight: bold; margin: 0 auto 20px; }
.result-box.accepted .score-circle { background: #2ecc71; }
.result-box.rejected .score-circle { background: #e74c3c; }
.btn-close-main { background: #333; color: white; padding: 10px 30px; border: none; border-radius: 6px; margin-top: 20px; }
.mt-20 { margin-top: 20px; }
.result-msg { font-size: 1.1em; margin-bottom: 10px; line-height: 1.5; }
.small-text { font-size: 0.9em; color: #666; }

/* Animations */
.list-enter-active, .list-leave-active { transition: all 0.5s ease; }
.list-enter-from, .list-leave-to { opacity: 0; transform: translateX(-30px); }
.fade-in { animation: fadeIn 0.5s ease; }
.slide-fade-enter-active { transition: all 0.3s ease; }
.slide-fade-enter-from { transform: translateY(-10px); opacity: 0; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
</style>