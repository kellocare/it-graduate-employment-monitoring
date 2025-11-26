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
      <div class="dashboard-header fade-in-up">
        <div class="header-left">
          <h1><bank-filled class="icon-header" /> Кабинет работодателя</h1>
          <p>Управляйте наймом, вакансиями и откликами в одном месте</p>
        </div>

        <!-- Статистика -->
        <div class="stats-row" v-if="company.id">
          <div class="stat-card">
            <div class="stat-icon blue"><appstore-filled /></div>
            <div class="stat-info">
              <strong>{{ vacancies.length }}</strong>
              <span>Вакансий</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon green"><team-outlined /></div>
            <div class="stat-info">
              <strong>{{ applications.length }}</strong>
              <span>Откликов</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ГЛАВНАЯ КАРТОЧКА -->
      <div class="glass-card main-content fade-in-up" style="animation-delay: 0.1s;">

        <a-tabs
          v-model:activeKey="activeTab"
          class="custom-tabs"
          :animated="false"
          destroyInactiveTabPane
        >

          <!-- 1. ПРОФИЛЬ КОМПАНИИ -->
          <a-tab-pane key="profile">
            <template #tab>
              <span><idcard-outlined /> Профиль</span>
            </template>

            <div class="profile-tab-container">
              <div class="profile-form-box">
                <div class="form-header">
                  <h3>Редактирование данных</h3>
                  <p>Информация о компании, которую видят кандидаты</p>
                </div>

                <a-form layout="vertical" class="compact-form">
                  <a-alert v-if="!company.id" message="Требуется заполнение" description="Заполните профиль, чтобы публиковать вакансии." type="info" show-icon class="mb-20"/>

                  <div class="input-group">
                    <a-form-item label="Название компании" required>
                      <a-input v-model:value="company.name" class="styled-input" placeholder="Например: ООО Техно">
                        <template #prefix><bank-outlined class="field-icon" /></template>
                      </a-input>
                    </a-form-item>

                    <div class="row-2">
                      <a-form-item label="ИНН" required :validate-status="innError ? 'error' : ''" :help="innError">
                        <a-input v-model:value="company.inn" class="styled-input" placeholder="Цифры ИНН" @change="validateInn" :maxLength="12">
                          <template #prefix><barcode-outlined class="field-icon" /></template>
                        </a-input>
                      </a-form-item>
                      <a-form-item label="Город" required>
                        <a-select v-model:value="company.city" show-search :options="cityOptions" placeholder="Город" class="styled-select">
                          <template #suffixIcon><environment-outlined class="field-icon" /></template>
                        </a-select>
                      </a-form-item>
                    </div>

                    <a-form-item label="Веб-сайт">
                      <a-input v-model:value="company.website" class="styled-input" placeholder="https://site.com">
                        <template #prefix><global-outlined class="field-icon" /></template>
                      </a-input>
                    </a-form-item>
                  </div>

                  <div class="input-group mt-4">
                    <a-form-item label="О компании">
                      <a-textarea v-model:value="company.description" :rows="4" class="styled-textarea" placeholder="Опишите деятельность компании..." show-count :maxlength="500" />
                    </a-form-item>
                  </div>

                  <div class="form-footer">
                    <button class="btn-save-profile" @click="saveCompany" :disabled="loading || !!innError">
                      <span v-if="!loading"><save-outlined /> Сохранить изменения</span>
                      <span v-else><loading-outlined /> Сохранение...</span>
                    </button>
                  </div>
                </a-form>
              </div>

              <div class="profile-preview-box">
                <div class="preview-card">
                  <div class="preview-header">Предпросмотр карточки</div>
                  <div class="preview-body">
                    <div class="preview-avatar"><bank-filled /></div>
                    <div class="preview-info">
                      <h4>{{ company.name || 'Название' }}</h4>
                      <div class="preview-meta">
                        <span><environment-outlined /> {{ company.city || 'Город' }}</span>
                        <span v-if="company.website"><link-outlined /> Сайт</span>
                      </div>
                      <p class="preview-desc">
                        {{ company.description ? company.description.substring(0, 80) + '...' : 'Описание компании будет отображаться здесь...' }}
                      </p>
                    </div>
                  </div>
                </div>
                <div class="preview-hint"><info-circle-outlined /> Так вашу компанию видят кандидаты</div>
              </div>
            </div>
          </a-tab-pane>

          <!-- 2. МОИ ВАКАНСИИ -->
          <a-tab-pane key="vacancies" :disabled="!company.id">
            <template #tab><span><solution-outlined /> Вакансии</span></template>
            <div class="tab-content-wrapper">
              <div class="section-header">
                <h3>Управление вакансиями</h3>
                <button class="btn-add-vacancy" @click="$router.push('/vacancies')"><plus-circle-filled /> Добавить вакансию</button>
              </div>
              <a-table :dataSource="vacancies" :columns="columns" rowKey="id" class="modern-table" :pagination="{ pageSize: 6 }">
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'title'"><span class="title-cell">{{ record.title }}</span></template>
                  <template v-if="column.key === 'status'">
                    <a-tag v-if="record.status === 'active'" color="success" class="status-tag"><check-circle-outlined /> Активна</a-tag>
                    <a-tag v-else-if="record.status === 'rejected'" color="error" class="status-tag"><close-circle-outlined /> Отклонена</a-tag>
                    <a-tag v-else color="processing" class="status-tag"><clock-circle-outlined /> На проверке</a-tag>
                  </template>
                  <template v-if="column.key === 'salary'"><span class="salary-text">{{ record.salary_min ? formatMoney(record.salary_min) : 'Не указана' }}</span></template>
                  <template v-if="column.key === 'action'">
                    <div class="action-buttons">
                      <button class="btn-icon-edit" @click="editVacancy(record)" :disabled="record.status === 'pending'" :class="{ disabled: record.status === 'pending' }"><edit-outlined /></button>
                      <a-popconfirm title="Удалить?" ok-text="Да" cancel-text="Нет" @confirm="deleteVacancy(record.id)"><button class="btn-icon-delete"><delete-outlined /></button></a-popconfirm>
                    </div>
                  </template>
                </template>
              </a-table>
            </div>
          </a-tab-pane>

          <!-- 3. ПОИСК КАНДИДАТОВ -->
          <a-tab-pane key="candidates" :disabled="!company.id">
            <template #tab><span><search-outlined /> База резюме</span></template>
            <div class="tab-content-wrapper">
               <div class="candidates-grid">
                  <div v-for="student in candidates" :key="student.id" class="candidate-card">
                    <div class="card-top">
                      <a-avatar :src="getAvatarUrl(student.avatar_url)" :size="64" class="cand-avatar" :style="{ backgroundColor: stringToColor(student.first_name) }"><template #icon><user-outlined /></template></a-avatar>
                      <div class="cand-info"><h4>{{ student.first_name }} {{ student.last_name }}</h4><div class="spec-badge"><code-outlined /> {{ student.specialty || 'Студент' }}</div></div>
                    </div>
                    <div class="bio-box">{{ student.about_me ? student.about_me.substring(0, 120) + '...' : 'Описание отсутствует' }}</div>

                    <div v-if="student.aiResult" class="ai-box fade-in">
                      <div class="ai-header-row">
                        <span class="ai-label"><robot-filled /> AI Match</span>
                        <span class="ai-score" :class="getScoreClass(student.aiResult.score)">{{ student.aiResult.score }}%</span>
                      </div>
                      <p class="ai-reason">{{ student.aiResult.reason }}</p>
                    </div>

                    <div class="card-footer">
                       <div class="status-text" v-if="student.invite_status">
                          <span v-if="student.invite_status === 'declined'" class="st-declined"><close-circle-filled /> Отказ</span>
                          <span v-else-if="student.invite_status === 'accepted'" class="st-accepted"><check-circle-filled /> В чате</span>
                          <span v-else class="st-pending"><clock-circle-filled /> Ждем</span>
                       </div>
                       <div class="btns-row" v-else>
                         <button class="btn-secondary" @click="analyzeCandidate(student)" :disabled="student.aiLoading"><loading-outlined v-if="student.aiLoading" /><robot-outlined v-else /></button>
                         <button class="btn-primary-small" @click="openInvite(student)">Пригласить</button>
                       </div>
                    </div>
                  </div>
               </div>
            </div>
          </a-tab-pane>

          <!-- 🔥 4. КАНБАН ДОСКА (ATS) -->
          <a-tab-pane key="applications" :disabled="!company.id">
            <template #tab>
              <span><project-outlined /> ATS Доска <a-badge :count="applications.length" :number-style="{ backgroundColor: '#52c41a' }" /></span>
            </template>

            <!-- Исправленный контейнер -->
            <div class="kanban-container">

              <div v-for="(col, statusKey) in kanbanColumns" :key="statusKey" class="kanban-column" :class="statusKey">

                <div class="column-header">
                  <div class="col-title-wrap">
                    <component :is="col.icon" :style="{ color: col.color }" />
                    <span class="col-title">{{ col.title }}</span>
                  </div>
                  <span class="col-count">{{ kanbanData[statusKey].length }}</span>
                </div>

                <draggable
                  v-model="kanbanData[statusKey]"
                  group="applications"
                  item-key="id"
                  @change="(e) => onDragChange(e, statusKey)"
                  class="draggable-area custom-scroll"
                  :animation="200"
                  ghost-class="ghost-card"
                >
                  <template #item="{ element }">
                    <div class="kanban-card" @click="openApplicationPreview(element)">

                      <!-- Хедер карточки -->
                      <div class="k-card-header">
                        <a-avatar :src="getAvatarUrl(element.avatar_url)" :size="32" :style="{ backgroundColor: stringToColor(element.first_name) }">
                          {{ element.first_name ? element.first_name[0] : '?' }}
                        </a-avatar>
                        <div class="k-user-info">
                          <div class="k-name">{{ element.first_name }} {{ element.last_name }}</div>
                          <div class="k-vacancy">{{ element.vacancy_title }}</div>
                        </div>
                      </div>

                      <!-- 🔥 AI БЛИЦ РЕЗУЛЬТАТЫ -->
                      <div class="k-blitz-result" v-if="element.ai_score">
                         <div class="ai-badge-row">
                           <robot-filled />
                           <span>Блиц: {{ element.ai_score }}%</span>
                           <a-tooltip title="Смотреть анализ">
                             <button class="btn-eye-mini" @click.stop="showAiFeedback(element)"><eye-outlined /></button>
                           </a-tooltip>
                         </div>
                      </div>

                      <!-- ТЕГИ ЭТАПОВ -->
                      <div class="k-tags" v-if="statusKey === 'review'">
                         <a-tag v-if="element.status === 'test_assigned'" color="purple" class="mini-tag"><edit-outlined /> Делает ТЗ</a-tag>
                         <a-tag v-else-if="element.status === 'reviewing'" color="cyan" class="mini-tag"><sync-outlined spin /> ИИ Проверка</a-tag>
                         <a-tag v-else-if="element.status === 'interview_pending'" color="green" class="mini-tag"><check-circle-outlined /> Прошел ТЗ</a-tag>
                      </div>

                      <!-- 🔥 БЛОК ИНТЕРВЬЮ -->
                      <div class="interview-alert" v-if="statusKey === 'interview' && element.interview_date">
                          <div class="int-date">📅 {{ formatInterviewDate(element.interview_date) }}</div>

                          <!-- Кнопки появляются если время пришло (или за 10 мин до) -->
                          <div v-if="isInterviewActionAvailable(element.interview_date)" class="int-actions fade-in">
                             <button class="btn-act-offer" @click.stop="openOfferModal(element)">Оффер</button>
                             <button class="btn-act-reject" @click.stop="openRejectWithReason(element)">Отказ</button>
                          </div>
                          <div v-else class="int-wait">Ожидание встречи...</div>
                      </div>

                      <div class="k-actions">
                         <a-tooltip title="Чат"><button class="k-btn" @click.stop="openInviteFromApp(element)"><message-outlined /></button></a-tooltip>
                         <a-tooltip title="Профиль"><button class="k-btn" @click.stop="showStudentProfile(element)"><eye-outlined /></button></a-tooltip>
                      </div>
                    </div>
                  </template>
                </draggable>
              </div>

            </div>
          </a-tab-pane>

        </a-tabs>
      </div>

    </div>

    <!-- МОДАЛКИ -->
    <a-modal v-model:open="profileModalVisible" :footer="null" width="550px" centered class="glass-modal">
      <div v-if="selectedStudent" class="student-modal-body">
        <div class="modal-top-bg"></div>
        <div class="modal-user-header">
           <a-avatar :size="90" :src="getAvatarUrl(selectedStudent.avatar_url)" class="modal-avatar-img" :style="{ backgroundColor: stringToColor(selectedStudent.first_name) }"><template #icon><user-outlined /></template></a-avatar>
           <h3>{{ selectedStudent.first_name }} {{ selectedStudent.last_name }}</h3>
           <p class="modal-spec">{{ selectedStudent.specialty_name || 'Специальность не указана' }}</p>
        </div>
        <div class="modal-info-list">
           <div class="m-row"><mail-outlined /> {{ selectedStudent.student_email }}</div>
           <div class="m-row"><phone-outlined /> {{ selectedStudent.phone || 'Нет телефона' }}</div>
           <div class="m-row"><environment-outlined /> {{ selectedStudent.city || 'Город не указан' }}</div>
        </div>
        <div class="modal-section"><h4>О себе</h4><p>{{ selectedStudent.about_me || 'Информация отсутствует.' }}</p></div>
        <div class="modal-section" v-if="selectedStudent.portfolio_links && selectedStudent.portfolio_links.length"><h4>Портфолио</h4><div class="links-wrapper"><a v-for="(link, i) in selectedStudent.portfolio_links" :key="i" :href="link.url" target="_blank" class="link-tag"><link-outlined /> {{ link.type }}</a></div></div>
      </div>
    </a-modal>

    <!-- МОДАЛКА AI БЛИЦ -->
    <a-modal v-model:open="aiFeedbackVisible" title="🤖 Результаты Блиц-теста" :footer="null" centered>
       <div v-if="selectedApp && selectedApp.ai_feedback">
         <div class="ai-score-big" :class="getScoreClass(selectedApp.ai_score)">{{ selectedApp.ai_score }}%</div>
         <p style="white-space: pre-line; line-height: 1.6; font-size: 0.95rem; color: #4b5563;">{{ selectedApp.ai_feedback }}</p>
       </div>
    </a-modal>

    <!-- МОДАЛКА ОФФЕР/ОТКАЗ -->
    <a-modal v-model:open="decisionModalVisible" :title="decisionType === 'offer' ? '🎉 Отправить Оффер' : '⛔ Отказать кандидату'" @ok="confirmDecision" centered okText="Отправить" cancelText="Отмена">
        <p style="color: #6b7280; margin-bottom: 10px;">Напишите сопроводительное сообщение для кандидата:</p>
        <a-textarea v-model:value="decisionMessage" rows="4" placeholder="Текст сообщения..." />
    </a-modal>

    <a-modal v-model:open="editVacancyVisible" title="Редактирование вакансии" @ok="saveVacancyEdit" centered okText="Сохранить" cancelText="Отмена">
      <a-form layout="vertical">
        <a-form-item label="Должность"><a-input v-model:value="editForm.title" /></a-form-item>
        <a-row :gutter="16">
           <a-col :span="12"><a-form-item label="Мин. ЗП"><a-input-number v-model:value="editForm.salary_min" style="width: 100%" /></a-form-item></a-col>
           <a-col :span="12"><a-form-item label="Макс. ЗП"><a-input-number v-model:value="editForm.salary_max" style="width: 100%" /></a-form-item></a-col>
        </a-row>
        <a-form-item label="Контактный Email"><a-input v-model:value="editForm.contact_email" /></a-form-item>
        <a-form-item label="Описание вакансии"><a-textarea v-model:value="editForm.description" rows="4" /></a-form-item>
      </a-form>
    </a-modal>

  </div>
