<template>
  <div class="page-wrapper">
    <!-- ФОН -->
    <div class="blobs-container">
      <div class="blob blob-purple"></div>
      <div class="blob blob-blue"></div>
      <div class="blob blob-pink"></div>
    </div>

    <div class="content-container fade-in">

      <!-- ШАПКА -->
      <div class="header-section">
        <div class="title-group">
          <h2 class="page-title">Студенты</h2>
          <p class="subtitle">База талантов и мониторинг трудоустройства</p>
        </div>

        <div class="header-actions">
           <div class="view-toggle">
             <button :class="{ active: viewMode === 'list' }" @click="viewMode = 'list'"><bars-outlined /></button>
             <button :class="{ active: viewMode === 'grid' }" @click="viewMode = 'grid'"><appstore-outlined /></button>
           </div>

           <button class="action-btn-primary" @click="exportToExcel">
             <file-excel-outlined class="icon-mr" /> Экспорт
           </button>
        </div>
      </div>

      <!-- ФИЛЬТРЫ -->
      <div class="glass-card filters-bar mb-30">
        <a-input
            v-model:value="filters.search"
            placeholder="Поиск по имени или email..."
            class="search-input"
            allow-clear
        >
          <template #prefix><search-outlined style="color: #9ca3af" /></template>
        </a-input>

        <div class="filter-chips">
          <span class="chip" :class="{ active: !filters.status }" @click="filters.status = undefined">Все</span>
          <span class="chip" :class="{ active: filters.status === 'employed' }" @click="filters.status = 'employed'">Трудоустроены</span>
          <span class="chip" :class="{ active: filters.status === 'search' }" @click="filters.status = 'search'">В поиске</span>
           <span class="chip" :class="{ active: filters.status === 'army' }" @click="filters.status = 'army'">Армия/Декрет</span>
        </div>
      </div>

      <a-spin :spinning="loading" size="large">

        <!-- ВИД: ТАБЛИЦА -->
        <div v-if="viewMode === 'list'" class="glass-card table-card">
          <a-table
            :dataSource="filteredStudents"
            :columns="columns"
            :pagination="{ pageSize: 10 }"
            rowKey="id"
            class="custom-table"
            @row-click="(record) => openStudentDrawer(record)"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'student'">
                <div class="student-info">
                  <a-avatar size="large" :src="getAvatarUrl(record.avatar_url)" :style="{ backgroundColor: stringToColor(record.last_name) }">
                    {{ record.first_name[0] }}
                  </a-avatar>
                  <div class="student-text">
                    <div class="name">{{ record.last_name }} {{ record.first_name }}</div>
                    <div class="email">{{ record.email }}</div>
                  </div>
                </div>
              </template>

              <template v-if="column.key === 'education'">
                <div v-if="record.faculty">
                  <span class="faculty-tag">{{ record.faculty }}</span>
                  <div class="year-sub">{{ record.graduation_year ? `Выпуск ${record.graduation_year}` : '' }}</div>
                </div>
                <div v-else class="text-muted">—</div>
              </template>

              <template v-if="column.key === 'status'">
                <a-tag :color="getStatusColor(record.status)">{{ getStatusLabel(record.status) }}</a-tag>
              </template>

              <template v-if="column.key === 'actions'">
                <right-outlined style="color: #ccc; font-size: 12px;" />
              </template>
            </template>
          </a-table>
        </div>

        <!-- ВИД: ПЛИТКИ -->
        <div v-else class="grid-container">
          <a-row :gutter="[20, 20]">
            <a-col :xs="24" :sm="12" :md="8" :lg="6" v-for="student in filteredStudents" :key="student.id">
              <div class="glass-card student-card" @click="openStudentDrawer(student)">
                <div class="card-header-bg" :style="{ background: stringToColor(student.last_name) }"></div>
                <div class="card-avatar">
                   <a-avatar :size="64" :src="getAvatarUrl(student.avatar_url)" :style="{ backgroundColor: '#fff', color: stringToColor(student.last_name), fontSize: '24px', border: '4px solid rgba(255,255,255,0.8)' }">
                     {{ student.first_name[0] }}{{ student.last_name[0] }}
                   </a-avatar>
                </div>
                <div class="card-body">
                   <div class="card-name">{{ student.last_name }} {{ student.first_name }}</div>
                   <div class="card-role">{{ student.faculty || 'Студент' }}</div>
                   <div class="card-status">
                      <a-badge :status="getStatusColor(student.status)" :text="getStatusLabel(student.status)" />
                   </div>
                </div>
              </div>
            </a-col>
          </a-row>
        </div>

      </a-spin>
    </div>

    <!-- DRAWER: ПРОФИЛЬ СТУДЕНТА -->
    <a-drawer
      v-model:open="drawerVisible"
      title="Личное дело студента"
      placement="right"
      width="720"
      :closable="true"
    >
      <div v-if="drawerLoading" class="drawer-loading">
         <a-spin size="large" tip="Загрузка данных профиля..." />
      </div>

      <div v-else-if="fullProfile" class="drawer-content fade-in">

        <!-- Шапка профиля -->
        <div class="profile-header">
           <div class="ph-avatar">
             <a-avatar :size="80" :src="getAvatarUrl(fullProfile.avatar_url)" :style="{ backgroundColor: stringToColor(fullProfile.name) }">
               <template #icon><user-outlined /></template>
             </a-avatar>
           </div>
           <div class="ph-info">
             <h3>{{ fullProfile.name }}</h3>
             <div class="ph-meta">
               <span><mail-outlined /> {{ fullProfile.email }}</span>
               <span v-if="fullProfile.city"><environment-outlined /> {{ fullProfile.city }}</span>
             </div>
             <div class="ph-tags mt-2">
                <a-tag :color="getStatusColor(selectedStudent?.status)">
                  {{ getStatusLabel(selectedStudent?.status) }}
                </a-tag>
             </div>
           </div>

           <!-- 🔥 КНОПКА СООБЩЕНИЯ В ШАПКЕ -->
           <div class="ph-action">
              <a-tooltip title="Написать сообщение">
                <a-button type="primary" shape="circle" size="large" @click="writeMessage(fullProfile.id)">
                  <message-outlined />
                </a-button>
              </a-tooltip>
           </div>
        </div>

        <a-divider style="margin: 15px 0" />

        <a-tabs v-model:activeKey="activeTab" centered>
          <!-- Обзор -->
          <a-tab-pane key="1" tab="Обзор">
             <div class="section-block" v-if="fullProfile.about_me">
               <h4>О себе</h4>
               <p class="text-desc">{{ fullProfile.about_me }}</p>
             </div>
             <div class="section-block">
               <h4>Навыки</h4>
               <div v-if="fullProfile.skills && fullProfile.skills.length" class="skills-container">
                  <a-tag v-for="skill in fullProfile.skills" :key="skill" color="geekblue">{{ skill }}</a-tag>
               </div>
               <p v-else class="text-muted">Навыки не указаны.</p>
             </div>
             <div class="section-block">
                <h4>Контакты</h4>
                <a-descriptions size="small" :column="1" bordered>
                   <a-descriptions-item label="Telegram">
                     <a v-if="fullProfile.telegram" :href="`https://t.me/${fullProfile.telegram.replace('@','')}`" target="_blank">{{ fullProfile.telegram }}</a>
                     <span v-else>—</span>
                   </a-descriptions-item>
                </a-descriptions>
             </div>
          </a-tab-pane>

          <!-- Карьера -->
          <a-tab-pane key="2" tab="Карьера">
             <div v-if="fullProfile.employment && fullProfile.employment.length">
                <a-timeline class="mt-4">
                   <a-timeline-item v-for="job in fullProfile.employment" :key="job.id" color="blue">
                      <template #dot><bank-outlined style="font-size: 16px;" /></template>
                      <div class="job-card">
                         <div class="job-company">{{ job.company_name }}</div>
                         <div class="job-pos">{{ job.position_title }}</div>
                         <div class="job-dates">{{ formatDate(job.start_date) }} — {{ job.is_current ? 'Н.в.' : formatDate(job.end_date) }}</div>
                      </div>
                   </a-timeline-item>
                </a-timeline>
             </div>
             <div v-else class="empty-tab">
                <inbox-outlined style="font-size: 30px; opacity: 0.5" />
                <p>Нет истории работы</p>
             </div>
          </a-tab-pane>

          <!-- Обучение -->
          <a-tab-pane key="3" tab="Обучение">
             <div v-if="fullProfile.roadmapHistory && fullProfile.roadmapHistory.length" class="history-list">
                <div v-for="h in fullProfile.roadmapHistory" :key="h.id" class="history-item">
                   <div class="h-info">
                      <div class="h-title">{{ h.role_title }}</div>
                      <div class="h-date">{{ formatDate(h.completed_at) }}</div>
                   </div>
                   <div class="h-badge" :class="getProgressColorClass(h.progress)">{{ h.progress }}%</div>
                </div>
             </div>
             <div v-else class="empty-tab">
                <read-outlined style="font-size: 30px; opacity: 0.5" />
                <p>Нет завершенных курсов</p>
             </div>
          </a-tab-pane>
        </a-tabs>



      </div>
    </a-drawer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import api from '../axios';
