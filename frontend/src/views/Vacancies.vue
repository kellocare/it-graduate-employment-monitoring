<template>
  <div class="page-container">
    <!-- Фон -->
    <ParticlesBackground />

    <!-- Заголовок страницы -->
    <header class="page-header fade-in-up">
      <div class="header-left">
        <h1><solution-outlined class="icon-glow" /> Биржа вакансий</h1>
        <p class="subtitle">Найди работу мечты с помощью AI-аналитики</p>
      </div>

      <div class="controls-bar">
        <!-- СОРТИРОВКА -->
        <a-select v-model:value="sortBy" class="glass-select" :dropdown-class-name="'glass-dropdown'">
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

        <!-- КНОПКА СОЗДАНИЯ -->
        <button
          v-if="user && user.role !== 'graduate'"
          @click="showCreateForm = !showCreateForm"
          class="btn-glass-primary"
        >
          <plus-outlined v-if="!showCreateForm" />
          <close-outlined v-else />
          {{ showCreateForm ? 'Отмена' : 'Создать вакансию' }}
        </button>
      </div>
    </header>

    <!-- ФОРМА СОЗДАНИЯ -->
    <transition name="slide-fade">
      <div v-if="showCreateForm && user && user.role !== 'graduate'" class="create-card glass-panel-form">
         <div class="form-header-row">
           <h3>
             <span class="gradient-text">Новая вакансия</span>
           </h3>

           <div class="ai-toggle-card">
             <robot-filled style="color: #8b5cf6; font-size: 1.2rem;" />
             <span class="toggle-label">AI Анализ</span>
             <a-switch v-model:checked="useAi" />
           </div>
         </div>

         <form @submit.prevent="createVacancy" class="modern-form-layout">
             <div class="form-group">
               <label>Компания</label>
               <div v-if="user.role === 'employer'">
                 <a-input v-if="employersCompany" :value="employersCompany.name" disabled class="modern-input disabled" />
                 <a-alert v-else message="Сначала создайте профиль компании!" type="error" show-icon />
               </div>
               <a-select v-else v-model:value="form.company_id" placeholder="Выберите компанию" class="modern-select" :dropdown-class-name="'glass-dropdown'">
                 <a-select-option v-for="c in companies" :key="c.id" :value="c.id">{{ c.name }}</a-select-option>
               </a-select>
             </div>

             <div class="form-group">
               <label>Название должности</label>
               <a-input v-model:value="form.title" placeholder="Например: Senior Python Developer" class="modern-input" />
             </div>

             <div class="form-row">
               <div class="form-group">
                 <label>Мин. зарплата (₽)</label>
                 <a-input-number v-model:value="form.salary_min" style="width: 100%" class="modern-input" :bordered="false" placeholder="100 000" />
               </div>
               <div class="form-group">
                 <label>Email для связи</label>
                 <a-input v-model:value="form.contact_email" class="modern-input" placeholder="hr@company.com" />
               </div>
             </div>

             <div class="form-group">
               <label>Описание вакансии</label>
               <a-textarea v-model:value="form.description" :rows="5" class="modern-input textarea-resize" placeholder="Опишите обязанности и требования..." />
             </div>

             <div class="form-group" v-if="!useAi">
               <label>Ключевые навыки (через запятую)</label>
               <a-input v-model:value="manualSkills" placeholder="Python, SQL, Docker, Linux" class="modern-input" />
             </div>

             <button type="submit" class="btn-create-gradient" :disabled="aiLoading">
               <loading-outlined v-if="aiLoading" />
               <check-circle-filled v-else />
               {{ aiLoading ? 'ИИ анализирует...' : 'Опубликовать вакансию' }}
             </button>
         </form>
      </div>
    </transition>

    <!-- Список вакансий -->
    <div v-if="loading" class="loading-glass">
      <loading-outlined spin /> <span>Загрузка вакансий...</span>
    </div>

    <transition-group name="list" tag="div" class="vacancy-list" v-else>
      <div
        v-for="vac in sortedVacancies"
        :key="vac.id"
        class="vacancy-card glass-panel liquid-hover"
        @click="showDetails(vac)"
      >
        <!-- Бейдж совпадения -->
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
              <span v-for="skill in vac.skills" :key="skill" class="skill-tag glass-tag">{{ skill }}</span>
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
    <a-modal v-model:open="detailVisible" :footer="null" width="750px" centered wrapClassName="glass-modal-wrapper">
       <div v-if="selectedVacancy" class="modal-content-inner">
          <div class="modal-hero">
             <div class="modal-badge glass-badge">{{ selectedVacancy.company_name }}</div>
             <h2>{{ selectedVacancy.title }}</h2>
             <div class="modal-meta">
                <span v-if="selectedVacancy.salary_min" class="salary-tag glass-tag-green">{{ formatMoney(selectedVacancy.salary_min) }} ₽</span>
                <span class="date-tag glass-tag-white"><calendar-outlined /> {{ formatDate(selectedVacancy.created_at) }}</span>
             </div>
          </div>

          <!-- AI ИНСАЙТ -->
          <div class="ai-insight-box glass-panel-purple" v-if="selectedVacancy.ai_summary">
             <div class="ai-title">
               <robot-filled /> Мнение Искусственного Интеллекта
             </div>
             <p class="ai-text">{{ selectedVacancy.ai_summary }}</p>
          </div>

          <div class="modal-section">
             <h4>Требуемые навыки</h4>
             <div class="skills-cloud">
                <span v-for="skill in selectedVacancy.skills" :key="skill" class="skill-tag large glass-tag">{{ skill }}</span>
             </div>
          </div>

          <div class="modal-section">
             <h4>Описание вакансии</h4>
             <p class="desc-text">{{ selectedVacancy.description }}</p>
          </div>

          <div class="modal-footer-row glass-panel-light">
             <div class="contact-info" v-if="selectedVacancy.contact_email">
                <mail-outlined /> {{ selectedVacancy.contact_email }}
             </div>
             <a-button v-if="user && user.role === 'graduate'" type="primary" size="large" class="btn-respond" @click="startFromDetail(selectedVacancy.id)">
                Откликнуться
             </a-button>
          </div>
       </div>
    </a-modal>

    <!-- МОДАЛКА ТЕСТА -->
    <a-modal v-model:open="showTestModal" :footer="null" width="600px" wrapClassName="glass-modal-wrapper">
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
            <label>Сопроводительное письмо</label>
            <a-textarea v-model:value="coverLetter" :rows="3" class="glass-input" placeholder="Почему вы хотите работать у нас?" />
          </div>
          <a-divider />
          <h4><thunderbolt-two-tone two-tone-color="#fa8c16" /> Блиц-тест от ИИ</h4>
          <div class="questions-list">
             <div v-for="(question, index) in currentApplication.test_tasks" :key="index" class="question-item">
              <p class="q-text"><strong>Вопрос {{ index + 1 }}:</strong> {{ question }}</p>
              <a-textarea v-model:value="studentAnswers[index]" :rows="2" class="glass-input" placeholder="Ваш ответ..." />
            </div>
          </div>
          <div class="modal-actions">
            <button class="btn-save glass-btn-success" @click="submitAnswers" :disabled="submitting">
              <loading-outlined v-if="submitting" /> {{ submitting ? ' Проверка...' : 'Отправить' }}
            </button>
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

    <!-- МОДАЛКА УСПЕХА (ОТПРАВЛЕНО НА МОДЕРАЦИЮ) -->
    <a-modal v-model:open="showSuccessModal" :footer="null" centered width="450px" :closable="false">
      <div class="moderation-modal">
        <div class="mod-icon">
          <safety-certificate-two-tone two-tone-color="#faad14" style="font-size: 70px" />
        </div>
        <h3>Отправлено на проверку</h3>
        <p class="mod-text">Ваша вакансия успешно создана! Сейчас она находится на модерации у администратора.</p>
        <p class="mod-subtext">Как только мы её проверим, она сразу появится в общем поиске. Статус можно отслеживать в личном кабинете.</p>
        <button class="btn-glass-primary full-width" @click="showSuccessModal = false">
          Всё понятно
        </button>
      </div>
    </a-modal>

  </div>