</template>

<script>
import api from '../axios';
import { message, Modal } from 'ant-design-vue';
import draggable from 'vuedraggable';
import { h } from 'vue';
import {
  SaveOutlined, PlusCircleFilled, DeleteOutlined, UserOutlined, EditOutlined,
  CloseCircleOutlined, CheckCircleOutlined, ClockCircleOutlined, CloseCircleFilled, CheckCircleFilled, ClockCircleFilled,
  EyeOutlined, MessageOutlined, CloseOutlined, LinkOutlined, SyncOutlined, ThunderboltFilled,
  AppstoreFilled, TeamOutlined, RobotFilled, RobotOutlined, LoadingOutlined, InboxOutlined,
  BankFilled, IdcardOutlined, SolutionOutlined, SearchOutlined, CheckCircleTwoTone,
  MailOutlined, PhoneOutlined, EnvironmentOutlined, TagOutlined, InfoCircleOutlined,
  BankOutlined, BarcodeOutlined, GlobalOutlined, ProjectOutlined,
  FileSearchOutlined, TrophyOutlined, StopOutlined
} from '@ant-design/icons-vue';

const RUSSIAN_CITIES = ['Москва', 'Санкт-Петербург', 'Новосибирск', 'Екатеринбург', 'Казань', 'Нижний Новгород'];

