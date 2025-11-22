<template>
  <div class="page-wrapper">

    <!-- ФОНОВЫЕ ПУЗЫРИ -->
    <div class="blobs-container">
      <div class="blob blob-1"></div>
      <div class="blob blob-2"></div>
      <div class="blob blob-3"></div>
    </div>

    <div class="content-container">

      <!-- ШАПКА ДАШБОРДА -->
      <div class="dashboard-header fade-in">
        <div class="header-left">
          <h1>🏢 Кабинет работодателя</h1>
          <p>Управляйте наймом и развивайте команду</p>
        </div>

        <!-- Статистика -->
        <div class="stats-row" v-if="company.id">
          <div class="stat-card">
            <div class="stat-icon blue"><appstore-filled /></div>
            <div class="stat-info">
              <strong>{{ vacancies.length }}</strong>
              <span>Мои вакансии</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon green"><user-add-outlined /></div>
            <div class="stat-info">
              <strong>{{ applications.length }}</strong>
              <span>Откликов</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ГЛАВНАЯ КАРТОЧКА (TABS) -->
      <div class="glass-card main-content fade-in">
        <a-tabs v-model:activeKey="activeTab" class="custom-tabs" animated>

          <!-- 1. ПРОФИЛЬ КОМПАНИИ -->
          <a-tab-pane key="profile" tab="Профиль компании">
            <div class="tab-content-inner">
              <a-alert
                v-if="!company.id"
                message="Заполните профиль"
                description="Чтобы публиковать вакансии, нужно заполнить информацию о компании."
                type="warning"
                show-icon
                class="mb-20"
              />

              <a-form layout="vertical" class="modern-form">
                <div class="form-row-2">
                  <a-form-item label="Название компании" required>
                    <a-input v-model:value="company.name" class="modern-input" placeholder="Название" />
                  </a-form-item>
                  <a-form-item label="ИНН" required :validate-status="innError ? 'error' : ''" :help="innError">
                    <a-input v-model:value="company.inn" class="modern-input" placeholder="10 или 12 цифр" @change="validateInn" />
                  </a-form-item>
                </div>

                <div class="form-row-2">
                  <a-form-item label="Город" required>
                    <a-select v-model:value="company.city" show-search :options="cityOptions" placeholder="Выберите город" class="modern-select" />
                  </a-form-item>
                  <a-form-item label="Сайт">
                    <a-input v-model:value="company.website" class="modern-input" placeholder="https://site.com" />
                  </a-form-item>
                </div>

                <a-form-item label="Описание компании">
                  <a-textarea v-model:value="company.description" :rows="4" class="modern-input" placeholder="Расскажите о вашей компании..." />
                </a-form-item>

                <div class="form-actions">
                  <button class="btn-primary-gradient" @click="saveCompany" :disabled="loading || !!innError">
                    <save-outlined /> {{ loading ? 'Сохранение...' : 'Сохранить профиль' }}
                  </button>
                </div>
              </a-form>
            </div>
          </a-tab-pane>

          <!-- 2. МОИ ВАКАНСИИ -->
          <a-tab-pane key="vacancies" tab="Мои вакансии" :disabled="!company.id">
            <div class="tab-content-inner">
              <div class="section-header">
                <h3>Список вакансий</h3>
                <button class="btn-add-vacancy" @click="$router.push('/vacancies')">
                  <plus-outlined /> Создать новую
                </button>
              </div>

              <a-table :dataSource="vacancies" :columns="columns" rowKey="id" class="modern-table" :pagination="{ pageSize: 5 }">
                <template #bodyCell="{ column, record }">

                  <!-- Статус -->
                  <template v-if="column.key === 'status'">
                    <a-tag v-if="record.status === 'active'" color="success">Активна</a-tag>
                    <a-tag v-else-if="record.status === 'rejected'" color="error">Отклонена</a-tag>
                    <a-tag v-else color="warning">На проверке</a-tag>
                  </template>

                  <template v-if="column.key === 'salary'">
                    <span class="salary-text">{{ record.salary_min ? formatMoney(record.salary_min) : '—' }}</span>
                  </template>

                  <template v-if="column.key === 'date'">
                    <span class="date-text">{{ formatDate(record.created_at) }}</span>
                  </template>

                  <template v-if="column.key === 'action'">
                    <div class="action-buttons">
                      <a-tooltip :title="record.status === 'pending' ? 'Нельзя редактировать на проверке' : 'Редактировать'">
                        <button
                          class="btn-icon-edit"
                          @click="editVacancy(record)"
                          :disabled="record.status === 'pending'"
                          :class="{ disabled: record.status === 'pending' }"
                        >
                          <edit-outlined />
                        </button>
                      </a-tooltip>

                      <a-popconfirm title="Удалить вакансию?" ok-text="Да" cancel-text="Нет" @confirm="deleteVacancy(record.id)">
                        <button class="btn-icon-delete"><delete-outlined /></button>
                      </a-popconfirm>
                    </div>
                  </template>

                </template>
              </a-table>
            </div>
          </a-tab-pane>

          <!-- 3. ПОИСК КАНДИДАТОВ -->
          <a-tab-pane key="candidates" tab="Поиск кандидатов" :disabled="!company.id">
            <div class="tab-content-inner">
               <div class="candidates-grid">
                  <div v-for="student in candidates" :key="student.id" class="candidate-card">
                    <div class="card-top">
                      <a-avatar :src="getAvatarUrl(student.avatar_url)" :size="54" class="cand-avatar">
                        <template #icon><user-outlined /></template>
                      </a-avatar>
                      <div class="cand-info">
                        <h4>{{ student.first_name }} {{ student.last_name }}</h4>
                        <p class="spec-text">{{ student.specialty || 'Специальность не указана' }}</p>
                      </div>
                    </div>

                    <p class="bio">{{ student.about_me ? student.about_me.substring(0, 80) + '...' : 'Нет описания' }}</p>

                    <div v-if="student.aiResult" class="ai-box">
                      <div class="ai-score">Соответствие: <span :class="getScoreClass(student.aiResult.score)">{{ student.aiResult.score }}%</span></div>
                      <p class="ai-reason">{{ student.aiResult.reason }}</p>
                    </div>

                    <!-- Статусы приглашений -->
                    <div v-if="student.invite_status === 'declined'" class="status-badge declined"><close-circle-outlined /> Отказался</div>
                    <div v-else-if="student.invite_status === 'accepted'" class="status-badge accepted"><check-circle-outlined /> Принял</div>
                    <div v-else-if="student.invite_status === 'pending'" class="status-badge pending"><clock-circle-outlined /> Отправлено</div>

                    <div class="card-actions">
                       <button class="btn-ai-scan" @click="analyzeCandidate(student)" :disabled="student.aiLoading">
                         <robot-outlined v-if="!student.aiLoading" /><loading-outlined v-else /> AI Анализ
                       </button>
                       <button class="btn-invite" @click="openInvite(student)" :disabled="!!student.invite_status">
                         Пригласить
                       </button>
                    </div>
                  </div>
               </div>
            </div>
          </a-tab-pane>

          <!-- 4. ВХОДЯЩИЕ ОТКЛИКИ -->
          <a-tab-pane key="applications" tab="Входящие отклики" :disabled="!company.id">
            <div class="tab-content-inner">
               <a-list item-layout="vertical" :data-source="applications" class="app-list">
                  <template #renderItem="{ item }">
                    <a-list-item class="app-item-card">

                      <div class="app-header">
                        <div class="app-user">
                          <a-avatar :src="getAvatarUrl(item.avatar_url)" :size="48"><template #icon><user-outlined /></template></a-avatar>
                          <div>
                            <h4>{{ item.first_name }} {{ item.last_name }}</h4>
                            <span class="vacancy-label">на вакансию: {{ item.vacancy_title }}</span>
                          </div>
                        </div>
                        <div class="app-score-badge">
                          <div class="score-val">{{ item.ai_score }}</div>
                          <div class="score-txt">AI Score</div>
                        </div>
                      </div>

                      <div class="cover-letter" v-if="item.cover_letter">
                        <b>Сопроводительное письмо:</b>
                        <p>{{ item.cover_letter }}</p>
                      </div>

                      <div class="app-actions-row">
                         <button class="btn-action-outline" @click="showStudentProfile(item)"><eye-outlined /> Профиль</button>
                         <button class="btn-action-primary" @click="openInviteFromApp(item)"><message-outlined /> Написать</button>

                         <a-popconfirm title="Отклонить кандидата?" @confirm="rejectApp(item.id)">
                           <button class="btn-action-danger"><close-outlined /> Отклонить</button>
                         </a-popconfirm>
                      </div>

                    </a-list-item>
                  </template>
                  <template #emptyText>
                    <div class="empty-state">
                      <inbox-outlined style="font-size: 40px; color: #ccc;" />
                      <p>Пока нет откликов</p>
                    </div>
                  </template>
               </a-list>
            </div>
          </a-tab-pane>

        </a-tabs>
      </div>

    </div>

    <!-- МОДАЛКА ПРОФИЛЯ СТУДЕНТА -->
    <a-modal v-model:open="profileModalVisible" :footer="null" width="600px" centered wrapClassName="glass-modal-wrapper">
      <div v-if="selectedStudent" class="student-modal-content">
        <div class="modal-header-row">
           <a-avatar :size="80" :src="getAvatarUrl(selectedStudent.avatar_url)" class="modal-avatar"><template #icon><user-outlined /></template></a-avatar>
           <div class="modal-titles">
             <h3>{{ selectedStudent.first_name }} {{ selectedStudent.last_name }}</h3>
             <p class="spec-label">{{ selectedStudent.specialty_name || 'Специальность не указана' }}</p>
           </div>
        </div>

        <div class="info-grid mt-20">
           <div class="info-item"><span>Email:</span> {{ selectedStudent.student_email }}</div>
           <div class="info-item"><span>Телефон:</span> {{ selectedStudent.phone || '—' }}</div>
           <div class="info-item"><span>Город:</span> {{ selectedStudent.city || '—' }}</div>
        </div>

        <div class="about-block mt-20">
           <h4>О себе / Навыки</h4>
           <p>{{ selectedStudent.about_me || 'Нет информации' }}</p>
        </div>

        <div class="portfolio-block mt-20" v-if="selectedStudent.portfolio_links && selectedStudent.portfolio_links.length">
           <h4>Портфолио</h4>
           <div class="links-list">
             <div v-for="(link, i) in selectedStudent.portfolio_links" :key="i" class="link-chip">
                <a :href="link.url" target="_blank"><link-outlined /> {{ link.type }}</a>
             </div>
           </div>
        </div>
      </div>
    </a-modal>

    <!-- МОДАЛКА РЕДАКТИРОВАНИЯ ВАКАНСИИ -->
    <a-modal v-model:open="editVacancyVisible" title="Редактирование вакансии" @ok="saveVacancyEdit" centered>
      <a-form layout="vertical">
        <a-form-item label="Должность"><a-input v-model:value="editForm.title" /></a-form-item>
        <a-row :gutter="16">
           <a-col :span="12"><a-form-item label="Мин. ЗП"><a-input-number v-model:value="editForm.salary_min" style="width: 100%" /></a-form-item></a-col>
           <a-col :span="12"><a-form-item label="Макс. ЗП"><a-input-number v-model:value="editForm.salary_max" style="width: 100%" /></a-form-item></a-col>
        </a-row>
        <a-form-item label="Email"><a-input v-model:value="editForm.contact_email" /></a-form-item>
        <a-form-item label="Описание"><a-textarea v-model:value="editForm.description" rows="4" /></a-form-item>
      </a-form>
    </a-modal>

  </div>