</template>

<script>
import api from '../axios';
import { message } from 'ant-design-vue';
import ParticlesBackground from '../components/ParticlesBackground.vue';
// ВАЖНО: Импортируем все используемые иконки
import {
  SolutionOutlined, PlusOutlined, RobotOutlined, LoadingOutlined,
  BankOutlined, CalendarOutlined, FormOutlined, MailOutlined,
  ThunderboltTwoTone, CheckCircleTwoTone, CloseCircleTwoTone,
  ThunderboltFilled, ArrowRightOutlined, ThunderboltOutlined, DollarOutlined,
  CloseOutlined, CheckCircleFilled, RobotFilled, SafetyCertificateTwoTone
} from '@ant-design/icons-vue';

export default {
  components: {
    ParticlesBackground,
    SolutionOutlined, PlusOutlined, RobotOutlined, LoadingOutlined,
    BankOutlined, CalendarOutlined, FormOutlined, MailOutlined,
    ThunderboltTwoTone, CheckCircleTwoTone, CloseCircleTwoTone,
    ThunderboltFilled, ArrowRightOutlined, ThunderboltOutlined, DollarOutlined,
    CloseOutlined, CheckCircleFilled, RobotFilled, SafetyCertificateTwoTone
  },
  data() {
    return {
      user: null, vacancies: [], companies: [], loading: true, aiLoading: false, showCreateForm: false, employersCompany: null,
      sortBy: 'date_desc', useAi: true, manualSkills: '',

      // Детали и тесты
      detailVisible: false, selectedVacancy: null,
      showTestModal: false, testLoading: false, submitting: false, currentApplication: null, studentAnswers: [], coverLetter: '', testResult: null,

      // Модалка успеха
      showSuccessModal: false,

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

        this.showCreateForm = false;
        this.showSuccessModal = true;
        this.form = { company_id: this.employersCompany?.id || null, title: '', description: '', salary_min: null, contact_email: '' };
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
/* ГЛОБАЛЬНЫЕ НАСТРОЙКИ */
.page-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;
  color: #333;
  position: relative;
  z-index: 2;
}

/* === HEADER === */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 40px;
  flex-wrap: wrap;
  gap: 20px;
}

.header-left h1 {
  font-size: 3rem;
  font-weight: 900;
  color: #4f46e5; /* Индиго */
  background: linear-gradient(135deg, #4f46e5, #9333ea);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 15px;
}

.subtitle {
  color: #4b5563;
  font-size: 1.2rem;
  margin-top: 5px;
  font-weight: 500;
}

.controls-bar {
  display: flex;
  gap: 15px;
  align-items: center;
  background: rgba(255, 255, 255, 0.2);
  padding: 10px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(10px);
}

/* === ЭФФЕКТ ЖИДКОГО СТЕКЛА (ГЛАВНЫЙ КЛАСС) === */
.glass-panel, .vacancy-card {
  background: rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-top: 1px solid rgba(255, 255, 255, 0.9);
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow:
    0 8px 32px 0 rgba(31, 38, 135, 0.1),
    inset 0 0 20px rgba(255, 255, 255, 0.2);
  border-radius: 24px;
  padding: 25px;
  transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  position: relative;
  overflow: hidden;
}

.liquid-hover::before, .vacancy-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: -150%;
  width: 100%;
  height: 100%;
  background: linear-gradient(to right, transparent, rgba(255, 255, 255, 0.4), transparent);
  transform: skewX(-20deg);
  transition: 0.6s;
  pointer-events: none;
  z-index: 1;
}

.liquid-hover:hover, .vacancy-card:hover {
  transform: translateY(-8px) scale(1.01);
  background: rgba(255, 255, 255, 0.45);
  box-shadow: 0 20px 50px rgba(79, 70, 229, 0.2);
  border-top-color: #ffffff;
}

.liquid-hover:hover::before, .vacancy-card:hover::before {
  left: 150%;
}

/* === СПИСОК ВАКАНСИЙ === */
.vacancy-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); /* Сетка вместо списка */
  gap: 25px;
}

