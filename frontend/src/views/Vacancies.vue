<template>
  <div class="page-container">
    <!-- Фон -->
    <div class="blobs-bg"></div>

    <!-- ШАПКА + ПЕРЕКЛЮЧАТЕЛЬ -->
    <header class="page-header fade-in-up">
      <div class="header-left">
        <h1>
          <component :is="activeTab === 'vacancies' ? 'SolutionOutlined' : 'TrophyFilled'" class="icon-glow" />
          {{ activeTab === 'vacancies' ? 'Биржа вакансий' : 'Топ компаний' }}
        </h1>
        <p class="subtitle">
          {{ activeTab === 'vacancies' ? 'Найди работу мечты с AI' : 'Рейтинг лучших работодателей' }}
        </p>
      </div>

      <!-- ЦЕНТРАЛЬНЫЙ ПЕРЕКЛЮЧАТЕЛЬ -->
      <div class="tab-switcher">
        <div class="tab-option" :class="{ active: activeTab === 'vacancies' }" @click="activeTab = 'vacancies'">
          <solution-outlined /> Вакансии
        </div>
        <div class="tab-option" :class="{ active: activeTab === 'companies' }" @click="activeTab = 'companies'">
          <trophy-filled /> Компании
        </div>
        <div class="tab-slider" :style="sliderStyle"></div>
      </div>

      <!-- ФИЛЬТРЫ (Только для вакансий) -->
      <div class="controls-bar" v-if="activeTab === 'vacancies'">
        <a-select v-model:value="sortBy" class="glass-select" style="width: 180px">
           <a-select-option value="date_desc"><calendar-outlined /> Новые</a-select-option>
           <a-select-option value="match_desc" v-if="user && user.role === 'graduate'"><thunderbolt-outlined /> Релевантные</a-select-option>
           <a-select-option value="salary_desc"><dollar-outlined /> По зарплате</a-select-option>
        </a-select>

        <button v-if="user && user.role !== 'graduate'" @click="showCreateForm = !showCreateForm" class="btn-glass-primary">
          <plus-outlined v-if="!showCreateForm" /> <close-outlined v-else />
          <span class="btn-text">{{ showCreateForm ? 'Отмена' : 'Создать' }}</span>
        </button>
      </div>
    </header>

    <!-- === КОНТЕНТ: ВАКАНСИИ === -->
    <div v-if="activeTab === 'vacancies'" class="fade-in-content">
        <!-- ФОРМА СОЗДАНИЯ -->
        <transition name="slide-fade">
          <div v-if="showCreateForm && user && user.role !== 'graduate'" class="glass-panel create-form">
             <div class="form-header-row">
               <h3>Новая вакансия</h3>
               <div class="ai-toggle"><robot-filled style="color: #8b5cf6;" /> <span>AI Анализ</span> <a-switch v-model:checked="useAi" /></div>
             </div>
             <form @submit.prevent="createVacancy" class="modern-form">
                 <div class="form-group">
                   <label>Компания</label>
                   <a-select v-model:value="form.company_id" class="full-width" placeholder="Выберите компанию">
                     <a-select-option v-for="c in companies" :key="c.id" :value="c.id">{{ c.name }}</a-select-option>
                   </a-select>
                 </div>
                 <div class="form-group">
                   <label>Должность</label>
                   <a-input v-model:value="form.title" placeholder="Например: Java Developer" />
                 </div>
                 <div class="form-row">
                   <div class="form-group">
                     <label>Зарплата (₽)</label>
                     <a-input-number v-model:value="form.salary_min" style="width:100%" :min="0" />
                   </div>
                   <div class="form-group">
                     <label>Email</label>
                     <a-input v-model:value="form.contact_email" />
                   </div>
                 </div>
                 <div class="form-group">
                   <label>Описание</label>
                   <a-textarea v-model:value="form.description" :rows="4" />
                 </div>

                 <!-- Если AI выключен - ручной ввод -->
                 <div class="form-group" v-if="!useAi">
                    <label>Ключевые навыки (через запятую)</label>
                    <a-input v-model:value="manualSkills" placeholder="Python, SQL, Docker" />
                 </div>

                 <button type="submit" class="btn-submit" :disabled="aiLoading">
                   <loading-outlined v-if="aiLoading" /> {{ aiLoading ? 'ИИ анализирует...' : 'Опубликовать' }}
                 </button>
             </form>
          </div>
        </transition>

        <!-- СПИСОК ВАКАНСИЙ -->
        <div v-if="loading" class="loading-state"><loading-outlined spin /> Загрузка вакансий...</div>

        <div v-else class="grid-container">
          <div v-for="vac in sortedVacancies" :key="vac.id" class="vacancy-card glass-card liquid-hover" @click="showDetails(vac)">
            <!-- Бейдж совпадения -->
            <div v-if="user && user.role === 'graduate'" class="match-badge" :class="getMatchColor(vac.matchScore)">
               <thunderbolt-filled /> {{ vac.matchScore }}%
            </div>

            <div class="card-content">
                <div class="card-top">
                  <h2 class="vac-title">{{ vac.title }}</h2>
                  <span class="salary-tag" v-if="vac.salary_min">{{ formatMoney(vac.salary_min) }} ₽</span>
                </div>
                <div class="vac-company">
                  <bank-outlined /> {{ vac.company_name }}
                </div>

                <div class="skills-row" v-if="vac.skills && vac.skills.length">
                  <span v-for="skill in vac.skills.slice(0, 4)" :key="skill" class="skill-pill">{{ skill }}</span>
                </div>

                <p class="vac-desc">{{ vac.description }}</p>
            </div>

            <div class="card-footer">
              <span class="date-text"><calendar-outlined /> {{ formatDate(vac.created_at) }}</span>
              <span class="link-text">Подробнее <arrow-right-outlined /></span>
            </div>
          </div>
        </div>
    </div>

    <!-- === КОНТЕНТ: КОМПАНИИ === -->
    <div v-else class="fade-in-content">
        <div v-if="loading" class="loading-state"><loading-outlined spin /> Загрузка рейтинга...</div>

        <div v-else class="grid-container">
          <div v-for="(comp, index) in companiesList" :key="comp.id" class="company-card glass-card" @click="openCompanyModal(comp.id)">
            <div class="rank-badge" :class="'rank-' + (index + 1)">#{{ index + 1 }}</div>
            <div class="comp-header">
               <div class="comp-logo">
                 <img v-if="comp.logo_url" :src="comp.logo_url" />
                 <bank-filled v-else />
               </div>
               <div class="comp-info">
                 <h3>{{ comp.name }}</h3>
                 <div class="comp-meta">
                   <span><environment-outlined /> {{ comp.city || 'Удаленно' }}</span>
                   <span><team-outlined /> {{ comp.review_count || 0 }} отзывов</span>
                 </div>
               </div>
            </div>
            <div class="ai-score-block">
               <div class="score-header">
                 <span><robot-filled /> AI Trust</span>
                 <span :style="{ color: getScoreColor(comp.ai_score) }">{{ comp.ai_score }}%</span>
               </div>
               <div class="progress-bg">
                 <div class="progress-val" :style="{ width: comp.ai_score + '%', background: getScoreColor(comp.ai_score) }"></div>
               </div>
            </div>
            <button class="btn-details">Открыть профиль</button>
          </div>
        </div>
    </div>

    <!-- === МОДАЛКА ВАКАНСИИ (ДЕТАЛИ) === -->
    <a-modal v-model:open="detailVisible" :footer="null" width="700px" centered class="custom-modal">
       <div v-if="selectedVacancy" class="modal-inner">
          <div class="modal-head">
            <h2>{{ selectedVacancy.title }}</h2>
            <div class="company-badge">{{ selectedVacancy.company_name }}</div>
          </div>

          <!-- AI Мнение -->
          <div class="ai-box" v-if="selectedVacancy.ai_summary">
            <div class="ai-label"><robot-filled /> Мнение ИИ</div>
            <p>{{ selectedVacancy.ai_summary }}</p>
          </div>

          <div class="info-block">
            <h4>Навыки</h4>
            <div class="skills-row">
              <span v-for="s in selectedVacancy.skills" :key="s" class="skill-pill large">{{ s }}</span>
            </div>
          </div>

          <div class="info-block">
            <h4>Описание</h4>
            <p class="desc-full">{{ selectedVacancy.description }}</p>
          </div>

          <!-- 🔥 ДЕЙСТВИЯ В МОДАЛКЕ -->
          <div class="modal-actions-row">
            <!-- 1. КНОПКА СОЗДАНИЯ РОАДМАПА (ДЛЯ СТУДЕНТА) -->
            <a-button
                v-if="user && user.role === 'graduate'"
                class="btn-roadmap"
                :loading="roadmapLoading"
                @click="createRoadmapForVacancy(selectedVacancy)"
            >
                <template #icon><compass-outlined /></template>
                Создать Roadmap
            </a-button>

            <!-- 2. КНОПКА ОТКЛИКА -->
            <a-button
                v-if="user && user.role === 'graduate'"
                type="primary"
                size="large"
                class="btn-respond-main"
                @click="startFromDetail(selectedVacancy.id)"
            >
              Откликнуться
            </a-button>
          </div>
       </div>
    </a-modal>

    <!-- МОДАЛКА КОМПАНИИ -->
    <CompanyDetailsModal
      v-if="selectedCompanyId"
      :companyId="selectedCompanyId"
      @close="selectedCompanyId = null"
    />

    <!-- === МОДАЛКА ТЕСТОВОГО ЗАДАНИЯ === -->
    <a-modal v-model:open="showTestModal" :footer="null" width="650px" :maskClosable="false" centered>
      <div class="test-modal-content">
        <!-- Сценарий 1: Загрузка -->
        <div v-if="testLoading" class="test-loading">
          <div class="spinner-pulse"><robot-outlined /></div>
          <h3>ИИ генерирует персональный тест...</h3>
          <p>Анализируем описание вакансии и ваш профиль.</p>
        </div>

        <!-- Сценарий 2: Форма отклика -->
        <div v-else-if="currentApplication && !testResult" class="application-form">
          <div class="form-head">
             <h3><form-outlined /> Отклик на вакансию</h3>
             <p>Ответьте на вопросы, чтобы пройти предварительный отбор.</p>
          </div>

          <div class="form-body custom-scroll-y">
             <div class="input-block">
                <label>Сопроводительное письмо</label>
                <a-textarea v-model:value="coverLetter" :rows="3" placeholder="Почему вы хотите работать у нас?" />
             </div>

             <div class="ai-quiz-block">
                <h4><thunderbolt-filled style="color: #f59e0b" /> Блиц-тест от ИИ</h4>
                <div class="questions-list">
                   <div v-for="(question, index) in currentApplication.test_tasks" :key="index" class="q-item">
                      <p class="q-text"><strong>Вопрос {{ index + 1 }}:</strong> {{ question }}</p>
                      <a-textarea v-model:value="studentAnswers[index]" :rows="2" placeholder="Ваш ответ..." />
                   </div>
                </div>
             </div>
          </div>

          <div class="form-footer">
             <button class="btn-cancel" @click="cancelAndClose">Отмена</button>
             <button class="btn-submit-test" @click="submitAnswers" :disabled="submitting">
                <loading-outlined v-if="submitting" /> {{ submitting ? 'Проверка...' : 'Отправить' }}
             </button>
          </div>
        </div>

        <!-- Сценарий 3: Результат -->
        <div v-else-if="testResult" class="result-view" :class="testResult.status">
           <div class="score-circle-big">
              {{ testResult.ai_score }}
           </div>

           <div v-if="testResult.status === 'accepted'" class="result-text">
              <h3><check-circle-filled style="color: #10b981" /> Успех!</h3>
              <p>Ваши ответы прошли проверку. Заявка отправлена работодателю.</p>
           </div>
           <div v-else class="result-text">
              <h3><close-circle-filled style="color: #ef4444" /> Не пройдено</h3>
              <p>К сожалению, ИИ оценил ваши ответы ниже проходного балла.</p>
           </div>

           <button class="btn-close-modal" @click="closeModal">Закрыть</button>
        </div>
      </div>
    </a-modal>

  </div>