export default {
  components: {
    draggable,
    SaveOutlined, PlusCircleFilled, DeleteOutlined, UserOutlined, EditOutlined,
    CloseCircleOutlined, CheckCircleOutlined, ClockCircleOutlined, CloseCircleFilled, CheckCircleFilled, ClockCircleFilled,
    EyeOutlined, MessageOutlined, CloseOutlined, LinkOutlined, SyncOutlined, ThunderboltFilled,
    AppstoreFilled, TeamOutlined, RobotFilled, RobotOutlined, LoadingOutlined, InboxOutlined,
    BankFilled, IdcardOutlined, SolutionOutlined, SearchOutlined, CheckCircleTwoTone,
    MailOutlined, PhoneOutlined, EnvironmentOutlined, TagOutlined, InfoCircleOutlined,
    BankOutlined, BarcodeOutlined, GlobalOutlined, ProjectOutlined,
    FileSearchOutlined, TrophyOutlined, StopOutlined
  },
  data() {
    return {
      activeTab: 'profile',
      loading: false,
      company: { name: '', city: '', description: '', website: '', inn: '' },
      vacancies: [],
      candidates: [],
      applications: [],

      // KANBAN
      kanbanColumns: {
        'review': { title: 'На рассмотрении', icon: 'FileSearchOutlined', color: '#1890ff' },
        'interview': { title: 'Интервью', icon: 'TeamOutlined', color: '#722ed1' },
        'offer': { title: 'Оффер', icon: 'TrophyOutlined', color: '#52c41a' },
        'rejected': { title: 'Отказ', icon: 'StopOutlined', color: '#ff4d4f' }
      },
      kanbanData: { review: [], interview: [], offer: [], rejected: [] },

      columns: [
        { title: 'Должность', dataIndex: 'title', key: 'title' },
        { title: 'Статус', key: 'status', width: 140 },
        { title: 'Зарплата', key: 'salary' },
        { title: '', key: 'action', width: 100, align: 'right' },
      ],

      profileModalVisible: false,
      appPreviewVisible: false,
      aiFeedbackVisible: false,
      decisionModalVisible: false,
      editVacancyVisible: false,

      selectedStudent: null,
      selectedApp: null,
      editForm: {},

      decisionType: '',
      decisionMessage: '',

      innError: '',
      cityOptions: RUSSIAN_CITIES.map(c => ({ value: c, label: c }))
    };
  },
  async mounted() {
    await this.loadCompany();
    if (this.company.id) {
      this.activeTab = 'vacancies';
      this.loadMyVacancies();
      this.loadCandidates();
      this.loadApplications();
    }
  },
  methods: {
    distributeApplications() {
      Object.keys(this.kanbanData).forEach(k => this.kanbanData[k] = []);
      this.applications.forEach(app => {
        if (app.status === 'pending_test') return;
        let targetCol = 'review';
        const s = app.status;
        if (['accepted', 'test_assigned', 'reviewing', 'interview_pending', 'review', 'pending'].includes(s)) targetCol = 'review';
        else if (s === 'interview') targetCol = 'interview';
        else if (s === 'offer') targetCol = 'offer';
        else if (['rejected', 'rejected_final', 'employer_rejected'].includes(s)) targetCol = 'rejected';
        this.kanbanData[targetCol].push(app);
      });
    },
    async onDragChange(event, newColumnKey) {
      if (event.added) {
        const item = event.added.element;
        let newDbStatus = 'review';
        if (newColumnKey === 'interview') newDbStatus = 'interview';
        else if (newColumnKey === 'offer') newDbStatus = 'offer';
        else if (newColumnKey === 'rejected') newDbStatus = 'employer_rejected';

        try {
          await api.put(`/applications/${item.id}/status`, { status: newDbStatus });
          message.success(`Перемещено: ${this.kanbanColumns[newColumnKey].title}`);
          item.status = newDbStatus;
        } catch (e) {
          message.error('Ошибка обновления статуса');
          this.loadApplications();
        }
      }
    },

    // --- AI FEEDBACK ---
    showAiFeedback(app) {
        this.selectedApp = app;
        this.aiFeedbackVisible = true;
    },

    // --- INTERVIEW LOGIC ---
    isInterviewActionAvailable(dateStr) {
        if (!dateStr) return false;
        const interviewTime = new Date(dateStr).getTime();
        const now = Date.now();
        const tenMinutes = 10 * 60 * 1000;
        return now >= (interviewTime - tenMinutes);
    },
    formatInterviewDate(dateStr) {
        return new Date(dateStr).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit' });
    },

    // --- DECISION ---
    openOfferModal(app) {
        this.selectedApp = app;
        this.decisionType = 'offer';
        this.decisionMessage = `Мы рады предложить вам оффер на позицию ${app.vacancy_title}.`;
        this.decisionModalVisible = true;
    },
    openRejectWithReason(app) {
        this.selectedApp = app;
        this.decisionType = 'rejected';
        this.decisionMessage = `Спасибо за уделенное время, но мы решили продолжить с другими кандидатами.`;
        this.decisionModalVisible = true;
    },
    async confirmDecision() {
        if (!this.decisionMessage) return message.warning('Напишите сообщение');
        try {
            const newStatus = this.decisionType === 'offer' ? 'offer' : 'employer_rejected';
            await api.put(`/applications/${this.selectedApp.id}/status`, {
                status: newStatus,
                reason: this.decisionMessage
            });
            message.success(this.decisionType === 'offer' ? 'Оффер отправлен!' : 'Отказ отправлен');
            this.decisionModalVisible = false;
            this.loadApplications();
        } catch(e) { message.error('Ошибка'); }
    },

    // --- LOADERS & HELPERS ---
    async loadCompany() { try { const r = await api.get('/employer/company'); if(r.data.id) this.company = r.data; } catch(e){} },
    async loadMyVacancies() { try { const r = await api.get('/vacancies/my'); this.vacancies = r.data; } catch(e){} },
    async loadCandidates() { try { const r = await api.get('/candidates'); this.candidates = r.data.map(c => ({...c, aiLoading: false})); } catch(e){} },
    async loadApplications() { try { const r = await api.get('/applications/employer'); this.applications = r.data; this.distributeApplications(); } catch(e){} },

    // ... (Остальные методы стандартные)
    openApplicationPreview(app) { this.selectedApp = app; this.appPreviewVisible = true; },
    validateInn() { const inn = this.company.inn; if (!inn) { this.innError = ''; return; } if (!/^\d{10}$|^\d{12}$/.test(inn)) this.innError = 'Некорректный ИНН'; else this.innError = ''; },
    async saveCompany() {
      if (!this.company.name || !this.company.city) return message.error('Заполните обязательные поля');
      if (this.innError) return message.error('Ошибка в ИНН');
      this.loading = true;
      try { await api.post('/employer/company', this.company); message.success('Профиль сохранен'); if (this.activeTab === 'profile') this.activeTab = 'vacancies'; } catch (e) { message.error('Ошибка'); } finally { this.loading = false; }
    },
    async deleteVacancy(id) { try { await api.delete(`/vacancies/${id}`); await this.loadMyVacancies(); message.success('Удалено'); } catch(e){} },
    editVacancy(record) { this.editForm = { ...record }; this.editVacancyVisible = true; },
    async saveVacancyEdit() { try { await api.put(`/vacancies/${this.editForm.id}`, this.editForm); message.success('Обновлено'); this.editVacancyVisible = false; this.loadMyVacancies(); } catch(e) { message.error('Ошибка'); } },
    async analyzeCandidate(student) { student.aiLoading = true; try { const r = await api.post('/candidates/analyze', { candidate_id: student.id }); student.aiResult = r.data; } catch(e){ message.error('Ошибка AI'); } finally { student.aiLoading = false; } },
    showStudentProfile(appItem) { this.selectedStudent = { ...appItem, student_email: appItem.student_email || appItem.email, avatar_url: appItem.avatar_url, phone: appItem.phone, city: appItem.city, about_me: appItem.about_me, portfolio_links: appItem.portfolio_links }; this.profileModalVisible = true; },
    async rejectApp(appId) { try { await api.put(`/applications/${appId}/status`, { status: 'employer_rejected' }); message.success('Отклонено'); await this.loadApplications(); } catch (e) { message.error('Ошибка'); } },
    openInvite(student) { let msg = ''; Modal.confirm({ title: `Приглашение`, content: h('div', {}, [ h('p', 'Сообщение:'), h('textarea', { class: 'ant-input', rows: 3, onInput: (e) => { msg = e.target.value } }) ]), onOk: async () => { try { const userId = student.user_id || student.student_user_id; await api.post('/candidates/invite', { candidate_user_id: userId, message: msg }); message.success('Отправлено!'); } catch(e){ message.error('Ошибка'); } } }); },
    openInviteFromApp(appItem) { this.openInvite({ first_name: appItem.first_name, user_id: appItem.student_user_id }); },
    getAvatarUrl(url) { return url ? `http://localhost:4000${url}` : null; },
    getScoreClass(score) { if (score>=80) return 'score-high'; if (score>=50) return 'score-mid'; return 'score-low'; },
    formatMoney(val) { return new Intl.NumberFormat('ru-RU').format(val) + ' ₽'; },
    formatDate(val) { return new Date(val).toLocaleDateString('ru-RU'); },
    stringToColor(str) { if(!str) return '#ccc'; let hash = 0; for (let i = 0; i < str.length; i++) { hash = str.charCodeAt(i) + ((hash << 5) - hash); } const c = (hash & 0x00FFFFFF).toString(16).toUpperCase(); return '#' + '00000'.substring(0, 6 - c.length) + c; }
  }
};
</script>

