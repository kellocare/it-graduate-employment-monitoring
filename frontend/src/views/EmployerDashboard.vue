<template>
  <div class="employer-page">
    <div class="header">
      <h1>🏢 Кабинет работодателя</h1>
    </div>

    <a-card class="main-card">
      <a-tabs v-model:activeKey="activeTab">

        <!-- Профиль Компании -->
        <a-tab-pane key="profile" tab="Профиль компании">
          <div class="tab-content">
            <a-alert v-if="!company.id" message="Внимание" description="Заполните профиль, чтобы создавать вакансии." type="warning" show-icon class="mb-20" />
            <a-form layout="vertical" @submit.prevent="saveCompany">
              <a-row :gutter="16">
                <a-col :span="12"><a-form-item label="Название"><a-input v-model:value="company.name" /></a-form-item></a-col>
                <a-col :span="12"><a-form-item label="ИНН"><a-input v-model:value="company.inn" /></a-form-item></a-col>
              </a-row>
              <a-row :gutter="16">
                <a-col :span="12"><a-form-item label="Город"><a-input v-model:value="company.city" /></a-form-item></a-col>
                <a-col :span="12"><a-form-item label="Сайт"><a-input v-model:value="company.website" /></a-form-item></a-col>
              </a-row>
              <a-form-item label="Описание"><a-textarea v-model:value="company.description" :rows="4" /></a-form-item>
              <a-button type="primary" html-type="submit" :loading="loading"><save-outlined /> Сохранить профиль</a-button>
            </a-form>
          </div>
        </a-tab-pane>

        <!-- Мои Вакансии -->
        <a-tab-pane key="vacancies" tab="Мои вакансии" :disabled="!company.id">
          <div class="tab-content">
            <div class="flex-between mb-20">
              <h3>Активные вакансии</h3>
              <a-button type="primary" @click="$router.push('/vacancies')"><plus-outlined /> Создать новую</a-button>
            </div>
            <a-table :dataSource="vacancies" :columns="columns" rowKey="id">
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'action'">
                  <!-- Кнопка Редактировать -->
                  <a-button type="primary" ghost size="small" @click="editVacancy(record)" style="margin-right: 10px">
                    <edit-outlined />
                  </a-button>
                  <a-popconfirm title="Удалить?" @confirm="deleteVacancy(record.id)">
                    <a-button danger size="small"><delete-outlined /></a-button>
                  </a-popconfirm>
                </template>
                <template v-if="column.key === 'salary'">{{ record.salary_min ? `от ${record.salary_min} ₽` : 'По догов.' }}</template>
                <template v-if="column.key === 'date'">{{ new Date(record.created_at).toLocaleDateString() }}</template>
              </template>
            </a-table>
          </div>
        </a-tab-pane>

        <!-- Поиск Кандидатов (Оставляем без изменений) -->
        <a-tab-pane key="candidates" tab="Поиск кандидатов" :disabled="!company.id">
          <div class="tab-content">
             <!-- ... код списка кандидатов ... (он был верный в прошлом шаге, дублировать длинный кусок не буду, если нужен - скажи) -->
             <!-- Вставь сюда код из прошлого сообщения -->
             <!-- Кратко: grid с карточками студентов -->
             <div class="candidates-grid">
                <a-card v-for="student in candidates" :key="student.id" class="candidate-card" hoverable>
                  <a-card-meta :title="`${student.first_name} ${student.last_name}`">
                    <template #avatar><a-avatar :src="getAvatarUrl(student.avatar_url)" :size="48"><template #icon><user-outlined /></template></a-avatar></template>
                    <template #description><div class="spec-text">{{ student.specialty || 'Специальность не указана' }}</div></template>
                  </a-card-meta>
                  <p class="bio">{{ student.about_me ? student.about_me.substring(0, 80) + '...' : 'Нет описания' }}</p>

                  <div v-if="student.aiResult" class="ai-box">
                    <div class="ai-score">Соответствие: <span :class="getScoreClass(student.aiResult.score)">{{ student.aiResult.score }}%</span></div>
                    <p class="ai-reason">{{ student.aiResult.reason }}</p>
                  </div>

                  <div v-if="student.invite_status === 'declined'" class="declined-badge"><close-circle-outlined /> Отказался</div>
                  <div v-else-if="student.invite_status === 'accepted'" class="accepted-badge"><check-circle-outlined /> Принял</div>
                  <div v-else-if="student.invite_status === 'pending'" class="pending-badge"><clock-circle-outlined /> Отправлено</div>

                  <template #actions>
                     <a-tooltip title="Спросить ИИ"><a-button type="dashed" size="small" @click="analyzeCandidate(student)" :loading="student.aiLoading">🤖 AI Анализ</a-button></a-tooltip>
                     <a-tooltip title="Пригласить"><a-button type="primary" size="small" @click="openInvite(student)" :disabled="!!student.invite_status">📩 Пригласить</a-button></a-tooltip>
                  </template>
                </a-card>
             </div>
          </div>
        </a-tab-pane>

        <!-- Входящие отклики (Оставляем без изменений) -->
        <a-tab-pane key="applications" tab="Входящие отклики" :disabled="!company.id">
          <div class="tab-content">
             <!-- ... код списка откликов ... -->
             <a-list item-layout="vertical" :data-source="applications">
                <template #renderItem="{ item }">
                  <a-list-item class="app-item">
                    <template #extra>
                       <div class="app-score"><div class="score-circle">{{ item.ai_score }}</div><div class="score-label">Балл ИИ</div></div>
                    </template>
                    <a-list-item-meta :description="`Вакансия: ${item.vacancy_title}`">
                      <template #title><span class="app-name">{{ item.first_name }} {{ item.last_name }}</span></template>
                      <template #avatar><a-avatar :src="getAvatarUrl(item.avatar_url)" :size="50"><template #icon><user-outlined /></template></a-avatar></template>
                    </a-list-item-meta>
                    <div class="cover-letter" v-if="item.cover_letter"><b>Письмо:</b><p>{{ item.cover_letter }}</p></div>
                    <div class="app-actions">
                       <a-button type="default" @click="showStudentProfile(item)"><eye-outlined /> Профиль</a-button>
                       <a-button type="primary" @click="openInviteFromApp(item)"><message-outlined /> Написать</a-button>
                       <a-popconfirm title="Отклонить?" @confirm="rejectApp(item.id)"><a-button danger><close-outlined /> Отклонить</a-button></a-popconfirm>
                    </div>
                  </a-list-item>
                </template>
                <template #emptyText><a-empty description="Пока нет откликов" /></template>
             </a-list>
          </div>
        </a-tab-pane>

      </a-tabs>
    </a-card>

    <!-- МОДАЛКА ПРОФИЛЯ СТУДЕНТА (ИСПРАВЛЕННАЯ ШИРИНА) -->
    <a-modal
      v-model:open="profileModalVisible"
      :title="selectedStudent ? `Профиль: ${selectedStudent.first_name}` : ''"
      :footer="null"
      width="700px"
    >
      <div v-if="selectedStudent" class="student-modal-content">
        <div class="modal-header">
           <a-avatar :size="80" :src="getAvatarUrl(selectedStudent.avatar_url)"><template #icon><user-outlined /></template></a-avatar>
           <div class="modal-titles">
             <h3>{{ selectedStudent.first_name }} {{ selectedStudent.last_name }}</h3>
             <p class="spec">{{ selectedStudent.specialty_name || 'Специальность не указана' }}</p>
           </div>
        </div>
        <a-descriptions bordered :column="1" class="mt-20">
           <a-descriptions-item label="Email">{{ selectedStudent.student_email }}</a-descriptions-item>
           <a-descriptions-item label="Телефон">{{ selectedStudent.phone || '—' }}</a-descriptions-item>
           <a-descriptions-item label="Город">{{ selectedStudent.city || '—' }}</a-descriptions-item>
        </a-descriptions>
        <div class="about-block mt-20">
           <h4>О себе / Навыки</h4>
           <p style="white-space: pre-line;">{{ selectedStudent.about_me || 'Нет информации' }}</p>
        </div>
        <div class="portfolio-block mt-20" v-if="selectedStudent.portfolio_links && selectedStudent.portfolio_links.length">
           <h4>Портфолио</h4>
           <div class="links-list">
             <div v-for="(link, i) in selectedStudent.portfolio_links" :key="i" class="link-item">
                <a :href="link.url" target="_blank"><link-outlined /> {{ link.type }}</a>
             </div>
           </div>
        </div>
      </div>
    </a-modal>

    <!-- МОДАЛКА РЕДАКТИРОВАНИЯ ВАКАНСИИ (НОВАЯ) -->
    <a-modal v-model:open="editVacancyVisible" title="Редактирование вакансии" @ok="saveVacancyEdit">
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
  EyeOutlined, MessageOutlined, CloseOutlined, LinkOutlined
} from '@ant-design/icons-vue';