</template>

<script>
import { useRouter } from 'vue-router';
import api from '../axios';
import { message } from 'ant-design-vue';
import CompanyDetailsModal from '../components/CompanyDetailsModal.vue';

import {
  SolutionOutlined, TrophyFilled, CalendarOutlined, ThunderboltOutlined,
  DollarOutlined, PlusOutlined, CloseOutlined, RobotFilled, LoadingOutlined,
  ThunderboltFilled, BankOutlined, ArrowRightOutlined, BankFilled,
  EnvironmentOutlined, TeamOutlined, RobotOutlined, FormOutlined,
  CheckCircleFilled, CloseCircleFilled, CompassOutlined // 🔥
} from '@ant-design/icons-vue';

export default {
  components: {
    CompanyDetailsModal,
    SolutionOutlined, TrophyFilled, CalendarOutlined, ThunderboltOutlined,
    DollarOutlined, PlusOutlined, CloseOutlined, RobotFilled, LoadingOutlined,
    ThunderboltFilled, BankOutlined, ArrowRightOutlined, BankFilled,
    EnvironmentOutlined, TeamOutlined, RobotOutlined, FormOutlined,
    CheckCircleFilled, CloseCircleFilled, CompassOutlined
  },
  data() {
    return {
      activeTab: 'vacancies',
      user: null,
      vacancies: [],
      companies: [],
      companiesList: [],
      loading: true,
      aiLoading: false,
      roadmapLoading: false, // 🔥
      showCreateForm: false,
      employersCompany: null,
      sortBy: 'date_desc',
      useAi: true,
      manualSkills: '',

      form: { company_id: null, title: '', description: '', salary_min: null, contact_email: '' },

      detailVisible: false,
      selectedVacancy: null,
      selectedCompanyId: null,

      // AI TEST VARS
      showTestModal: false,
      testLoading: false,
      submitting: false,
      currentApplication: null,
      studentAnswers: [],
      coverLetter: '',
      testResult: null
    };
  },
  computed: {
    sliderStyle() {
      return this.activeTab === 'vacancies' ? { left: '4px' } : { left: '50%' };
    },
    sortedVacancies() {
        let list = [...this.vacancies];
        if (this.user && this.user.role === 'graduate') {
            list = list.map(v => ({ ...v, matchScore: this.calculateMatchScore(v.skills) }));
        }
        if (this.sortBy === 'date_desc') list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        else if (this.sortBy === 'salary_desc') list.sort((a, b) => (b.salary_min || 0) - (a.salary_min || 0));
        else if (this.sortBy === 'match_desc') list.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
        return list;
    }
  },
  setup() {
      const router = useRouter(); // 🔥 Добавили router
      return { router };
  },
  async mounted() {
    const userData = localStorage.getItem('user');
    if (userData) {
        this.user = JSON.parse(userData);
        if (this.user.role === 'graduate') {
             try { const r = await api.get('/graduates/me'); this.user.fullProfile = r.data; } catch(e) {}
        }
        if (this.user.role === 'employer') {
             try { const r = await api.get('/employer/company'); this.employersCompany = r.data; if(r.data?.id) this.form.company_id = r.data.id; } catch(e){}
        }
    }
    await Promise.all([this.loadVacancies(), this.loadCompaniesDict(), this.loadCompaniesTop()]);
  },
  methods: {
    async loadVacancies() { try { const r = await api.get('/vacancies'); this.vacancies = r.data; } catch (e) { console.error(e); } finally { this.loading = false; } },
    async loadCompaniesDict() { try { const r = await api.get('/dict/companies'); this.companies = r.data; } catch (e) {} },
    async loadCompaniesTop() { try { const r = await api.get('/companies'); this.companiesList = r.data; } catch (e) {} },

    openCompanyModal(id) { this.selectedCompanyId = id; },
    getScoreColor(s) { if(s>=80)return '#10b981'; if(s>=50)return '#f59e0b'; return '#ef4444'; },

    calculateMatchScore(skills) {
        if (!this.user?.fullProfile?.about_me || !skills?.length) return 10;
        const txt = this.user.fullProfile.about_me.toLowerCase();
        let m = 0;
        skills.forEach(s => { if(txt.includes(s.toLowerCase())) m++; });
        let sc = Math.round((m/skills.length)*100);
        return sc > 100 ? 100 : (sc === 0 ? 10 : sc);
    },
    getMatchColor(s) { return s >= 70 ? 'match-high' : s >= 40 ? 'match-mid' : 'match-low'; },

    showDetails(v) { this.selectedVacancy = v; this.detailVisible = true; },

    // 🔥 ГЕНЕРАЦИЯ РОАДМАПА ПО ВАКАНСИИ
    async createRoadmapForVacancy(vacancy) {
        this.roadmapLoading = true;
        const skillsStr = vacancy.skills ? vacancy.skills.join(', ') : '';
        // Формируем запрос для ИИ
        const roleTitle = `${vacancy.title} (Skills: ${skillsStr})`;

        try {
            // 1. Генерируем узлы (ИИ)
            const r = await api.post('/chat/roadmap', { role: roleTitle });

            // 2. Сохраняем в профиль студента
            await api.post('/chat/roadmap/save', {
                roadmapData: r.data, // Узлы
                role: vacancy.title, // Название вакансии как имя трека
                nodes: r.data // Для надежности (бэк иногда ждет nodes)
            });

            message.success('План обучения создан!');
            this.detailVisible = false;

            // 3. Переходим на страницу Roadmaps
            this.router.push('/roadmap');
        } catch (e) {
            message.error('Ошибка генерации roadmap');
            console.error(e);
        } finally {
            this.roadmapLoading = false;
        }
    },

    startFromDetail(id) {
        this.detailVisible = false;
        this.startApplication(id);
    },

    async createVacancy() {
        if(!this.form.title || !this.form.company_id) return message.warning('Заполните обязательные поля');
        this.aiLoading = true;
        try {
            await api.post('/vacancies', { ...this.form, use_ai: this.useAi, manual_skills: this.manualSkills });
            message.success('Вакансия создана!');
            this.showCreateForm = false;
            this.loadVacancies();
        } catch(e) { message.error('Ошибка создания'); }
        finally { this.aiLoading = false; }
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
        message.error(e.response?.data?.message || 'Ошибка.');
        this.showTestModal = false;
      } finally { this.testLoading = false; }
    },

    async submitAnswers() {
      if (this.studentAnswers.some(a => a.trim() === '')) return message.warning('Пожалуйста, ответьте на все вопросы.');
      this.submitting = true;
      try {
        const response = await api.post('/applications/submit', { application_id: this.currentApplication.id, answers: this.studentAnswers, cover_letter: this.coverLetter });
        this.testResult = response.data;
      } catch (e) { message.error('Ошибка отправки'); } finally { this.submitting = false; }
    },

    async cancelAndClose() {
      if (this.currentApplication?.id) {
        try { await api.post('/applications/cancel', { application_id: this.currentApplication.id }); } catch (e) {}
      }
      this.closeModal();
    },
    closeModal() { this.showTestModal = false; },

    formatMoney(v) { return new Intl.NumberFormat('ru-RU').format(v); },
    formatDate(v) { return new Date(v).toLocaleDateString('ru-RU'); }
  }
};
</script>