<style scoped>
/* --- KANBAN CONTAINER --- */
.kanban-container {
  display: flex;
  gap: 16px;
  height: 70vh;
  width: 100%;
  overflow-x: auto;
  padding-bottom: 10px;
}
.kanban-column {
  flex: 1;
  min-width: 260px;
  max-width: 400px;
  background: rgba(243, 244, 246, 0.6);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(255,255,255,0.5);
  backdrop-filter: blur(10px);
  transition: background 0.3s;
}
.kanban-column:hover { background: rgba(243, 244, 246, 0.85); }

/* COLUMN HEADERS */
.kanban-column.review .column-header { border-top: 4px solid #3b82f6; }
.kanban-column.interview .column-header { border-top: 4px solid #8b5cf6; }
.kanban-column.offer .column-header { border-top: 4px solid #10b981; }
.kanban-column.rejected .column-header { border-top: 4px solid #ef4444; }

.column-header { padding: 12px 16px; font-weight: 700; color: #374151; background: rgba(255,255,255,0.6); border-radius: 16px 16px 0 0; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(0,0,0,0.05); flex-shrink: 0; }
.col-title-wrap { display: flex; align-items: center; gap: 8px; font-size: 0.95rem; }
.col-count { background: white; padding: 2px 8px; border-radius: 10px; font-size: 0.8rem; font-weight: 700; color: #6b7280; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }

.draggable-area { flex: 1; padding: 12px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; }
.draggable-area:empty::after { content: 'Перетащите сюда'; display: block; text-align: center; color: #9ca3af; margin-top: 20px; font-size: 0.85rem; border: 2px dashed #e5e7eb; border-radius: 12px; padding: 20px; }

/* CARD */
.kanban-card { background: white; border-radius: 14px; padding: 14px; box-shadow: 0 2px 6px rgba(0,0,0,0.02); cursor: grab; border: 1px solid transparent; transition: all 0.2s; position: relative; }
.kanban-card:hover { box-shadow: 0 8px 20px rgba(0,0,0,0.08); transform: translateY(-3px); border-color: #bfdbfe; z-index: 10; }
.kanban-card:active { cursor: grabbing; }
.ghost-card { opacity: 0.6; background: #eff6ff; border: 2px dashed #3b82f6; transform: scale(0.95); }

/* CARD INNER */
.k-card-header { display: flex; gap: 12px; align-items: center; margin-bottom: 10px; }
.k-user-info { overflow: hidden; flex: 1; }
.k-name { font-weight: 700; font-size: 0.95rem; color: #1f2937; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.k-vacancy { font-size: 0.75rem; color: #6b7280; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; margin-top: 2px; }
.k-tags { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px; }
.mini-tag { font-size: 0.7rem; padding: 2px 6px; border-radius: 4px; font-weight: 600; display: flex; align-items: center; gap: 4px; }
.k-actions { display: flex; justify-content: flex-end; gap: 8px; border-top: 1px dashed #f3f4f6; padding-top: 10px; margin-top: 5px; }
.k-btn { width: 30px; height: 30px; border-radius: 8px; border: 1px solid #e5e7eb; background: white; color: #9ca3af; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
.k-btn:hover { border-color: #3b82f6; color: #3b82f6; background: #eff6ff; }

/* BLITZ & INTERVIEW */
.k-blitz-result { background: #fff7e6; padding: 6px 10px; border-radius: 8px; border: 1px solid #ffe7ba; margin-bottom: 10px; font-size: 0.8rem; color: #d48806; font-weight: 600; }
.ai-badge-row { display: flex; align-items: center; justify-content: space-between; }
.btn-eye-mini { background: white; border: 1px solid #ffd591; color: #faad14; border-radius: 4px; cursor: pointer; padding: 2px 6px; }
.ai-score-big { font-size: 2rem; font-weight: 800; text-align: center; margin-bottom: 15px; color: #3b82f6; }

.interview-alert { background: #f6ffed; border: 1px solid #b7eb8f; padding: 10px; border-radius: 8px; margin-bottom: 10px; }
.int-date { font-weight: 700; color: #389e0d; margin-bottom: 5px; font-size: 0.85rem; }
.int-actions { display: flex; gap: 5px; margin-top: 5px; animation: fadeIn 0.5s; }
.btn-act-offer { flex: 1; background: #52c41a; color: white; border: none; padding: 4px; border-radius: 4px; font-size: 0.75rem; cursor: pointer; }
.btn-act-reject { flex: 1; background: white; border: 1px solid #ff4d4f; color: #ff4d4f; padding: 4px; border-radius: 4px; font-size: 0.75rem; cursor: pointer; }
.int-wait { font-size: 0.75rem; color: #8c8c8c; font-style: italic; }

/* GLOBAL STYLES (Header, Stats, etc.) */
.page-wrapper { position: relative; width: 100%; min-height: 90vh; background: #f3f4f6; display: flex; justify-content: center; padding: 40px 20px; }
.blobs-container { position: fixed; inset: 0; pointer-events: none; z-index: 0; }
.blob { position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.5; }
.blob-1 { width: 400px; height: 400px; background: #a855f7; top: -100px; left: -100px; }
.blob-2 { width: 300px; height: 300px; background: #3b82f6; bottom: -50px; right: -50px; }
.content-container { position: relative; z-index: 1; width: 100%; max-width: 1200px; display: flex; flex-direction: column; gap: 25px; }
.dashboard-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px; }
.header-left h1 { font-size: 2rem; font-weight: 800; color: #1f2937; margin: 0; display: flex; align-items: center; gap: 10px; }
.icon-header { color: #3b82f6; }
.header-left p { color: #6b7280; margin: 5px 0 0; font-size: 1rem; }
.stats-row { display: flex; gap: 15px; }
.stat-card { background: rgba(255,255,255,0.8); backdrop-filter: blur(10px); padding: 12px 20px; border-radius: 16px; display: flex; align-items: center; gap: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #fff; transition: 0.3s; }
.stat-card:hover { transform: translateY(-2px); }
.stat-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; color: white; }
.stat-icon.blue { background: linear-gradient(135deg, #3b82f6, #2563eb); }
.stat-icon.green { background: linear-gradient(135deg, #10b981, #059669); }
.stat-info { display: flex; flex-direction: column; line-height: 1.1; }
.stat-info strong { font-size: 1.2rem; color: #1f2937; }
.stat-info span { font-size: 0.75rem; color: #6b7280; font-weight: 600; text-transform: uppercase; }
.glass-card { background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.9); border-radius: 24px; box-shadow: 0 10px 40px rgba(0,0,0,0.05); padding: 30px; min-height: 600px; }
.custom-tabs :deep(.ant-tabs-nav) { margin-bottom: 20px; }
.custom-tabs :deep(.ant-tabs-tab) { font-size: 1rem; font-weight: 600; padding: 12px 20px; }
.custom-tabs :deep(.ant-tabs-tab-active) { color: #3b82f6; }
.custom-tabs :deep(.ant-tabs-ink-bar) { background: #3b82f6; height: 3px; border-radius: 3px; }
.fade-in-up { animation: fadeInUp 0.6s ease forwards; }
@keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

/* PROFILE TAB STYLES */
.profile-tab-container { display: grid; grid-template-columns: 1.4fr 1fr; gap: 40px; padding: 10px; align-items: start; }
.profile-form-box { max-width: 600px; }
.form-header { margin-bottom: 25px; }
.form-header h3 { font-size: 1.5rem; font-weight: 700; color: #1f2937; margin: 0; }
.form-header p { color: #6b7280; margin: 5px 0 0; }
.input-group { background: #f9fafb; padding: 20px; border-radius: 16px; border: 1px solid #f3f4f6; margin-bottom: 20px; }
.mt-4 { margin-top: 20px; }
.row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
.styled-input, .styled-select, .styled-textarea { border-radius: 10px; border: 1px solid #e5e7eb; background: white; padding: 8px 11px; font-size: 0.95rem; transition: all 0.3s ease; box-shadow: 0 2px 5px rgba(0,0,0,0.02); }
.styled-input:focus, .styled-input:hover, .styled-textarea:focus, .styled-textarea:hover { border-color: #8b5cf6; box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.1); background: #fff; }
.field-icon { color: #9ca3af; font-size: 1.1rem; margin-right: 5px; }
.form-footer { display: flex; justify-content: flex-start; }
.btn-save-profile { background: #1f2937; color: white; border: none; padding: 12px 35px; border-radius: 12px; font-weight: 600; cursor: pointer; font-size: 1rem; display: flex; align-items: center; gap: 8px; transition: 0.3s; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
.btn-save-profile:hover { background: #374151; transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.15); }
.btn-save-profile:disabled { opacity: 0.7; cursor: not-allowed; }
.profile-preview-box { display: flex; flex-direction: column; align-items: center; justify-content: center; padding-top: 20px; }
.preview-card { background: white; border: 1px solid #e5e7eb; border-radius: 20px; width: 100%; max-width: 320px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.05); }
.preview-header { background: #f9fafb; padding: 10px; text-align: center; font-size: 0.8rem; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #f3f4f6; }
.preview-body { padding: 25px; text-align: center; }
.preview-avatar { width: 70px; height: 70px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 14px; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center; color: white; font-size: 1.8rem; box-shadow: 0 5px 15px rgba(99, 102, 241, 0.3); }
.preview-info h4 { margin: 0 0 5px; font-size: 1.2rem; font-weight: 700; color: #1f2937; }
.preview-meta { display: flex; justify-content: center; gap: 10px; font-size: 0.8rem; color: #6b7280; margin-bottom: 15px; }
.preview-desc { font-size: 0.9rem; color: #4b5563; line-height: 1.5; background: #f9fafb; padding: 10px; border-radius: 8px; text-align: left; font-style: italic; }
.preview-hint { margin-top: 15px; color: #9ca3af; font-size: 0.85rem; display: flex; gap: 5px; align-items: center; }

/* VACANCIES TABLE */
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.section-header h3 { margin: 0; font-size: 1.3rem; color: #1f2937; }
.btn-add-vacancy { background: #ecfdf5; color: #10b981; border: 1px solid #d1fae5; padding: 8px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: 0.2s; }
.btn-add-vacancy:hover { background: #10b981; color: white; border-color: #10b981; }
.modern-table :deep(.ant-table) { background: transparent; }
.modern-table :deep(.ant-table-thead > tr > th) { background: rgba(249, 250, 251, 0.5); font-weight: 700; color: #6b7280; }
.title-cell { font-weight: 600; color: #1f2937; font-size: 1rem; }
.salary-text { font-weight: 700; color: #059669; }
.status-tag { font-weight: 600; border-radius: 12px; padding: 2px 10px; display: inline-flex; align-items: center; gap: 4px; }
.action-buttons { display: flex; gap: 8px; justify-content: flex-end; }
.btn-icon-edit, .btn-icon-delete { border: none; width: 32px; height: 32px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
.btn-icon-edit { background: #eff6ff; color: #3b82f6; }
.btn-icon-edit:hover { background: #2563eb; color: white; }
.btn-icon-edit.disabled { background: #f3f4f6; color: #cbd5e1; cursor: not-allowed; }
.btn-icon-delete { background: #fef2f2; color: #ef4444; }
.btn-icon-delete:hover { background: #ef4444; color: white; }

/* CANDIDATES */
.candidates-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
.candidate-card { background: white; border-radius: 16px; padding: 20px; border: 1px solid #f0f0f0; transition: 0.3s; display: flex; flex-direction: column; }
.candidate-card:hover { transform: translateY(-5px); box-shadow: 0 10px 25px rgba(0,0,0,0.05); border-color: #bfdbfe; }
.card-top { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.cand-info h4 { margin: 0; font-weight: 700; font-size: 1.05rem; color: #1f2937; line-height: 1.2; }
.spec-badge { font-size: 0.75rem; color: #6b7280; background: #f9fafb; padding: 2px 8px; border-radius: 6px; margin-top: 4px; display: inline-block; }
.bio-box { font-size: 0.85rem; color: #4b5563; line-height: 1.5; margin-bottom: 15px; height: 40px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.ai-box { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 10px; border-radius: 8px; margin-bottom: 15px; }
.ai-header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.ai-label { font-size: 0.75rem; font-weight: 700; color: #166534; display: flex; align-items: center; gap: 4px; }
.ai-score { font-weight: 800; }
.ai-reason { margin: 0; font-size: 0.75rem; color: #14532d; line-height: 1.3; }
.score-high { color: #16a34a; } .score-mid { color: #ca8a04; } .score-low { color: #dc2626; }
.card-footer { margin-top: auto; }
.btns-row { display: flex; gap: 8px; }
.btn-secondary { flex: 1; border: 1px solid #e5e7eb; background: white; border-radius: 8px; cursor: pointer; padding: 6px; color: #4b5563; transition: 0.2s; }
.btn-secondary:hover { background: #f9fafb; border-color: #d1d5db; }
.btn-primary-small { flex: 2; background: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; transition: 0.2s; }
.btn-primary-small:hover { background: #2563eb; }

/* Custom Scrollbars */
.custom-scroll::-webkit-scrollbar { width: 5px; }
.custom-scroll-x::-webkit-scrollbar { height: 5px; }
.custom-scroll::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 10px; }
.custom-scroll::-webkit-scrollbar-track { background: transparent; }

/* MODAL & OTHER */
.glass-modal .ant-modal-content { border-radius: 20px; overflow: hidden; }
.modal-top-bg { height: 100px; background: linear-gradient(135deg, #a78bfa, #3b82f6); margin: -24px -24px 0; }
.modal-user-header { text-align: center; margin-top: -50px; margin-bottom: 20px; }
.modal-avatar-img { border: 4px solid white; box-shadow: 0 5px 15px rgba(0,0,0,0.1); }
.modal-user-header h3 { margin: 10px 0 5px; font-size: 1.5rem; font-weight: 800; color: #1f2937; }
.modal-spec { color: #6b7280; font-size: 0.95rem; }
.modal-info-list { background: #f9fafb; border-radius: 12px; padding: 15px; display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }
.m-row { display: flex; align-items: center; gap: 10px; color: #4b5563; font-size: 0.9rem; }
.modal-section h4 { font-size: 1rem; font-weight: 700; color: #1f2937; margin-bottom: 8px; border-left: 3px solid #3b82f6; padding-left: 10px; }
.links-wrapper { display: flex; flex-wrap: wrap; gap: 8px; }
.link-tag { background: #eff6ff; color: #2563eb; padding: 4px 12px; border-radius: 20px; font-size: 0.85rem; font-weight: 600; text-decoration: none; display: flex; align-items: center; gap: 5px; }
.mb-20 { margin-bottom: 20px; }
</style>