export default {
  components: {
    SaveOutlined, PlusOutlined, DeleteOutlined, UserOutlined, EditOutlined,
    CloseCircleOutlined, CheckCircleOutlined, ClockCircleOutlined,
    EyeOutlined, MessageOutlined, CloseOutlined, LinkOutlined
  },
  data() {
    return {
      activeTab: 'profile',
      loading: false,
      company: { name: '', city: '', description: '', website: '', inn: '' },
      vacancies: [],
      candidates: [],
      applications: [],
      columns: [
        { title: 'Должность', dataIndex: 'title', key: 'title' },
        { title: 'Зарплата', key: 'salary' },
        { title: 'Дата создания', key: 'date' },
        { title: 'Действия', key: 'action' },
      ],
      profileModalVisible: false,
      selectedStudent: null,
      editVacancyVisible: false,
      editForm: {}
    };
  },
  async mounted() {
    await this.loadCompany();
    if (this.company.id) {
      await this.loadMyVacancies();
      await this.loadCandidates();
      await this.loadApplications();
    }
  },
  methods: {
    async loadCompany() {
        try {
            const r = await api.get('/employer/company');
            // Защита от null
            if(r.data && r.data.id) this.company = r.data;
            else this.company = { name: '', city: '', description: '', website: '', inn: '' };
        } catch(e){}
    },
    async loadMyVacancies() { try { const r = await api.get('/vacancies/my'); this.vacancies = r.data; } catch(e){} },
    async loadCandidates() { try { const r = await api.get('/candidates'); this.candidates = r.data.map(c => ({...c, aiLoading: false, aiResult: null})); } catch(e){} },
    async loadApplications() { try { const r = await api.get('/applications/employer'); this.applications = r.data; } catch(e){} },

    async saveCompany() {
      this.loading = true;
      try {
        const r = await api.post('/employer/company', this.company);
        this.company = r.data;
        message.success('Сохранено');
        if (this.activeTab === 'profile') this.activeTab = 'vacancies';
      } catch (e) { message.error('Ошибка'); } finally { this.loading = false; }
    },
    async deleteVacancy(id) { try { await api.delete(`/vacancies/${id}`); await this.loadMyVacancies(); message.success('Удалено'); } catch(e){} },

    // РЕДАКТИРОВАНИЕ ВАКАНСИИ
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
    getScoreClass(score) { if (score>=80) return 'score-high'; if (score>=50) return 'score-mid'; return 'score-low'; }
  }
};
</script>

