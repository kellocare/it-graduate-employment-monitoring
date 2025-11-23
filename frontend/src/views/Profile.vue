<template>
  <div class="page-wrapper">
    <div class="blobs-container">
      <div class="blob blob-1"></div><div class="blob blob-2"></div><div class="blob blob-3"></div>
    </div>

    <div class="content-container">
      <a-spin :spinning="loading">

        <!-- 1. ВЕРХНЯЯ КАРТОЧКА -->
        <div class="glass-card main-card fade-in">
          <div class="bg-decoration-circle"></div>
          <div class="top-actions">
            <button v-if="!isEditing" class="btn-glass-edit" @click="enableEdit"><edit-outlined /> Редактировать</button>
          </div>
          <div class="avatar-column">
            <div class="avatar-stack">
              <a-progress v-if="!isEmployer" type="circle" :percent="completionRate" :width="170" :stroke-color="{ '0%': '#108ee9', '100%': '#87d068' }" :stroke-width="6" class="progress-ring" :show-info="false" />
              <div class="avatar-img-box"><a-avatar :size="135" :src="getAvatarUrl(profile.avatar_url)" class="main-avatar"><template #icon><user-outlined class="default-icon" /></template></a-avatar></div>
              <a-upload v-if="isEditing" name="avatar" :show-upload-list="false" :customRequest="handleUpload" class="avatar-upload-pos"><button class="btn-mini-edit" title="Загрузить фото"><camera-outlined /></button></a-upload>
            </div>
            <div class="name-block">
              <h1 class="full-name">{{ profile.last_name }} {{ profile.first_name }}</h1>
              <div class="specialty-badge" v-if="profile.specialty_name || profile.position">
                <code-outlined v-if="!isEmployer" /><idcard-outlined v-else /> {{ isEmployer ? profile.position : profile.specialty_name }}
              </div>
              <div class="specialty-badge empty" v-else>{{ isEmployer ? 'Должность не указана' : 'Специальность не выбрана' }}</div>
            </div>
          </div>
        </div>

        <!-- 2. НИЖНЯЯ СЕТКА -->
        <div class="grid-layout" :class="{ 'single-col': isEmployer }">

          <!-- ЛЕВАЯ КОЛОНКА -->
          <div class="glass-card left-col fade-in card-accent-purple">
            <idcard-outlined class="bg-icon" />
            <div class="card-header"><h3><user-outlined /> Личные данные</h3></div>

            <div v-if="!isEditing" class="info-view">
              <div class="info-group">
                <template v-if="!isEmployer">
                  <div class="info-row"><span class="label">Дата рождения</span><span class="value">{{ formatDate(profile.birth_date) || '—' }}</span></div>
                  <div class="info-row"><span class="label">Город</span><span class="value">{{ profile.city || '—' }}</span></div>
                </template>
                <div class="info-row"><span class="label">Телефон</span><span class="value phone">{{ profile.phone || '—' }}</span></div>
                <div class="info-row"><span class="label">Telegram</span><span class="value telegram"><a v-if="profile.telegram" :href="'https://t.me/' + profile.telegram.replace('@', '')" target="_blank">{{ profile.telegram }}</a><span v-else>—</span></span></div>
                <div class="info-row" v-if="!isEmployer"><span class="label">Год выпуска</span><span class="value">{{ profile.graduation_year || '—' }}</span></div>
              </div>
              <div v-if="!isEmployer">
                <div class="divider"></div>
                <div class="about-section"><h4>О себе</h4><p class="about-text">{{ profile.about_me || 'Расскажите о своих навыках...' }}</p></div>
                <div class="links-section" v-if="profile.portfolio_links && profile.portfolio_links.length"><h4>Портфолио</h4><div class="links-grid"><a v-for="(link, idx) in profile.portfolio_links" :key="idx" :href="link.url" target="_blank" class="modern-link-tag"><component :is="getIconForType(link.type)" /> {{ getLabelForType(link.type) }}</a></div></div>
              </div>
            </div>

            <!-- ФОРМА РЕДАКТИРОВАНИЯ -->
            <a-form v-else layout="vertical" class="modern-form">
               <div class="form-row-2"><a-form-item label="Фамилия"><a-input v-model:value="form.last_name" class="modern-input" /></a-form-item><a-form-item label="Имя"><a-input v-model:value="form.first_name" class="modern-input" /></a-form-item></div>
               <a-form-item label="Должность" v-if="isEmployer"><a-input v-model:value="form.position" class="modern-input" placeholder="Например: HR-менеджер" /></a-form-item>
               <template v-if="!isEmployer">
                 <a-form-item label="Специальность"><a-select v-model:value="form.specialty_id" class="modern-select"><a-select-option v-for="s in specialties" :key="s.id" :value="s.id">{{ s.code }} - {{ s.name }}</a-select-option></a-select></a-form-item>
                 <div class="form-row-2"><a-form-item label="Город"><a-select v-model:value="form.city" show-search :options="cityOptions" placeholder="Город" class="modern-select" /></a-form-item><a-form-item label="Дата рождения"><a-input type="date" v-model:value="form.birth_date" class="modern-input" /></a-form-item></div>
               </template>
               <div class="form-row-2"><a-form-item label="Телефон" :validate-status="phoneError ? 'error' : ''" :help="phoneError"><a-input v-model:value="form.phone" @change="validatePhone" placeholder="+7..." class="modern-input" /></a-form-item><a-form-item label="Telegram"><a-input v-model:value="form.telegram" prefix="@" class="modern-input" /></a-form-item></div>
               <template v-if="!isEmployer">
                 <div class="links-editor"><h4>Ссылки</h4><transition-group name="list"><div v-for="(link, index) in form.portfolio_links" :key="index" class="link-edit-row"><a-select v-model:value="link.type" style="width: 130px" class="mini-select"><a-select-option value="github">GitHub</a-select-option><a-select-option value="telegram">Telegram</a-select-option><a-select-option value="other">Другое</a-select-option></a-select><a-input v-model:value="link.url" placeholder="URL" class="mini-input" /><button class="btn-icon-delete" @click="removeLink(index)"><delete-outlined /></button></div></transition-group><button class="btn-add-link" @click="addLink"><plus-outlined /> Добавить ссылку</button></div>
                 <a-form-item label="О себе"><a-textarea v-model:value="form.about_me" :rows="5" class="modern-input" /></a-form-item>
               </template>
               <div class="edit-actions"><a-button type="primary" shape="round" size="large" @click="saveProfile" :disabled="!!phoneError">Сохранить</a-button><a-button shape="round" size="large" @click="cancelEdit" style="margin-left: 10px">Отмена</a-button></div>
            </a-form>
          </div>

          <!-- ПРАВАЯ КОЛОНКА (ТОЛЬКО СТУДЕНТ) -->
          <div class="right-column-wrapper" v-if="!isEmployer">

            <!-- === БЛОК: ТЕКУЩИЙ ROADMAP (ОБНОВЛЕННЫЙ) === -->
            <div class="glass-card right-col fade-in card-accent-purple mb-20" v-if="roadmapData.length > 0">
              <div class="card-header">
                <h3><compass-outlined /> Мое развитие</h3>
                <router-link to="/roadmap" class="btn-icon-link"><arrow-right-outlined /></router-link>
              </div>

              <div class="roadmap-widget-content">
                 <!-- Название роли (динамическое) -->
                 <h4 class="roadmap-title">{{ currentRoadmapTitle }}</h4>
                 <div class="roadmap-date">{{ formatDate(new Date()) }}</div>

                 <div class="circle-wrapper">
                    <a-progress type="circle" :percent="currentRoadmapProgress" :width="100" stroke-color="#8b5cf6" />
                 </div>

                 <div class="rp-next">
                    <span>Следующий шаг:</span>
                    <strong>{{ nextRoadmapStep }}</strong>
                 </div>
              </div>
            </div>

            <!-- === БЛОК: ИСТОРИЯ ОБУЧЕНИЯ (НОВЫЙ) === -->
            <div class="glass-card right-col fade-in card-accent-purple mb-20" v-if="roadmapHistory.length > 0">
               <div class="card-header">
                  <h3><history-outlined /> История обучения</h3>
               </div>

               <div class="history-list">
                  <div v-for="h in roadmapHistory" :key="h.id" class="history-item">
                     <div class="h-info">
                        <div class="h-title">{{ h.role_title }}</div>
                        <div class="h-date">{{ formatDate(h.completed_at) }}</div>
                     </div>
                     <div class="h-progress">
                        <div class="h-score" :class="h.progress === 100 ? 'done' : ''">{{ h.progress }}%</div>
                     </div>
                  </div>
               </div>
            </div>

            <!-- БЛОК: ОПЫТ РАБОТЫ -->
            <div class="glass-card right-col fade-in card-accent-blue mb-20">
              <flag-outlined class="bg-icon" />
              <div class="card-header">
                <h3><solution-outlined /> Карьерный путь</h3>
                <button v-if="!showJobForm" class="btn-add-job" @click="openJobForm"><plus-outlined /></button>
              </div>
              <div v-if="showJobForm" class="job-form-wrapper">
                  <div class="form-title">{{ jobForm.id ? 'Редактирование' : 'Новое место' }}</div>
                  <a-form layout="vertical">
                    <a-form-item label="Компания"><a-select v-model:value="jobForm.company_id" placeholder="Выберите компанию" class="modern-select"><a-select-option v-for="c in companies" :key="c.id" :value="c.id">{{ c.name }}</a-select-option></a-select></a-form-item>
                    <a-form-item label="Должность"><a-input v-model:value="jobForm.position_title" class="modern-input" /></a-form-item>
                    <div class="form-row-2"><a-form-item label="Зарплата"><a-input-number v-model:value="jobForm.salary_amount" style="width: 100%" class="modern-input" /></a-form-item><a-form-item label="Начало"><a-input type="date" v-model:value="jobForm.start_date" class="modern-input" /></a-form-item></div>
                    <a-checkbox v-model:checked="jobForm.is_current">По настоящее время</a-checkbox>
                    <a-form-item v-if="!jobForm.is_current" label="Окончание" style="margin-top: 10px"><a-input type="date" v-model:value="jobForm.end_date" class="modern-input" /></a-form-item>
                    <div class="edit-actions"><a-button type="primary" shape="round" @click="addJob">Сохранить</a-button><a-button shape="round" @click="showJobForm = false" style="margin-left: 10px">Отмена</a-button></div>
                  </a-form>
              </div>
              <div v-if="employmentRecords.length > 0" class="timeline-container">
                <a-timeline mode="left">
                  <a-timeline-item v-for="job in employmentRecords" :key="job.id" :color="job.is_current ? 'green' : 'blue'">
                    <template #dot><div class="timeline-dot"><bank-outlined /></div></template>
                    <div class="timeline-card">
                      <div class="timeline-header"><div class="job-company">{{ job.company_name }}</div><div class="timeline-actions"><edit-outlined class="action-icon" @click="editJob(job)" /><a-popconfirm title="Удалить?" ok-text="Да" cancel-text="Нет" @confirm="deleteJob(job.id)"><delete-outlined class="action-icon danger" /></a-popconfirm></div></div>
                      <div class="job-pos">{{ job.position_title }}</div>
                      <div class="job-meta"><span class="salary-badge" v-if="job.salary_amount">{{ formatMoney(job.salary_amount) }}</span><span class="date-range">{{ formatDate(job.start_date) }} — {{ job.is_current ? 'Н.в.' : formatDate(job.end_date) }}</span></div>
                    </div>
                  </a-timeline-item>
                </a-timeline>
              </div>
              <div v-else class="empty-timeline"><div class="empty-icon-box"><folder-open-outlined /></div><p>Опыт работы еще не добавлен</p></div>
            </div>

            <!-- БЛОК: МОИ РЕЗЮМЕ -->
            <div class="glass-card right-col fade-in card-accent-orange">
               <div class="card-header">
                  <h3><file-text-outlined /> Мои Резюме</h3>
                  <a-upload name="file" :show-upload-list="false" :customRequest="uploadResumeFile" accept=".pdf,.docx,.doc">
                     <button class="btn-add-job"><upload-outlined /></button>
                  </a-upload>
               </div>

               <div v-if="resumes.length === 0" class="empty-timeline">
                  <p>Нет загруженных резюме</p>
               </div>

               <div class="resume-list">
                  <div v-for="res in resumes" :key="res.id" class="resume-item">
                     <div class="res-icon">
                        <file-pdf-outlined v-if="res.type === 'pdf'" style="color: #ff4d4f" />
                        <file-word-outlined v-else style="color: #1890ff" />
                     </div>
                     <div class="res-info">
                        <div class="res-name">{{ res.filename }}</div>
                        <div class="res-date">{{ formatDate(res.created_at) }}</div>
                     </div>
                     <div class="res-actions">
                        <a :href="getFileUrl(res.file_path)" target="_blank" download class="action-icon"><download-outlined /></a>
                        <a-popconfirm title="Удалить?" @confirm="deleteResume(res.id)">
                           <delete-outlined class="action-icon danger" />
                        </a-popconfirm>
                     </div>
                  </div>
               </div>
            </div>

          </div>

        </div>

      </a-spin>
    </div>
  </div>
