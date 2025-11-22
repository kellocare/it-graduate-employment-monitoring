<template>
  <div class="profile-page">
    <a-spin :spinning="loading">

      <!-- Карточка Профиля -->
      <a-card class="profile-card" :bordered="false">
        <div class="profile-header-grid">

          <!-- ЛЕВАЯ КОЛОНКА -->
          <div class="avatar-section">
            <div class="avatar-wrapper">
              <a-avatar :size="120" :src="getAvatarUrl(profile.avatar_url)">
                <template #icon><user-outlined /></template>
              </a-avatar>
              <a-upload
                v-if="isEditing"
                name="avatar"
                :show-upload-list="false"
                :customRequest="handleUpload"
                class="upload-btn"
              >
                <a-button size="small" type="dashed"><camera-outlined /> Изменить</a-button>
              </a-upload>
            </div>

            <h2 class="name-title">{{ profile.last_name }} {{ profile.first_name }}</h2>
            <p class="spec-subtitle">{{ profile.specialty_name || 'Специальность не выбрана' }}</p>
          </div>

          <!-- ПРАВАЯ КОЛОНКА -->
          <div class="info-section">
            <div class="section-header">
              <h3>Личная информация</h3>
              <a-button v-if="!isEditing" type="primary" ghost @click="enableEdit"><edit-outlined /> Редактировать</a-button>
            </div>

            <!-- РЕЖИМ ПРОСМОТРА -->
            <div v-if="!isEditing">
               <a-descriptions bordered :column="2">
                  <a-descriptions-item label="Дата рождения">{{ formatDate(profile.birth_date) || '—' }}</a-descriptions-item>
                  <a-descriptions-item label="Город">{{ profile.city || '—' }}</a-descriptions-item>
                  <a-descriptions-item label="Телефон">{{ profile.phone || '—' }}</a-descriptions-item>
                  <a-descriptions-item label="Telegram">
                     <a v-if="profile.telegram" :href="'https://t.me/' + profile.telegram.replace('@', '')" target="_blank">{{ profile.telegram }}</a>
                     <span v-else>—</span>
                  </a-descriptions-item>
                  <a-descriptions-item label="Год выпуска">{{ profile.graduation_year }}</a-descriptions-item>
               </a-descriptions>

               <div class="about-block mt-20">
                 <h4>О себе</h4>
                 <p style="white-space: pre-line;">{{ profile.about_me || 'Информация не заполнена.' }}</p>
               </div>

               <div class="portfolio-block mt-20" v-if="profile.portfolio_links && profile.portfolio_links.length">
                 <h4>Портфолио и соцсети</h4>
                 <div class="links-list">
                   <a v-for="(link, idx) in profile.portfolio_links" :key="idx" :href="link.url" target="_blank" class="link-tag">
                     <component :is="getIconForType(link.type)" /> {{ getLabelForType(link.type) }}
                   </a>
                 </div>
               </div>
            </div>

            <!-- РЕЖИМ РЕДАКТИРОВАНИЯ -->
            <a-form v-else layout="vertical" class="edit-form">
               <a-row :gutter="16">
                 <a-col :span="8"><a-form-item label="Фамилия"><a-input v-model:value="form.last_name" /></a-form-item></a-col>
                 <a-col :span="8"><a-form-item label="Имя"><a-input v-model:value="form.first_name" /></a-form-item></a-col>
                 <a-col :span="8"><a-form-item label="Отчество"><a-input v-model:value="form.middle_name" /></a-form-item></a-col>
               </a-row>

               <a-row :gutter="16">
                 <a-col :span="12">
                    <a-form-item label="Дата рождения">
                        <a-input type="date" v-model:value="form.birth_date" style="width: 100%" />
                    </a-form-item>
                 </a-col>
                 <a-col :span="12">
                   <a-form-item label="Город">
                     <a-select v-model:value="form.city" show-search :options="cityOptions" placeholder="Выберите город" />
                   </a-form-item>
                 </a-col>
               </a-row>

               <a-row :gutter="16">
                 <a-col :span="12">
                   <a-form-item label="Телефон" :validate-status="phoneError ? 'error' : ''" :help="phoneError || ''">
                     <a-input v-model:value="form.phone" @change="validatePhone" placeholder="+7..." />
                   </a-form-item>
                 </a-col>
                 <a-col :span="12"><a-form-item label="Telegram"><a-input v-model:value="form.telegram" prefix="@" /></a-form-item></a-col>
               </a-row>

               <a-form-item label="Специальность">
                 <a-select v-model:value="form.specialty_id">
                    <a-select-option v-for="s in specialties" :key="s.id" :value="s.id">{{ s.code }} - {{ s.name }}</a-select-option>
                 </a-select>
               </a-form-item>

               <a-row :gutter="16">
                 <a-col :span="8"><a-form-item label="Год выпуска"><a-input-number v-model:value="form.graduation_year" style="width: 100%" /></a-form-item></a-col>
               </a-row>

               <!-- ССЫЛКИ -->
               <div class="links-edit-section">
                 <h4>Ссылки</h4>
                 <div v-for="(link, index) in form.portfolio_links" :key="index" class="link-row">
                   <a-select v-model:value="link.type" style="width: 140px">
                     <a-select-option value="github">GitHub</a-select-option>
                     <a-select-option value="linkedin">LinkedIn</a-select-option>
                     <a-select-option value="telegram">Telegram</a-select-option>
                     <a-select-option value="leetcode">LeetCode</a-select-option>
                     <a-select-option value="disk">Яндекс.Диск</a-select-option>
                     <a-select-option value="other">Другое</a-select-option>
                   </a-select>
                   <a-input v-model:value="link.url" placeholder="URL" />
                   <a-button danger shape="circle" @click="removeLink(index)"><delete-outlined /></a-button>
                 </div>
                 <a-button type="dashed" block @click="addLink" style="margin-top: 10px"><plus-outlined /> Добавить ссылку</a-button>
               </div>

               <a-form-item label="О себе" style="margin-top: 20px">
                 <a-textarea v-model:value="form.about_me" :rows="4" />
               </a-form-item>

               <div class="actions">
                 <a-button type="primary" @click="saveProfile" :disabled="!!phoneError">Сохранить изменения</a-button>
                 <a-button style="margin-left: 10px" @click="cancelEdit">Отмена</a-button>
               </div>
            </a-form>
          </div>
        </div>
      </a-card>

      <!-- КАРТОЧКА ОПЫТА РАБОТЫ -->
      <a-card class="profile-card mt-20" :bordered="false">
        <template #title><span><solution-outlined /> Опыт работы</span></template>
        <template #extra>
          <a-button v-if="!showJobForm" type="primary" ghost size="small" @click="openJobForm()">
            <plus-outlined /> Добавить
          </a-button>
        </template>

        <div v-if="showJobForm" class="job-form-box">
             <h3>{{ jobForm.id ? 'Редактирование записи' : 'Новое место работы' }}</h3>
             <a-form layout="vertical">
                <a-form-item label="Компания">
                  <a-select v-model:value="jobForm.company_id" placeholder="Выберите компанию">
                    <a-select-option v-for="c in companies" :key="c.id" :value="c.id">{{ c.name }}</a-select-option>
                  </a-select>
                </a-form-item>
                 <a-form-item label="Должность"><a-input v-model:value="jobForm.position_title" /></a-form-item>
                 <a-row :gutter="16">
                    <a-col :span="12"><a-form-item label="Зарплата"><a-input-number v-model:value="jobForm.salary_amount" style="width: 100%" /></a-form-item></a-col>
                    <a-col :span="12">
                        <a-form-item label="Начало">
                            <!-- Используем обычный input date, так как он проще биндится к строкам YYYY-MM-DD -->
                            <a-input type="date" v-model:value="jobForm.start_date" style="width: 100%" />
                        </a-form-item>
                    </a-col>
                 </a-row>

                 <a-form-item>
                    <a-checkbox v-model:checked="jobForm.is_current">По настоящее время</a-checkbox>
                 </a-form-item>

                 <a-form-item v-if="!jobForm.is_current" label="Окончание">
                    <a-input type="date" v-model:value="jobForm.end_date" style="width: 100%" />
                 </a-form-item>

                <a-button type="primary" @click="addJob">Сохранить</a-button>
                <a-button style="margin-left: 10px" @click="showJobForm = false">Отмена</a-button>
             </a-form>
        </div>

        <a-list item-layout="horizontal" :data-source="employmentRecords">
          <template #renderItem="{ item }">
            <a-list-item>
              <template #actions>
                <!-- Кнопка Редактировать -->
                <a-button type="link" @click="editJob(item)"><edit-outlined /></a-button>

                <a-popconfirm title="Удалить запись?" ok-text="Да" cancel-text="Нет" @confirm="deleteJob(item.id)">
                  <a-button type="text" danger><delete-outlined /></a-button>
                </a-popconfirm>
              </template>
              <a-list-item-meta>
                <template #title>
                  <span class="job-title">{{ item.position_title }}</span>
                  <a-tag color="green" v-if="item.salary_amount" style="margin-left: 10px">{{ item.salary_amount }} ₽</a-tag>
                </template>
                <template #description>
                  <div><bank-outlined /> {{ item.company_name }}</div>
                  <div class="job-dates">{{ formatDate(item.start_date) }} — {{ item.is_current ? 'Н.в.' : formatDate(item.end_date) }}</div>
                </template>
              </a-list-item-meta>
            </a-list-item>
          </template>
          <template #emptyText><a-empty description="Нет записей" /></template>
        </a-list>
      </a-card>
    </a-spin>
  </div>