<style scoped>
/* ОСНОВНОЙ КОНТЕЙНЕР */
.page-container { max-width: 1200px; margin: 0 auto; padding: 30px 20px; min-height: 100vh; position: relative; font-family: 'Segoe UI', sans-serif; color: #333; }
.blobs-bg { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: -1; background: radial-gradient(circle at 10% 20%, rgba(168, 85, 247, 0.05), transparent 40%), radial-gradient(circle at 90% 80%, rgba(59, 130, 246, 0.05), transparent 40%); }

/* ШАПКА */
.page-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px; margin-bottom: 30px; }
.header-left h1 { font-size: 2rem; font-weight: 800; color: #1f2937; margin: 0; display: flex; align-items: center; gap: 10px; }
.icon-glow { color: #6366f1; filter: drop-shadow(0 0 8px rgba(99, 102, 241, 0.3)); }
.subtitle { color: #6b7280; margin-top: 5px; font-size: 1rem; }

/* ПЕРЕКЛЮЧАТЕЛЬ */
.tab-switcher { position: relative; display: flex; background: #f3f4f6; border-radius: 12px; padding: 4px; width: 300px; height: 44px; cursor: pointer; box-shadow: inset 0 2px 4px rgba(0,0,0,0.03); user-select: none; }
.tab-option { flex: 1; z-index: 2; display: flex; align-items: center; justify-content: center; gap: 8px; font-weight: 600; color: #6b7280; transition: color 0.3s; }
.tab-option.active { color: #4f46e5; }
.tab-slider { position: absolute; top: 4px; width: calc(50% - 4px); height: calc(100% - 8px); background: white; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); transition: left 0.3s cubic-bezier(0.4, 0.0, 0.2, 1); z-index: 1; }

/* ПАНЕЛЬ СПРАВА */
.controls-bar { display: flex; align-items: center; gap: 12px; }
.btn-glass-primary { background: #1f2937; color: white; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: 0.2s; height: 38px; }
.btn-glass-primary:hover { background: #374151; transform: translateY(-1px); }

/* СЕТКА */
.grid-container { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 25px; padding-bottom: 40px; }
.glass-card { background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.9); border-radius: 16px; padding: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.03); transition: all 0.3s ease; cursor: pointer; position: relative; display: flex; flex-direction: column; justify-content: space-between; min-height: 250px; }
.glass-card:hover { transform: translateY(-5px); box-shadow: 0 12px 30px rgba(0,0,0,0.08); border-color: #e0e7ff; }

/* КАРТОЧКИ */
.vac-title { font-size: 1.25rem; font-weight: 700; color: #111827; margin: 0 0 5px; line-height: 1.3; }
.salary-tag { display: inline-block; background: #ecfdf5; color: #059669; padding: 3px 8px; border-radius: 6px; font-weight: 700; font-size: 0.9rem; margin-top: 5px; }
.vac-company { color: #6b7280; font-size: 0.95rem; margin-bottom: 12px; display: flex; align-items: center; gap: 6px; }
.skills-row { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
.skill-pill { background: #f3f4f6; color: #4b5563; padding: 4px 10px; border-radius: 12px; font-size: 0.8rem; font-weight: 600; }
.vac-desc { color: #4b5563; font-size: 0.9rem; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.match-badge { position: absolute; top: 15px; right: 15px; font-size: 0.8rem; font-weight: 800; padding: 4px 10px; border-radius: 20px; display: flex; align-items: center; gap: 4px; background: #f3f4f6; }
.match-high { background: #d1fae5; color: #059669; }
.match-mid { background: #fef3c7; color: #d97706; }
.match-low { background: #f1f5f9; color: #64748b; }
.card-footer { margin-top: 15px; padding-top: 15px; border-top: 1px solid #f3f4f6; display: flex; justify-content: space-between; font-size: 0.85rem; color: #9ca3af; }
.link-text { color: #6366f1; font-weight: 600; display: flex; align-items: center; gap: 4px; }

/* КОМПАНИИ */
.company-card { position: relative; overflow: hidden; }
.rank-badge { position: absolute; top: 0; left: 0; background: #e5e7eb; padding: 4px 12px; border-bottom-right-radius: 12px; font-weight: 800; color: #6b7280; font-size: 0.9rem; }
.rank-1 { background: #fbbf24; color: white; }
.rank-2 { background: #9ca3af; color: white; }
.rank-3 { background: #d97706; color: white; }
.comp-header { display: flex; gap: 15px; margin-top: 15px; margin-bottom: 20px; }
.comp-logo { width: 50px; height: 50px; background: #e0e7ff; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; color: #6366f1; overflow: hidden; flex-shrink: 0; }
.comp-logo img { width: 100%; height: 100%; object-fit: cover; }
.comp-info h3 { margin: 0; font-size: 1.1rem; font-weight: 700; color: #1f2937; }
.comp-meta { display: flex; flex-direction: column; font-size: 0.85rem; color: #6b7280; margin-top: 4px; }
.ai-score-block { margin-bottom: 15px; }
.score-header { display: flex; justify-content: space-between; font-weight: 700; font-size: 0.9rem; margin-bottom: 5px; color: #4b5563; }
.progress-bg { height: 6px; background: #f3f4f6; border-radius: 3px; overflow: hidden; }
.progress-val { height: 100%; border-radius: 3px; }
.btn-details { width: 100%; padding: 8px; border: 1px solid #e5e7eb; background: white; border-radius: 8px; color: #374151; font-weight: 600; cursor: pointer; transition: 0.2s; }
.btn-details:hover { border-color: #6366f1; color: #6366f1; }

/* ФОРМА СОЗДАНИЯ */
.create-form { background: white; border-radius: 16px; padding: 25px; margin-bottom: 30px; border: 1px solid #e5e7eb; box-shadow: 0 10px 40px rgba(0,0,0,0.05); }
.form-header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.form-header-row h3 { margin: 0; font-size: 1.5rem; }
.ai-toggle { display: flex; align-items: center; gap: 8px; font-weight: 600; color: #6b7280; background: #f9fafb; padding: 5px 12px; border-radius: 20px; }
.modern-form { display: flex; flex-direction: column; gap: 15px; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
.form-group label { display: block; font-weight: 500; margin-bottom: 5px; color: #374151; }
.full-width { width: 100%; }
.btn-submit { background: #10b981; color: white; border: none; padding: 12px; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 1rem; margin-top: 10px; }
.btn-submit:hover { background: #059669; }

/* МОДАЛКА ТЕСТА */
.test-modal-content { padding: 10px; }
.test-loading { text-align: center; padding: 40px 0; }
.spinner-pulse { font-size: 3rem; color: #6366f1; animation: pulse 1.5s infinite; margin-bottom: 15px; }
@keyframes pulse { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.2); opacity: 0.7; } 100% { transform: scale(1); opacity: 1; } }
.application-form { display: flex; flex-direction: column; height: 500px; }
.form-head { margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 10px; }
.form-body { flex: 1; overflow-y: auto; padding-right: 5px; }
.ai-quiz-block { background: #fdfbf7; border: 1px solid #fde68a; padding: 15px; border-radius: 12px; margin-top: 20px; }
.ai-quiz-block h4 { margin-top: 0; color: #d97706; display: flex; align-items: center; gap: 8px; }
.q-item { margin-bottom: 15px; }
.q-text { font-weight: 600; margin-bottom: 5px; color: #4b5563; }
.form-footer { margin-top: 20px; display: flex; justify-content: flex-end; gap: 10px; }
.btn-cancel { border: none; background: transparent; color: #6b7280; cursor: pointer; font-weight: 600; }
.btn-submit-test { background: #10b981; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 700; cursor: pointer; }
.result-view { text-align: center; padding: 30px; }
.score-circle-big { width: 100px; height: 100px; border-radius: 50%; background: #1f2937; color: white; font-size: 2.5rem; font-weight: 900; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; }
.accepted .score-circle-big { background: #10b981; box-shadow: 0 0 20px #10b981; }
.rejected .score-circle-big { background: #ef4444; box-shadow: 0 0 20px #ef4444; }
.btn-close-modal { margin-top: 20px; background: #e5e7eb; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; }

/* ОБЩЕЕ */
.fade-in-up { animation: fadeInUp 0.6s ease forwards; opacity: 0; }
@keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
.fade-in-content { animation: fadeIn 0.4s ease forwards; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
.loading-state { text-align: center; padding: 50px; color: #9ca3af; font-size: 1.1rem; }
.custom-scroll-y::-webkit-scrollbar { width: 4px; }
.custom-scroll-y::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 2px; }

/* МОДАЛКА ДЕТАЛЕЙ ВАКАНСИИ */
.modal-inner { padding: 10px; }
.modal-head { text-align: center; margin-bottom: 20px; }
.modal-head h2 { font-size: 1.8rem; margin: 0; }
.company-badge { display: inline-block; background: #f3f4f6; padding: 4px 12px; border-radius: 20px; margin-top: 8px; color: #4b5563; font-weight: 600; }
.ai-box { background: #f5f3ff; border: 1px solid #ddd6fe; padding: 15px; border-radius: 12px; margin-bottom: 20px; }
.ai-label { color: #7c3aed; font-weight: 700; margin-bottom: 5px; display: flex; align-items: center; gap: 6px; }
.info-block { margin-bottom: 20px; }
.info-block h4 { font-size: 1.1rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; margin-bottom: 10px; }
.skill-pill.large { font-size: 0.9rem; padding: 6px 12px; background: #e0e7ff; color: #4338ca; }

/* 🔥 КНОПКИ В МОДАЛКЕ */
.modal-actions-row { display: flex; gap: 15px; margin-top: 30px; }
.btn-roadmap { background: linear-gradient(135deg, #8b5cf6, #d946ef); color: white; border: none; flex: 1; height: 45px; border-radius: 10px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: 0.2s; box-shadow: 0 4px 15px rgba(139, 92, 246, 0.3); }
.btn-roadmap:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(139, 92, 246, 0.4); }
.btn-respond-main { flex: 1.5; height: 45px; border-radius: 10px; font-weight: 700; }
</style>