</template>

<script>
import api from '../axios';
import { message, Modal } from 'ant-design-vue';
import { h } from 'vue';
import {
  SaveOutlined, PlusOutlined, DeleteOutlined, UserOutlined, EditOutlined,
  CloseCircleOutlined, CheckCircleOutlined, ClockCircleOutlined,
  EyeOutlined, MessageOutlined, CloseOutlined, LinkOutlined,
  AppstoreFilled, UserAddOutlined, RobotOutlined, LoadingOutlined, InboxOutlined
} from '@ant-design/icons-vue';

const RUSSIAN_CITIES = ['Москва', 'Санкт-Петербург', 'Новосибирск', 'Екатеринбург', 'Казань', 'Нижний Новгород', 'Челябинск', 'Красноярск', 'Самара', 'Уфа', 'Ростов-на-Дону', 'Омск', 'Краснодар', 'Воронеж', 'Пермь', 'Волгоград'].map(city => ({ value: city, label: city }));

export default {
  components: {
    SaveOutlined, PlusOutlined, DeleteOutlined, UserOutlined, EditOutlined,
    CloseCircleOutlined, CheckCircleOutlined, ClockCircleOutlined,
    EyeOutlined, MessageOutlined, CloseOutlined, LinkOutlined,
    AppstoreFilled, UserAddOutlined, RobotOutlined, LoadingOutlined, InboxOutlined
  },
  data() {
    return {
      activeTab: 'profile',
      loading: false,
      company: { name: '', city: '', description: '', website: '', inn: '' },
      vacancies: [], // Это "Мои" вакансии
      candidates: [],
      applications: [],
      columns: [
        { title: 'Должность', dataIndex: 'title', key: 'title' },
        { title: 'Статус', key: 'status', width: 120 },
        { title: 'Зарплата', key: 'salary' },
        { title: 'Дата', key: 'date' },
        { title: '', key: 'action', width: 100 },
      ],
      profileModalVisible: false,
      selectedStudent: null,
      editVacancyVisible: false,
      editForm: {},
      innError: '',
      cityOptions: RUSSIAN_CITIES
    };
  },
  async mounted() {
    // 1. Сначала грузим компанию
    await this.loadCompany();

    // 2. Если компания существует, грузим остальное
    if (this.company.id) {
      await Promise.all([
        this.loadMyVacancies(),
        this.loadCandidates(),
        this.loadApplications()
      ]);
    }
  },
  methods: {
    async loadCompany() {
        try {
            const r = await api.get('/employer/company');
            if(r.data && r.data.id) this.company = r.data;
            else this.company = { name: '', city: '', description: '', website: '', inn: '' };
        } catch(e){}
    },
    async loadMyVacancies() {
      try {
        const r = await api.get('/vacancies/my');
        this.vacancies = r.data;
      } catch(e){}
    },
    async loadCandidates() { try { const r = await api.get('/candidates'); this.candidates = r.data.map(c => ({...c, aiLoading: false, aiResult: null})); } catch(e){} },
    async loadApplications() { try { const r = await api.get('/applications/employer'); this.applications = r.data; } catch(e){} },

    validateInn() {
      const inn = this.company.inn;
      if (!inn) { this.innError = ''; return; }
      if (!/^\d{10}$|^\d{12}$/.test(inn)) this.innError = 'ИНН должен содержать 10 или 12 цифр';
      else this.innError = '';
    },

    async saveCompany() {
      if (!this.company.name || !this.company.city) return message.error('Заполните обязательные поля');
      this.validateInn();
      if (this.innError) return message.error('Ошибка в ИНН');

      this.loading = true;
      try {
        const r = await api.post('/employer/company', this.company);
        this.company = r.data;
        message.success('Профиль сохранен');
        if (this.activeTab === 'profile') this.activeTab = 'vacancies';
      } catch (e) { message.error('Ошибка сохранения'); } finally { this.loading = false; }
    },

    async deleteVacancy(id) { try { await api.delete(`/vacancies/${id}`); await this.loadMyVacancies(); message.success('Удалено'); } catch(e){} },

    editVacancy(record) {
        this.editForm = { ...record };
        this.editVacancyVisible = true;
    },
    async saveVacancyEdit() {
        try {
            await api.put(`/vacancies/${this.editForm.id}`, this.editForm);
            message.success('Вакансия обновлена');
            this.editVacancyVisible = false;
            this.loadMyVacancies();
        } catch(e) { message.error('Ошибка'); }
    },

    async analyzeCandidate(student) {
      student.aiLoading = true;
      try { const r = await api.post('/candidates/analyze', { candidate_id: student.id }); student.aiResult = r.data; } catch(e){ message.error('Ошибка'); } finally { student.aiLoading = false; }
    },
    showStudentProfile(appItem) {
      this.selectedStudent = appItem;
      this.profileModalVisible = true;
    },
    async rejectApp(appId) {
      try { await api.post('/applications/reject', { application_id: appId }); message.success('Отклонено'); await this.loadApplications(); } catch (e) { message.error('Ошибка'); }
    },
    openInvite(student) {
      let msg = '';
      Modal.confirm({
        title: `Приглашение для ${student.first_name}`,
        content: h('div', {}, [
          h('p', 'Напишите сообщение:'),
          h('textarea', { class: 'ant-input', rows: 3, onInput: (e) => { msg = e.target.value } })
        ]),
        onOk: async () => {
          if (!msg) return message.warning('Напишите сообщение');
          try { await api.post('/candidates/invite', { candidate_user_id: student.user_id, message: msg }); message.success('Отправлено!'); } catch(e){ message.error('Ошибка'); }
        }
      });
    },
    openInviteFromApp(appItem) { this.openInvite({ first_name: appItem.first_name, user_id: appItem.student_user_id }); },
    getAvatarUrl(url) { return url ? `http://localhost:4000${url}` : null; },
    getScoreClass(score) { if (score>=80) return 'score-high'; if (score>=50) return 'score-mid'; return 'score-low'; },
    formatMoney(val) { return new Intl.NumberFormat('ru-RU').format(val) + ' ₽'; },
    formatDate(val) { return new Date(val).toLocaleDateString('ru-RU'); }
  }
};
</script>