</template>

<script>
import api from '../axios';
import { message } from 'ant-design-vue';
import {
  UserOutlined, EditOutlined, LinkOutlined, SolutionOutlined, PlusOutlined, DeleteOutlined,
  BankOutlined, CameraOutlined, PhoneOutlined, MailOutlined, EnvironmentOutlined,
  GithubOutlined, LinkedinOutlined, CodeOutlined, CloudServerOutlined, MessageOutlined
} from '@ant-design/icons-vue';

const RUSSIAN_CITIES = ['Москва', 'Санкт-Петербург', 'Новосибирск', 'Екатеринбург', 'Казань', 'Нижний Новгород', 'Челябинск', 'Красноярск', 'Самара', 'Уфа', 'Ростов-на-Дону', 'Омск', 'Краснодар', 'Воронеж', 'Пермь', 'Волгоград'].map(city => ({ value: city, label: city }));

export default {
  components: {
    UserOutlined, EditOutlined, LinkOutlined, SolutionOutlined, PlusOutlined, DeleteOutlined,
    BankOutlined, CameraOutlined, PhoneOutlined, MailOutlined, EnvironmentOutlined,
    GithubOutlined, LinkedinOutlined, CodeOutlined, CloudServerOutlined, MessageOutlined
  },
  data() {
    return {
      profile: {}, specialties: [], employmentRecords: [], companies: [],
      form: { portfolio_links: [] },
      jobForm: { company_id: null, position_title: '', salary_amount: null, start_date: '', end_date: '', is_current: true },
      loading: true, isEditing: false, showJobForm: false,
      phoneError: '', cityOptions: RUSSIAN_CITIES
    };
  },
  async mounted() {
    await Promise.all([ this.loadData(), this.loadSpecialties(), this.loadEmployment(), this.loadCompanies() ]);
    this.loading = false;
  },
  methods: {
    async loadData() { try { const r = await api.get('/graduates/me'); this.profile = r.data; if (!this.profile.portfolio_links) this.profile.portfolio_links = []; } catch (e) {} },
    async loadSpecialties() { try { const r = await api.get('/dict/specialties'); this.specialties = r.data; } catch (e) {} },
    async loadEmployment() { try { const r = await api.get('/employment'); this.employmentRecords = r.data; } catch (e) {} },
    async loadCompanies() { try { const r = await api.get('/dict/companies'); this.companies = r.data; } catch (e) {} },

    enableEdit() {
      this.form = JSON.parse(JSON.stringify(this.profile));
      if(this.form.birth_date) this.form.birth_date = this.form.birth_date.split('T')[0];
      if (!this.form.portfolio_links) this.form.portfolio_links = [];
      this.phoneError = '';
      this.isEditing = true;
    },
    cancelEdit() { this.isEditing = false; },

    validatePhone() {
      const phone = this.form.phone;
      if (!phone) { this.phoneError = ''; return; }
      const regex = /^(\+7|8)[\s\-]?\(?[0-9]{3}\)?[\s\-]?[0-9]{3}[\s\-]?[0-9]{2}[\s\-]?[0-9]{2}$/;
      if (!regex.test(phone)) this.phoneError = 'Неверный формат'; else this.phoneError = '';
    },

    addLink() { this.form.portfolio_links.push({ type: 'github', url: '' }); },
    removeLink(index) { this.form.portfolio_links.splice(index, 1); },
    getIconForType(type) {
      const icons = { github: 'GithubOutlined', linkedin: 'LinkedinOutlined', telegram: 'MessageOutlined', leetcode: 'CodeOutlined', disk: 'CloudServerOutlined', other: 'LinkOutlined' };
      return icons[type] || 'LinkOutlined';
    },
    getLabelForType(type) {
      const labels = { github: 'GitHub', linkedin: 'LinkedIn', telegram: 'Telegram', leetcode: 'LeetCode', disk: 'Яндекс.Диск', other: 'Ссылка' };
      return labels[type] || 'Ссылка';
    },

    async saveProfile() {
      if (this.phoneError) return message.error('Исправьте ошибки');
      try {
        const r = await api.put('/graduates/me', this.form);
        this.profile = r.data;
        const s = this.specialties.find(i => i.id === this.form.specialty_id);
        if (s) { this.profile.specialty_code = s.code; this.profile.specialty_name = s.name; }
        this.isEditing = false;
        message.success('Сохранено');
      } catch (e) { message.error('Ошибка'); }
    },

    async handleUpload({ file }) {
      const formData = new FormData();
      formData.append('avatar', file);
      try { const r = await api.post('/graduates/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } }); this.profile.avatar_url = r.data.avatar_url; message.success('Фото обновлено'); } catch (e) { message.error('Ошибка'); }
    },
    getAvatarUrl(url) { return url ? `http://localhost:4000${url}` : null; },

    // --- УПРАВЛЕНИЕ ОПЫТОМ РАБОТЫ ---

    openJobForm() {
        // Сброс формы для создания
        this.jobForm = {
            id: null,
            company_id: null,
            position_title: '',
            salary_amount: null,
            start_date: '',
            end_date: '',
            is_current: true
        };
        this.showJobForm = true;
        setTimeout(() => {
            document.querySelector('.job-form-box')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    },

    editJob(item) {
        // Заполнение формы для редактирования
        this.jobForm = {
            ...item,
            // Обрезаем время от даты для input type="date"
            start_date: item.start_date ? item.start_date.split('T')[0] : '',
            end_date: item.end_date ? item.end_date.split('T')[0] : ''
        };
        this.showJobForm = true;
        setTimeout(() => {
            document.querySelector('.job-form-box')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    },

    async addJob() {
      if (!this.jobForm.company_id) return message.warning('Выберите компанию');
      try {
        // Проверяем наличие ID для выбора метода
        if (this.jobForm.id) {
            await api.put(`/employment/${this.jobForm.id}`, this.jobForm);
            message.success('Запись обновлена');
        } else {
            await api.post('/employment', this.jobForm);
            message.success('Добавлено');
        }
        this.showJobForm = false;
        await this.loadEmployment();
      } catch (e) {
          console.error(e);
          message.error('Ошибка при сохранении');
      }
    },

    async deleteJob(id) { try { await api.delete(`/employment/${id}`); await this.loadEmployment(); message.success('Удалено'); } catch (e) {} },

    formatDate(val) { return val ? new Date(val).toLocaleDateString('ru-RU') : ''; }
  }
};
</script>

<style scoped>
.profile-page { max-width: 1000px; margin: 30px auto; padding: 0 20px; }
.profile-card { border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
.profile-header-grid { display: grid; grid-template-columns: 250px 1fr; gap: 40px; }
@media (max-width: 768px) { .profile-header-grid { grid-template-columns: 1fr; text-align: center; } }
.avatar-section { text-align: center; }
.avatar-wrapper { margin-bottom: 15px; position: relative; display: inline-block; }
.upload-btn { position: absolute; bottom: 0; right: -10px; }
.name-title { font-size: 1.5em; font-weight: bold; margin: 10px 0 5px; color: #2c3e50; }
.spec-subtitle { color: #777; font-size: 0.95em; margin-bottom: 20px; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #f0f0f0; padding-bottom: 10px; }
.section-header h3 { margin: 0; color: #1890ff; }
.links-list { display: flex; flex-wrap: wrap; gap: 10px; }
.link-tag { background: #f0f5ff; border: 1px solid #adc6ff; color: #2f54eb; padding: 5px 12px; border-radius: 15px; text-decoration: none; display: flex; align-items: center; gap: 5px; font-size: 0.9em; transition: 0.2s; }
.link-tag:hover { background: #d6e4ff; }
.links-edit-section { background: #fafafa; padding: 15px; border-radius: 8px; border: 1px solid #f0f0f0; margin-bottom: 20px; }
.link-row { display: flex; gap: 10px; margin-bottom: 10px; align-items: center; }
.mt-20 { margin-top: 20px; }
.job-title { font-weight: bold; font-size: 1.1em; color: #1890ff; }
.job-dates { font-size: 0.9em; color: #888; }
.job-form-box { background: #fafafa; padding: 20px; margin-bottom: 20px; border-radius: 8px; border: 1px solid #f0f0f0; }
</style>