<style scoped>
/* Все стили из предыдущих шагов, включая бейджи, сетку и т.д. */
.employer-page { max-width: 1000px; margin: 30px auto; padding: 0 20px; }
.header h1 { color: #2c3e50; margin-bottom: 20px; }
.main-card { border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
.tab-content { padding: 10px 0; }
.mb-20 { margin-bottom: 20px; }
.flex-between { display: flex; justify-content: space-between; align-items: center; }
.candidates-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; margin-top: 20px; }
.candidate-card { border-radius: 10px; border: 1px solid #eee; }
.spec-text { font-size: 0.85em; color: #888; margin-top: 2px; }
.bio { font-size: 0.9em; color: #555; margin: 15px 0; height: 40px; overflow: hidden; }
.ai-box { background: #f6ffed; border: 1px solid #b7eb8f; padding: 8px; border-radius: 6px; margin-bottom: 15px; font-size: 0.85em; }
.ai-score { font-weight: bold; margin-bottom: 4px; }
.score-high { color: #52c41a; }
.score-mid { color: #fa8c16; }
.score-low { color: #ff4d4f; }
.ai-reason { margin: 0; color: #333; }
.hint-text { color: #666; font-style: italic; }
.declined-badge { color: #ff4d4f; font-weight: bold; background: #fff1f0; padding: 8px; border-radius: 4px; margin-bottom: 15px; font-size: 0.85em; text-align: center; border: 1px solid #ffa39e; }
.accepted-badge { color: #52c41a; font-weight: bold; background: #f6ffed; padding: 8px; border-radius: 4px; margin-bottom: 15px; font-size: 0.85em; text-align: center; border: 1px solid #b7eb8f; }
.pending-badge { color: #1890ff; font-weight: bold; background: #e6f7ff; padding: 8px; border-radius: 4px; margin-bottom: 15px; font-size: 0.85em; text-align: center; border: 1px solid #91d5ff; }
.app-item { background: #fff; border: 1px solid #f0f0f0; border-radius: 8px; padding: 20px; margin-bottom: 15px; }
.app-name { font-size: 1.1em; font-weight: bold; }
.app-score { text-align: center; }
.score-circle { width: 40px; height: 40px; background: #52c41a; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; margin: 0 auto; }
.score-label { font-size: 0.7em; color: #888; margin-top: 5px; }
.cover-letter { background: #fafafa; padding: 10px; border-radius: 6px; margin: 15px 0; border-left: 3px solid #1890ff; }
.cover-letter b { font-size: 0.9em; color: #555; }
.cover-letter p { margin: 5px 0 0; color: #333; }
.app-actions { margin-top: 15px; display: flex; gap: 10px; }
.modal-header { display: flex; gap: 20px; align-items: center; margin-bottom: 20px; }
.modal-titles h3 { margin: 0; }
.spec { color: #777; }
.mt-20 { margin-top: 20px; }
.about-block h4, .portfolio-block h4 { margin-bottom: 5px; color: #555; }
.links-list { display: flex; flex-wrap: wrap; gap: 15px; }
.link-item a { background: #f0f5ff; padding: 5px 10px; border-radius: 4px; color: #1890ff; text-decoration: none; }
.link-item a:hover { background: #d6e4ff; }
</style>