import {
  SearchOutlined, FileExcelOutlined, BarsOutlined, AppstoreOutlined,
  MailOutlined, RightOutlined, UserOutlined, EnvironmentOutlined,
  BankOutlined, InboxOutlined, ReadOutlined, MessageOutlined
} from '@ant-design/icons-vue';
import { message } from 'ant-design-vue';
import * as XLSX from 'xlsx';

const router = useRouter();

// State
const loading = ref(true);
const students = ref([]);
const viewMode = ref('list');
const drawerVisible = ref(false);
const drawerLoading = ref(false);
const selectedStudent = ref(null);
const fullProfile = ref(null);
const activeTab = ref('1');

const filters = ref({ search: '', status: undefined });

const columns = [
  { title: 'Студент', key: 'student' },
  { title: 'Образование', key: 'education' },
  { title: 'Статус', key: 'status', align: 'center' },
  { title: '', key: 'actions', width: '50px' },
];

const fetchStudents = async () => {
  try {
    const res = await api.get('/university/students');
    students.value = res.data;
  } catch (e) {
    message.error('Ошибка загрузки данных');
  } finally {
    loading.value = false;
  }
};

const openStudentDrawer = async (record) => {
  selectedStudent.value = record;
  drawerVisible.value = true;
  drawerLoading.value = true;
  fullProfile.value = null;
  activeTab.value = '1';

  try {
    // Получаем ID пользователя (он может быть в record.id или record.user_id в зависимости от ответа бэка)
    // Убедись, что твой эндпоинт /university/students возвращает правильный id пользователя для чата
    const res = await api.get(`/users/${record.id}/public-info`);
    fullProfile.value = res.data;
  } catch (e) {
    // Fallback
    fullProfile.value = {
        id: record.id,
        name: `${record.last_name} ${record.first_name}`,
        email: record.email,
        avatar_url: null,
        about_me: null,
        skills: []
    };
  } finally {
    drawerLoading.value = false;
  }
};