.vacancy-card {
  cursor: pointer;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

/* === БЕЙДЖ (ПРОЦЕНТЫ) === */
.match-badge {
  position: absolute;
  top: 20px;
  right: 20px;
  padding: 6px 14px;
  border-radius: 20px;
  font-weight: 800;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(5px);
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 4px 10px rgba(0,0,0,0.05);
  z-index: 10;
}

.match-high { color: #059669; background: rgba(209, 250, 229, 0.8); border-color: #34d399; }
.match-mid { color: #d97706; background: rgba(254, 243, 199, 0.8); border-color: #fbbf24; }
.match-low { color: #4b5568; background: rgba(241, 245, 249, 0.8); border-color: #cbd5e1; }

/* === ЗАГОЛОВОК ВАКАНСИИ === */
.vac-header {
  padding-right: 95px;
  margin-bottom: 8px;
  position: relative;
  z-index: 2;
}

.vac-header h2 {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
  color: #1f2937;
  line-height: 1.2;
  word-wrap: break-word;
}

.salary {
  font-size: 1.1rem;
  font-weight: 700;
  color: #059669;
  display: inline-block;
  margin-top: 8px;
  background: rgba(255, 255, 255, 0.5);
  padding: 4px 12px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.6);
}

.vac-company {
  color: #4b5563;
  font-weight: 600;
  margin: 10px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.vac-desc {
  color: #4b5563;
  line-height: 1.6;
  margin-top: 15px;
  font-size: 0.95rem;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Теги */
.skills-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 15px 0;
}

.glass-tag {
  background: rgba(255, 255, 255, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.6);
  color: #4f46e5;
  padding: 5px 12px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
}

.vac-footer {
  margin-top: 20px;
  pt: 15px;
  border-top: 1px solid rgba(255, 255, 255, 0.3);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.date {
  color: #6b7280;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 6px;
}

.detail-link {
  color: #7c3aed;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: 0.2s;
}

.detail-link:hover {
  transform: translateX(5px);
}

/* === ФОРМЫ И ИНПУТЫ === */
:deep(.glass-input), :deep(.ant-input), :deep(.ant-input-number-input), :deep(.ant-input-number) {
  background: rgba(255, 255, 255, 0.4) !important;
  border: 1px solid rgba(255, 255, 255, 0.4) !important;
  backdrop-filter: blur(10px);
  border-radius: 12px !important;
  transition: 0.3s;
}

:deep(.glass-input:focus), :deep(.ant-input:focus) {
  background: rgba(255, 255, 255, 0.7) !important;
  border-color: #8b5cf6 !important;
  box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.2) !important;
}

:deep(.glass-select .ant-select-selector) {
  background: rgba(255, 255, 255, 0.4) !important;
  border: 1px solid rgba(255, 255, 255, 0.4) !important;
  border-radius: 12px !important;
}

/* Кнопки */
.btn-glass-primary {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  border: none;
  padding: 10px 24px;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);
  transition: 0.3s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-glass-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(99, 102, 241, 0.4);
}

.btn-glass-success, .btn-save {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-weight: 700;
  padding: 12px;
  width: 100%;
  cursor: pointer;
  transition: 0.3s;
}

.btn-save:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(16, 185, 129, 0.3);
}

/* === КАРТОЧКА СОЗДАНИЯ ВАКАНСИИ (НОВЫЙ СТИЛЬ) === */
.glass-panel-form {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(30px);
  border: 1px solid #fff;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.08);
  border-radius: 30px;
  padding: 40px;
  margin-bottom: 50px;
  position: relative;
  overflow: hidden;
}

/* Заголовок формы */
.form-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.form-header-row h3 { font-size: 1.8rem; font-weight: 800; margin: 0; }

.gradient-text {
  background: linear-gradient(135deg, #111827 0%, #4b5563 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* Переключатель AI */
.ai-toggle-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #f5f3ff;
  border: 1px solid #ddd6fe;
  padding: 8px 16px;
  border-radius: 20px;
}
.toggle-label { font-weight: 700; color: #6d28d9; }

/* Поля формы */
.modern-form-layout { display: flex; flex-direction: column; gap: 20px; }
.form-group { margin-bottom: 5px; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }

label { font-weight: 600; color: #374151; margin-bottom: 8px; display: block; font-size: 0.95rem; }

.modern-input, :deep(.modern-select .ant-select-selector) {
  background: white !important;
  border: 1px solid #e5e7eb !important;
  border-radius: 12px !important;
  padding: 10px 12px !important;
  font-size: 1rem;
  box-shadow: 0 2px 5px rgba(0,0,0,0.02);
  transition: all 0.3s ease;
}

.modern-input:focus, :deep(.modern-select.ant-select-open .ant-select-selector) {
  border-color: #8b5cf6 !important;
  box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.1) !important;
}

.textarea-resize { resize: vertical; min-height: 120px; }

/* Кнопка создания */
.btn-create-gradient {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  border: none;
  padding: 16px;
  border-radius: 16px;
  font-size: 1.1rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-top: 20px;
  box-shadow: 0 10px 25px rgba(16, 185, 129, 0.3);
}

.btn-create-gradient:hover {
  transform: translateY(-3px);
  box-shadow: 0 15px 35px rgba(16, 185, 129, 0.4);
}
.btn-create-gradient:disabled { opacity: 0.7; cursor: not-allowed; }

/* === МОДАЛЬНЫЕ ОКНА === */
.modal-hero { text-align: center; margin-bottom: 30px; }
.glass-badge { background: rgba(243, 244, 246, 0.8); padding: 6px 16px; border-radius: 20px; font-weight: 600; color: #4b5563; }
.modal-meta { display: flex; justify-content: center; gap: 15px; margin-top: 15px; }

.glass-panel-purple {
  background: rgba(233, 213, 255, 0.4);
  border: 1px solid rgba(196, 181, 253, 0.5);
  backdrop-filter: blur(8px);
  padding: 20px;
  border-radius: 16px;
  margin-bottom: 30px;
}
.ai-title { color: #6d28d9; font-weight: 800; margin-bottom: 10px; display: flex; align-items: center; gap: 8px; }
.ai-text { color: #5b21b6; line-height: 1.6; }

.glass-panel-light {
  background: rgba(249, 250, 251, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.5);
  padding: 20px;
  border-radius: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* SUCCESS MODAL */
.moderation-modal { text-align: center; padding: 20px; }
.mod-icon { margin-bottom: 20px; }
.moderation-modal h3 { font-size: 1.5rem; font-weight: 800; color: #1f2937; margin-bottom: 10px; }
.mod-text { font-size: 1.1rem; color: #374151; margin-bottom: 10px; }
.mod-subtext { color: #6b7280; margin-bottom: 30px; font-size: 0.9rem; line-height: 1.5; }
.full-width { width: 100%; justify-content: center; }

/* Анимации */
.fade-in-up { animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; transform: translateY(30px); }
@keyframes fadeInUp { to { opacity: 1; transform: translateY(0); } }

.loading-glass { text-align: center; padding: 40px; font-size: 1.2rem; color: #6b7280; background: rgba(255, 255, 255, 0.3); border-radius: 20px; backdrop-filter: blur(5px); }

/* Result Box in Modal */
.result-box { text-align: center; padding: 20px; }
.score-circle { width: 100px; height: 100px; border-radius: 50%; background: linear-gradient(135deg, #333, #000); color: white; display: flex; justify-content: center; align-items: center; font-size: 2.5em; font-weight: 900; margin: 0 auto 20px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2); }
.result-box.accepted .score-circle { background: linear-gradient(135deg, #10b981, #059669); }
.result-box.rejected .score-circle { background: linear-gradient(135deg, #ef4444, #b91c1c); }
.btn-close-main { background: #1f2937; color: white; padding: 12px 40px; border: none; border-radius: 12px; margin-top: 20px; cursor: pointer; font-weight: 600; }
</style>