<style scoped>
/* === ОСНОВНОЙ ЛЭЙАУТ === */
.page-wrapper { position: relative; width: 100%; min-height: 90vh; overflow-x: hidden; background: #f3f4f6; display: flex; justify-content: center; padding: 40px 20px; }

/* Пузырьки фона */
.blobs-container { position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 0; }
.blob { position: absolute; border-radius: 50%; filter: blur(60px); opacity: 0.5; animation: float 10s infinite alternate; }
.blob-1 { width: 400px; height: 400px; background: #a855f7; top: -100px; left: -100px; }
.blob-2 { width: 300px; height: 300px; background: #3b82f6; bottom: -50px; right: -50px; animation-delay: 2s; }
.blob-3 { width: 250px; height: 250px; background: #ec4899; top: 30%; left: 40%; opacity: 0.3; animation-duration: 15s; }
@keyframes float { from { transform: translate(0,0); } to { transform: translate(30px, 50px); } }

.content-container { position: relative; z-index: 1; width: 100%; max-width: 1100px; display: flex; flex-direction: column; gap: 30px; }

/* === ШАПКА ДАШБОРДА === */
.dashboard-header { display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 20px; margin-bottom: 10px; }
.header-left h1 { font-size: 2rem; font-weight: 800; color: #1f2937; margin: 0; }
.header-left p { color: #6b7280; margin: 5px 0 0; font-size: 1.1rem; }

/* Статистика */
.stats-row { display: flex; gap: 15px; }
.stat-card { background: rgba(255,255,255,0.8); backdrop-filter: blur(10px); padding: 15px 20px; border-radius: 16px; display: flex; align-items: center; gap: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #fff; }
.stat-icon { width: 45px; height: 45px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.3rem; color: white; }
.stat-icon.blue { background: linear-gradient(135deg, #3b82f6, #2563eb); }
.stat-icon.green { background: linear-gradient(135deg, #10b981, #059669); }
.stat-info { display: flex; flex-direction: column; }
.stat-info strong { font-size: 1.4rem; line-height: 1; color: #1f2937; }
.stat-info span { font-size: 0.8rem; color: #6b7280; text-transform: uppercase; font-weight: 600; }

/* === ГЛАВНАЯ КАРТОЧКА (GLASS) === */
.glass-card { background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.9); border-radius: 24px; box-shadow: 0 10px 40px rgba(0,0,0,0.05); padding: 30px; min-height: 500px; }

/* Вкладки */
.custom-tabs :deep(.ant-tabs-nav) { margin-bottom: 25px; }
.custom-tabs :deep(.ant-tabs-tab) { font-size: 1rem; padding: 12px 20px; font-weight: 600; }
.tab-content-inner { padding: 10px 5px; }

/* ФОРМЫ */
.modern-form { max-width: 800px; margin: 0 auto; }
.form-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.modern-input, .modern-select { border-radius: 10px; padding: 8px 12px; font-size: 1rem; }
.btn-primary-gradient { background: linear-gradient(135deg, #6366f1, #4f46e5); color: white; border: none; padding: 12px 30px; border-radius: 12px; font-weight: 700; cursor: pointer; transition: 0.3s; display: flex; align-items: center; gap: 8px; font-size: 1rem; }
.btn-primary-gradient:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(99, 102, 241, 0.3); }
.btn-primary-gradient:disabled { opacity: 0.7; cursor: not-allowed; }
.form-actions { display: flex; justify-content: flex-end; margin-top: 20px; }

/* ТАБЛИЦА ВАКАНСИЙ */
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.section-header h3 { font-size: 1.4rem; font-weight: 700; color: #1f2937; margin: 0; }
.btn-add-vacancy { background: #10b981; color: white; border: none; padding: 10px 20px; border-radius: 10px; cursor: pointer; font-weight: 600; transition: 0.2s; display: flex; align-items: center; gap: 6px; font-size: 0.95rem; }
.btn-add-vacancy:hover { background: #059669; transform: translateY(-2px); }

.action-buttons { display: flex; gap: 5px; }
.btn-icon-edit { background: #e0f2fe; color: #0284c7; border: none; width: 34px; height: 34px; border-radius: 8px; cursor: pointer; transition: 0.2s; display: flex; align-items: center; justify-content: center; }
.btn-icon-edit:hover { background: #bae6fd; }
.btn-icon-edit.disabled { opacity: 0.5; cursor: not-allowed; background: #f1f5f9; color: #cbd5e1; }
.btn-icon-delete { background: #fee2e2; color: #ef4444; border: none; width: 34px; height: 34px; border-radius: 8px; cursor: pointer; transition: 0.2s; display: flex; align-items: center; justify-content: center; }
.btn-icon-delete:hover { background: #fecaca; }
.salary-text { font-weight: 700; color: #10b981; }
.date-text { color: #9ca3af; font-size: 0.9rem; }

/* КАРТОЧКИ КАНДИДАТОВ */
.candidates-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
.candidate-card { background: white; border: 1px solid #f0f0f0; border-radius: 16px; padding: 20px; transition: 0.3s; position: relative; display: flex; flex-direction: column; }
.candidate-card:hover { transform: translateY(-5px); box-shadow: 0 10px 30px rgba(0,0,0,0.05); border-color: #e0e7ff; }
.card-top { display: flex; align-items: center; gap: 15px; margin-bottom: 15px; }
.cand-info h4 { margin: 0; font-weight: 700; font-size: 1.1rem; color: #1f2937; }
.spec-text { margin: 0; color: #6b7280; font-size: 0.9rem; }
.bio { color: #4b5563; font-size: 0.9rem; margin-bottom: 15px; height: 42px; overflow: hidden; line-height: 1.4; }

.ai-box { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 10px; border-radius: 10px; margin-bottom: 15px; font-size: 0.85rem; }
.ai-score { font-weight: 700; margin-bottom: 4px; }
.score-high { color: #16a34a; }
.ai-reason { margin: 0; color: #374151; line-height: 1.4; }

.status-badge { padding: 6px; border-radius: 8px; text-align: center; font-weight: 700; font-size: 0.85rem; margin-bottom: 15px; display: flex; align-items: center; justify-content: center; gap: 6px; }
.status-badge.pending { background: #eff6ff; color: #3b82f6; }
.status-badge.accepted { background: #f0fdf4; color: #16a34a; }
.status-badge.declined { background: #fef2f2; color: #ef4444; }

.card-actions { display: flex; gap: 10px; margin-top: auto; }
.btn-ai-scan { flex: 1; background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px; cursor: pointer; font-weight: 600; color: #4b5563; transition: 0.2s; display: flex; align-items: center; justify-content: center; gap: 5px; }
.btn-ai-scan:hover { background: #e5e7eb; }
.btn-invite { flex: 1; background: #3b82f6; color: white; border: none; border-radius: 8px; padding: 8px; cursor: pointer; font-weight: 600; transition: 0.2s; }
.btn-invite:hover { background: #2563eb; }
.btn-invite:disabled { opacity: 0.6; cursor: default; }

/* СПИСОК ОТКЛИКОВ */
.app-list { max-width: 800px; margin: 0 auto; }
.app-item-card { background: white; border: 1px solid #f0f0f0; border-radius: 16px; padding: 25px; margin-bottom: 20px; transition: 0.3s; }
.app-item-card:hover { box-shadow: 0 8px 25px rgba(0,0,0,0.05); border-color: #e0e7ff; }
.app-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
.app-user { display: flex; gap: 15px; align-items: center; }
.app-user h4 { margin: 0; font-size: 1.2rem; font-weight: 700; }
.vacancy-label { color: #6b7280; font-size: 0.9rem; }
.app-score-badge { text-align: center; background: #f3f4f6; padding: 5px 10px; border-radius: 10px; }
.score-val { font-weight: 800; color: #10b981; font-size: 1.2rem; }
.score-txt { font-size: 0.7rem; color: #9ca3af; text-transform: uppercase; }

.cover-letter { background: #fafafa; padding: 15px; border-radius: 12px; margin-bottom: 20px; border-left: 4px solid #3b82f6; }
.cover-letter b { font-size: 0.9rem; color: #374151; display: block; margin-bottom: 5px; }
.cover-letter p { margin: 0; color: #4b5563; line-height: 1.5; }

.app-actions-row { display: flex; gap: 12px; }
.btn-action-outline { border: 1px solid #e5e7eb; background: white; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-weight: 600; color: #4b5563; display: flex; gap: 6px; align-items: center; transition: 0.2s; }
.btn-action-outline:hover { border-color: #3b82f6; color: #3b82f6; }
.btn-action-primary { background: #3b82f6; color: white; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-weight: 600; display: flex; gap: 6px; align-items: center; transition: 0.2s; }
.btn-action-primary:hover { background: #2563eb; }
.btn-action-danger { background: #fee2e2; color: #ef4444; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-weight: 600; display: flex; gap: 6px; align-items: center; transition: 0.2s; margin-left: auto; }
.btn-action-danger:hover { background: #fecaca; }

/* Анимации */
.fade-in { animation: fadeIn 0.8s ease; }
.fade-in-down { animation: fadeInDown 0.8s ease; }
.fade-in-up { animation: fadeInUp 0.8s ease; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes fadeInDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>