// 🔥 ФУНКЦИЯ ПЕРЕХОДА
const writeMessage = (userId) => {
  if (!userId) return message.error('Ошибка: ID пользователя не найден');
  // Переходим в сообщения с параметром userId
  router.push({ path: '/messages', query: { userId: userId } });
};

const filteredStudents = computed(() => {
  return students.value.filter(student => {
    const searchLower = filters.value.search.toLowerCase();
    const fullName = `${student.last_name} ${student.first_name}`.toLowerCase();
    const matchesSearch = !filters.value.search || fullName.includes(searchLower);
    const matchesStatus = !filters.value.status || student.status === filters.value.status;
    return matchesSearch && matchesStatus;
  });
});

const getAvatarUrl = (url) => url ? `http://localhost:4000${url}` : null;
const formatDate = (val) => val ? new Date(val).toLocaleDateString('ru-RU') : '';
const getStatusLabel = (s) => ({ 'employed': 'Работает', 'search': 'В поиске', 'army': 'Армия' }[s] || s);
const getStatusColor = (s) => ({ 'employed': 'success', 'search': 'processing', 'army': 'warning' }[s] || 'default');
const stringToColor = (str) => {
  if (!str) return '#1890ff';
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  const c = (hash & 0x00ffffff).toString(16).toUpperCase();
  return '#' + '00000'.substring(0, 6 - c.length) + c;
};
const getProgressColorClass = (p) => p >= 100 ? 'badge-success' : 'badge-info';