</template>

<script>
import api from '../axios';
import { message } from 'ant-design-vue';
import {
  UserOutlined, EditOutlined, LinkOutlined, SolutionOutlined, PlusOutlined, DeleteOutlined,
  BankOutlined, CameraOutlined, PhoneOutlined, MailOutlined, EnvironmentOutlined,
  GithubOutlined, LinkedinOutlined, CodeOutlined, CloudServerOutlined, MessageOutlined,
  IdcardOutlined, FlagOutlined, FolderOpenOutlined, FileTextOutlined, UploadOutlined,
  FilePdfOutlined, FileWordOutlined, DownloadOutlined, CompassOutlined, ArrowRightOutlined,
  HistoryOutlined
} from '@ant-design/icons-vue';

const RUSSIAN_CITIES = ['Москва', 'Санкт-Петербург', 'Новосибирск', 'Екатеринбург', 'Казань', 'Нижний Новгород', 'Челябинск', 'Красноярск', 'Самара', 'Уфа', 'Ростов-на-Дону', 'Омск', 'Краснодар', 'Воронеж', 'Пермь', 'Волгоград'].map(city => ({ value: city, label: city }));

export default {
  components: {
    UserOutlined, EditOutlined, LinkOutlined, SolutionOutlined, PlusOutlined, DeleteOutlined,
    BankOutlined, CameraOutlined, PhoneOutlined, MailOutlined, EnvironmentOutlined,
    GithubOutlined, LinkedinOutlined, CodeOutlined, CloudServerOutlined, MessageOutlined,
    IdcardOutlined, FlagOutlined, FolderOpenOutlined, FileTextOutlined, UploadOutlined,
    FilePdfOutlined, FileWordOutlined, DownloadOutlined, CompassOutlined, ArrowRightOutlined,
    HistoryOutlined
  },
  data() {
    return {
      userRole: 'graduate', profile: {}, specialties: [], employmentRecords: [], companies: [], resumes: [],
      form: { portfolio_links: [] },
      jobForm: { company_id: null, position_title: '', salary_amount: null, start_date: '', end_date: '', is_current: true },
      loading: true, isEditing: false, showJobForm: false,
      phoneError: '', cityOptions: RUSSIAN_CITIES,

      // ROADMAP VARS
      roadmapData: [],
      currentRoadmapTitle: 'My Roadmap',
      roadmapHistory: []
    };
  },
  computed: {
    isEmployer() { return this.userRole === 'employer'; },
    completionRate() {
      if (this.isEmployer) return 100;
      let score = 0; let total = 6;
      if (this.profile.first_name) score++;
      if (this.profile.last_name) score++;
      if (this.profile.about_me && this.profile.about_me.length > 10) score++;
      if (this.profile.specialty_id) score++;
      if (this.profile.city) score++;
      if (this.employmentRecords.length > 0) score++;
      return Math.round((score / total) * 100);
    },

    // ВЫЧИСЛЕНИЕ ПРОГРЕССА КАРТЫ
    currentRoadmapProgress() {
        if (!this.roadmapData.length) return 0;
        const nodes = this.roadmapData.filter(el => el.type === 'custom');
        if (nodes.length === 0) return 0;
        const done = nodes.reduce((acc, n) => acc + (n.data.done ? 1 : 0), 0);
        return Math.round((done / nodes.length) * 100);
    },
    nextRoadmapStep() {
        if (!this.roadmapData.length) return '—';
        const next = this.roadmapData.find(el => el.type === 'custom' && !el.data.done);
        return next ? next.data.label : 'Финиш!';
    }
  },
  async mounted() {
    const u = JSON.parse(localStorage.getItem('user') || '{}');
    this.userRole = u.role || 'graduate';
    await this.loadData();
    if (!this.isEmployer) {
        await Promise.all([
            this.loadSpecialties(),
            this.loadEmployment(),
            this.loadCompanies(),
            this.loadResumes(),
            this.loadRoadmapData(),    // <-- Загрузка текущей карты
            this.loadRoadmapHistory()  // <-- Загрузка истории
        ]);
    }
    this.loading = false;
  },
  methods: {
    async loadData() {
      try {
        const url = this.isEmployer ? '/recruiters/me' : '/graduates/me';
        const r = await api.get(url);
        this.profile = r.data;
        if (!this.profile.portfolio_links) this.profile.portfolio_links = [];
      } catch (e) {}
    },

    // === НОВЫЙ МЕТОД ЗАГРУЗКИ ROADMAP ===
    async loadRoadmapData() {
        try {
            const r = await api.get('/chat/roadmap');
            if (r.data) {
                // Поддержка новой структуры { role, nodes }
                if (r.data.nodes) {
                    this.roadmapData = r.data.nodes;
                    this.currentRoadmapTitle = r.data.role || 'My Roadmap';
                }
                // Поддержка старой структуры (массив)
                else if (Array.isArray(r.data)) {
                    this.roadmapData = r.data;
                    this.currentRoadmapTitle = 'My Roadmap';
                }
            }
        } catch(e) {}
    },

    // === ЗАГРУЗКА ИСТОРИИ ===
    async loadRoadmapHistory() {
        try {
            const r = await api.get('/chat/roadmap/history');
            this.roadmapHistory = r.data;
        } catch(e){}
    },

    async loadSpecialties() { try { const r = await api.get('/dict/specialties'); this.specialties = r.data; } catch (e) {} },
    async loadEmployment() { try { const r = await api.get('/employment'); this.employmentRecords = r.data; } catch (e) {} },
    async loadCompanies() { try { const r = await api.get('/dict/companies'); this.companies = r.data; } catch (e) {} },
    async loadResumes() { try { const r = await api.get('/resumes'); this.resumes = r.data; } catch (e) {} },

    async uploadResumeFile({ file }) {
        const formData = new FormData();
        formData.append('file', file);
        try {
            await api.post('/resumes', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            message.success('Загружено');
            await this.loadResumes();
        } catch (e) { message.error('Ошибка загрузки'); }
    },

    async deleteResume(id) {
        try { await api.delete(`/resumes/${id}`); this.resumes = this.resumes.filter(r => r.id !== id); message.success('Удалено'); } catch(e){}
    },
    getFileUrl(path) { return `http://localhost:4000${path}`; },

    enableEdit() { this.form = JSON.parse(JSON.stringify(this.profile)); if(this.form.birth_date) this.form.birth_date = this.form.birth_date.split('T')[0]; if (!this.form.portfolio_links) this.form.portfolio_links = []; this.phoneError = ''; this.isEditing = true; },
    cancelEdit() { this.isEditing = false; },
    validatePhone() { const phone = this.form.phone; if (!phone) { this.phoneError = ''; return; } const regex = /^(\+7|8)[\s\-]?\(?[0-9]{3}\)?[\s\-]?[0-9]{3}[\s\-]?[0-9]{2}[\s\-]?[0-9]{2}$/; if (!regex.test(phone)) this.phoneError = 'Неверный формат'; else this.phoneError = ''; },
    addLink() { this.form.portfolio_links.push({ type: 'github', url: '' }); },
    removeLink(index) { this.form.portfolio_links.splice(index, 1); },
    getIconForType(type) { const icons = { github: 'GithubOutlined', linkedin: 'LinkedinOutlined', telegram: 'MessageOutlined', leetcode: 'CodeOutlined', disk: 'CloudServerOutlined', other: 'LinkOutlined' }; return icons[type] || 'LinkOutlined'; },
    getLabelForType(type) { const labels = { github: 'GitHub', linkedin: 'LinkedIn', telegram: 'Telegram', leetcode: 'LeetCode', disk: 'Яндекс.Диск', other: 'Ссылка' }; return labels[type] || 'Ссылка'; },
    async saveProfile() { if (this.phoneError) return message.error('Исправьте ошибки'); try { const url = this.isEmployer ? '/recruiters/me' : '/graduates/me'; const r = await api.put(url, this.form); this.profile = r.data; if (!this.isEmployer && this.form.specialty_id) { const s = this.specialties.find(i => i.id === this.form.specialty_id); if(s) { this.profile.specialty_code = s.code; this.profile.specialty_name = s.name; } } this.isEditing = false; message.success('Сохранено'); } catch (e) { message.error('Ошибка'); } },
    async handleUpload({ file }) { const formData = new FormData(); formData.append('avatar', file); try { const url = this.isEmployer ? '/recruiters/avatar' : '/graduates/avatar'; const r = await api.post(url, formData, { headers: { 'Content-Type': 'multipart/form-data' } }); this.profile.avatar_url = r.data.avatar_url; message.success('Фото обновлено'); } catch (e) { message.error('Ошибка'); } },
    getAvatarUrl(url) { return url ? `http://localhost:4000${url}` : null; },
    openJobForm() { this.jobForm = { id: null, company_id: null, position_title: '', salary_amount: null, start_date: '', end_date: '', is_current: true }; this.showJobForm = true; },
    editJob(item) { this.jobForm = { ...item, start_date: item.start_date ? item.start_date.split('T')[0] : '', end_date: item.end_date ? item.end_date.split('T')[0] : '' }; this.showJobForm = true; },
    async addJob() { if (!this.jobForm.company_id) return message.warning('Выберите компанию'); try { if (this.jobForm.id) { await api.put(`/employment/${this.jobForm.id}`, this.jobForm); message.success('Обновлено'); } else { await api.post('/employment', this.jobForm); message.success('Добавлено'); } this.showJobForm = false; await this.loadEmployment(); } catch (e) { message.error('Ошибка'); } },
    async deleteJob(id) { try { await api.delete(`/employment/${id}`); await this.loadEmployment(); message.success('Удалено'); } catch (e) {} },
    formatDate(val) { return val ? new Date(val).toLocaleDateString('ru-RU') : ''; },
    formatMoney(val) { return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(val); }
  }
};
</script>

<style scoped>
/* ROADMAP WIDGET STYLES */
.roadmap-widget-content { text-align: center; padding: 10px; }
.roadmap-title { color: #374151; font-weight: 800; margin-bottom: 5px; font-size: 1.1rem; }
.roadmap-date { font-size: 0.8rem; color: #9ca3af; margin-bottom: 15px; }
.circle-wrapper { margin-bottom: 15px; }
.rp-next { margin-top: 10px; font-size: 0.95rem; color: #6b7280; }
.rp-next strong { color: #8b5cf6; display: block; margin-top: 4px; }

/* HISTORY STYLES */
.history-list { display: flex; flex-direction: column; gap: 10px; }
.history-item { display: flex; justify-content: space-between; align-items: center; background: white; padding: 12px 16px; border-radius: 12px; border: 1px solid #e5e7eb; transition: 0.2s; }
.history-item:hover { border-color: #8b5cf6; transform: translateX(5px); }
.h-title { font-weight: 700; color: #374151; font-size: 0.95rem; }
.h-date { font-size: 0.8rem; color: #9ca3af; margin-top: 2px; }
.h-score { font-weight: 800; color: #6366f1; background: #e0e7ff; padding: 4px 10px; border-radius: 8px; font-size: 0.9rem; }
.h-score.done { color: #059669; background: #d1fae5; }

/* Common Styles (unchanged) */
.resume-list { display: flex; flex-direction: column; gap: 10px; margin-top: 15px; }
.resume-item { display: flex; align-items: center; gap: 12px; background: white; padding: 10px; border-radius: 12px; border: 1px solid #e5e7eb; transition: 0.2s; }
.resume-item:hover { border-color: #1890ff; transform: translateX(5px); }
.res-icon { font-size: 1.5rem; }
.res-info { flex: 1; overflow: hidden; }
.res-name { font-weight: 600; color: #374151; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.res-date { font-size: 0.75rem; color: #9ca3af; }
.res-actions { display: flex; gap: 8px; }
.card-accent-orange { border-top: 4px solid #f97316; }
.mb-20 { margin-bottom: 20px; }
.page-wrapper { position: relative; width: 100%; min-height: 90vh; overflow-x: hidden; background: #f3f4f6; display: flex; justify-content: center; padding: 40px 20px; }
.blobs-container { position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 0; }
.blob { position: absolute; border-radius: 50%; filter: blur(60px); opacity: 0.5; animation: float 10s infinite alternate; }
.blob-1 { width: 400px; height: 400px; background: #a855f7; top: -100px; left: -100px; }
.blob-2 { width: 300px; height: 300px; background: #3b82f6; bottom: -50px; right: -50px; animation-delay: 2s; }
.blob-3 { width: 250px; height: 250px; background: #ec4899; top: 30%; left: 40%; opacity: 0.3; animation-duration: 15s; }
@keyframes float { from { transform: translate(0,0); } to { transform: translate(30px, 50px); } }
.content-container { position: relative; z-index: 1; width: 100%; max-width: 1100px; display: flex; flex-direction: column; gap: 30px; }
.glass-card { background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(25px); border: 1px solid rgba(255, 255, 255, 0.9); border-radius: 24px; box-shadow: 0 15px 40px rgba(0,0,0,0.06); padding: 35px; position: relative; overflow: hidden; }
.card-accent-purple { border-top: 4px solid #a855f7; }
.card-accent-blue { border-top: 4px solid #3b82f6; }
.bg-icon { position: absolute; bottom: -20px; right: -20px; font-size: 180px; color: #000; opacity: 0.03; transform: rotate(-15deg); pointer-events: none; }
.main-card { text-align: center; padding-bottom: 45px; }
.avatar-column { display: flex; flex-direction: column; align-items: center; }
.avatar-stack { position: relative; width: 170px; height: 170px; margin-bottom: 20px; }
.progress-ring { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
.avatar-img-box { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 135px; height: 135px; border-radius: 50%; background: white; display: flex; justify-content: center; align-items: center; box-shadow: 0 0 15px rgba(0,0,0,0.05); }
.main-avatar { background-color: #f3f4f6; border: 4px solid #fff; display: flex; justify-content: center; align-items: center; }
.default-icon { font-size: 60px; color: #cbd5e1; }
.avatar-upload-pos { position: absolute; bottom: 5px; right: 5px; z-index: 10; }
.btn-mini-edit { width: 36px; height: 36px; border-radius: 50%; background: #1890ff; color: white; border: 3px solid white; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; border: none; font-size: 1.1rem; box-shadow: 0 4px 10px rgba(0,0,0,0.15); }
.btn-mini-edit:hover { transform: scale(1.1); background: #40a9ff; }
.full-name { font-size: 2.4rem; font-weight: 800; color: #111827; margin: 0 0 10px; line-height: 1.2; }
.specialty-badge { background: #e0f2fe; color: #0284c7; padding: 6px 18px; border-radius: 30px; display: inline-flex; align-items: center; gap: 8px; font-weight: 700; font-size: 1rem; }
.specialty-badge.empty { background: #f3f4f6; color: #9ca3af; }
.top-actions { position: absolute; top: 25px; right: 25px; z-index: 5; }
.btn-glass-edit { background: rgba(255,255,255,0.6); border: 1px solid #e5e7eb; padding: 10px 20px; border-radius: 14px; cursor: pointer; font-weight: 600; color: #4b5563; transition: 0.2s; display: flex; align-items: center; gap: 8px; font-size: 0.95rem; }
.btn-glass-edit:hover { background: white; color: #1890ff; border-color: #1890ff; box-shadow: 0 4px 15px rgba(24, 144, 255, 0.15); }
.grid-layout { display: grid; grid-template-columns: 1fr 1.3fr; gap: 40px; width: 100%; align-items: start; margin-top: 10px; }
@media (max-width: 900px) { .grid-layout { grid-template-columns: 1fr; } }
.single-col { grid-template-columns: 1fr !important; max-width: 700px; margin: 20px auto; }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; border-bottom: 1px solid rgba(0,0,0,0.06); padding-bottom: 15px; }
.card-header h3 { margin: 0; color: #1f2937; font-weight: 800; display: flex; align-items: center; gap: 12px; font-size: 1.3rem; }
.info-group { display: flex; flex-direction: column; gap: 15px; }
.info-row { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed #e5e7eb; padding-bottom: 8px; }
.label { color: #6b7280; font-size: 1rem; font-weight: 500; }
.value { font-weight: 700; color: #111827; text-align: right; font-size: 1.05rem; }
.value.phone { color: #2563eb; }
.divider { height: 1px; background: #e5e7eb; margin: 25px 0; }
.about-section h4, .links-section h4 { font-size: 1.1rem; font-weight: 700; color: #374151; margin-bottom: 10px; }
.about-text { color: #4b5563; line-height: 1.7; white-space: pre-line; font-size: 1rem; }
.links-grid { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 12px; }
.modern-link-tag { background: white; border: 1px solid #e5e7eb; padding: 8px 16px; border-radius: 14px; color: #4b5563; font-weight: 600; text-decoration: none; display: flex; align-items: center; gap: 8px; transition: 0.2s; font-size: 0.95rem; box-shadow: 0 2px 5px rgba(0,0,0,0.02); }
.modern-link-tag:hover { border-color: #1890ff; color: #1890ff; transform: translateY(-2px); }
.form-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.modern-input, .modern-select { border-radius: 10px; font-size: 1rem; padding: 6px 11px; }
.link-edit-row { display: flex; gap: 10px; margin-bottom: 12px; }
.btn-icon-delete { background: #fee2e2; border: none; color: #ef4444; width: 38px; height: 38px; border-radius: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
.btn-icon-delete:hover { background: #fecaca; }
.btn-add-link { background: #eff6ff; color: #2563eb; border: 1px dashed #2563eb; width: 100%; padding: 10px; border-radius: 10px; cursor: pointer; font-weight: 700; margin-top: 8px; font-size: 0.95rem; }
.btn-add-link:hover { background: #dbeafe; }
.timeline-container { padding: 10px 0; }
.timeline-dot { width: 36px; height: 36px; background: white; border: 3px solid #1890ff; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #1890ff; font-size: 1rem; box-shadow: 0 0 0 4px rgba(24, 144, 255, 0.1); }
.timeline-card { background: white; border-radius: 16px; padding: 16px 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.04); border: 1px solid #f3f4f6; position: relative; top: -5px; margin-bottom: 10px; }
.timeline-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.job-company { font-weight: 800; color: #111827; font-size: 1.1rem; }
.job-pos { color: #2563eb; font-weight: 700; font-size: 1.05rem; margin-bottom: 8px; }
.job-meta { display: flex; justify-content: space-between; align-items: center; font-size: 0.9rem; color: #6b7280; }
.salary-badge { background: #ecfccb; color: #3f6212; border: 1px solid #d9f99d; padding: 2px 10px; border-radius: 6px; font-weight: 700; }
.action-icon { cursor: pointer; color: #9ca3af; transition: 0.2s; margin-left: 10px; font-size: 1.1rem; }
.action-icon:hover { color: #1890ff; }
.action-icon.danger:hover { color: #ef4444; }
.btn-add-job { background: #1890ff; color: white; border: none; width: 36px; height: 36px; border-radius: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; font-size: 1.1rem; box-shadow: 0 4px 10px rgba(24, 144, 255, 0.3); }
.btn-add-job:hover { transform: scale(1.1); }
.job-form-wrapper { background: #f9fafb; padding: 20px; border-radius: 16px; margin-bottom: 25px; border: 1px solid #e5e7eb; }
.form-title { font-weight: 800; margin-bottom: 15px; color: #1f2937; font-size: 1.1rem; }
.empty-timeline { text-align: center; padding: 30px; color: #9ca3af; }
.empty-icon-box { font-size: 3rem; color: #e5e7eb; margin-bottom: 10px; }
.btn-icon-link { color: #8b5cf6; font-size: 1.2rem; transition: 0.2s; display: flex; align-items: center; }
.btn-icon-link:hover { color: #6d28d9; transform: translateX(3px); }
.fade-in { animation: fadeIn 0.7s cubic-bezier(0.2, 0.8, 0.2, 1); }
@keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
</style>