const exportToExcel = () => {
  if (!filteredStudents.value.length) return message.warning('Нет данных');
  const data = filteredStudents.value.map(s => ({
     "ФИО": `${s.last_name} ${s.first_name}`,
     "Email": s.email,
     "Факультет": s.faculty,
     "Статус": getStatusLabel(s.status)
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Students");
  XLSX.writeFile(wb, "University_Report.xlsx");
};

onMounted(fetchStudents);
</script>

<style scoped>
/* Main Layout */
.page-wrapper { min-height: 100vh; padding: 30px; background: #f3f4f6; position: relative; font-family: 'Inter', sans-serif; }
.blobs-container { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 0; pointer-events: none; }
.blob { position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.5; }
.blob-purple { background: #c4b5fd; width: 400px; height: 400px; top: -100px; left: -100px; }
.blob-blue { background: #bfdbfe; width: 300px; height: 300px; bottom: 0; right: 0; }
.blob-pink { background: #fbcfe8; width: 200px; height: 200px; top: 40%; right: 20%; opacity: 0.3; }

.content-container { position: relative; z-index: 1; max-width: 1200px; margin: 0 auto; }

/* Header */
.header-section { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 25px; }
.page-title { font-size: 2rem; font-weight: 800; color: #1f2937; margin: 0; }
.subtitle { color: #6b7280; margin: 5px 0 0 0; }
.header-actions { display: flex; gap: 15px; align-items: center; }

.action-btn-primary { background: #10b981; color: white; border: none; padding: 10px 20px; border-radius: 10px; font-weight: 600; cursor: pointer; transition: 0.2s; box-shadow: 0 4px 10px rgba(16, 185, 129, 0.3); }
.action-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 15px rgba(16, 185, 129, 0.4); }

.view-toggle { background: rgba(255,255,255,0.6); padding: 4px; border-radius: 10px; display: flex; gap: 4px; border: 1px solid rgba(0,0,0,0.05); }
.view-toggle button { border: none; background: transparent; padding: 6px 10px; border-radius: 8px; cursor: pointer; color: #6b7280; font-size: 16px; transition: 0.2s; }
.view-toggle button.active { background: white; color: #6366f1; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }

/* Glass Cards */
.glass-card { background: rgba(255,255,255,0.7); backdrop-filter: blur(12px); border-radius: 20px; border: 1px solid rgba(255,255,255,0.6); box-shadow: 0 4px 20px rgba(0,0,0,0.02); }
.filters-bar { display: flex; gap: 20px; align-items: center; padding: 15px 20px; margin-bottom: 25px; }
.search-input { width: 300px; border-radius: 8px; }
.filter-chips { display: flex; gap: 10px; }
.chip { padding: 6px 14px; background: rgba(0,0,0,0.05); border-radius: 20px; cursor: pointer; font-size: 0.9rem; color: #4b5563; transition: 0.2s; font-weight: 500; }
.chip:hover { background: rgba(0,0,0,0.08); }
.chip.active { background: #6366f1; color: white; }

/* Table */
.table-card { overflow: hidden; }
:deep(.custom-table .ant-table-tbody > tr) { cursor: pointer; transition: background 0.2s; }
:deep(.custom-table .ant-table-tbody > tr:hover > td) { background: rgba(99, 102, 241, 0.05) !important; }
.student-info { display: flex; align-items: center; gap: 15px; }
.name { font-weight: 600; color: #1f2937; }
.email { font-size: 0.8rem; color: #9ca3af; }
.faculty-tag { font-weight: 600; color: #4b5563; }
.year-sub { font-size: 0.75rem; color: #9ca3af; }

/* Grid Cards */
.student-card { cursor: pointer; transition: 0.3s; overflow: hidden; position: relative; height: 100%; display: flex; flex-direction: column; padding: 0; }
.student-card:hover { transform: translateY(-5px); box-shadow: 0 10px 25px rgba(0,0,0,0.08); }
.card-header-bg { height: 60px; width: 100%; }
.card-avatar { margin-top: -32px; margin-left: 20px; }
.card-body { padding: 15px 20px 20px; flex: 1; }
.card-name { font-weight: 700; font-size: 1.1rem; color: #1f2937; margin-top: 10px; }
.card-role { color: #6b7280; font-size: 0.9rem; margin-bottom: 10px; }

/* Drawer Styles */
.drawer-loading { display: flex; justify-content: center; align-items: center; height: 300px; }
.profile-header { display: flex; gap: 20px; align-items: flex-start; }
.ph-info { flex: 1; }
.ph-info h3 { margin: 0 0 5px; font-size: 1.5rem; font-weight: 700; }
.ph-meta { display: flex; gap: 15px; color: #6b7280; font-size: 0.9rem; }
.ph-tags { display: flex; gap: 8px; }

.section-block { margin-bottom: 25px; }
.section-block h4 { font-weight: 700; color: #374151; margin-bottom: 8px; border-left: 3px solid #6366f1; padding-left: 10px; }
.text-desc { color: #4b5563; line-height: 1.6; }
.skills-container { display: flex; flex-wrap: wrap; gap: 8px; }

.job-card { background: #f9fafb; padding: 12px 16px; border-radius: 12px; border: 1px solid #f3f4f6; }
.job-company { font-weight: 700; color: #1f2937; }
.job-pos { color: #4f46e5; font-size: 0.9rem; margin-bottom: 4px; }
.job-dates { color: #9ca3af; font-size: 0.8rem; }

.history-list { display: flex; flex-direction: column; gap: 10px; margin-top: 10px; }
.history-item { display: flex; justify-content: space-between; align-items: center; background: #f9fafb; padding: 12px 16px; border-radius: 12px; border: 1px solid #f3f4f6; }
.h-title { font-weight: 600; color: #374151; }
.h-date { font-size: 0.75rem; color: #9ca3af; }
.h-badge { font-weight: 700; font-size: 0.8rem; padding: 2px 8px; border-radius: 6px; }
.badge-default { background: #e5e7eb; color: #6b7280; }
.badge-info { background: #e0e7ff; color: #4f46e5; }
.badge-success { background: #d1fae5; color: #10b981; }

.empty-tab { text-align: center; padding: 40px; color: #9ca3af; }
.fade-in { animation: fadeIn 0.5s ease-out; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
</style>