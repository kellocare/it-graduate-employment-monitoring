<template>
  <div class="page-wrapper">

    <!-- Фон -->
    <div class="blobs-container">
      <div class="blob blob-1"></div><div class="blob blob-2"></div>
    </div>

    <div class="content-container fade-in-up">

      <!-- Навигация -->
      <div class="top-nav">
        <button class="btn-back" @click="$router.go(-1)">
          <arrow-left-outlined /> Назад
        </button>
      </div>

      <!-- Лоадер -->
      <div v-if="loading" class="loading-state"><a-spin size="large" tip="Загрузка профиля..." /></div>

      <!-- Ошибка -->
      <div v-else-if="error" class="error-state">
        <frown-outlined style="font-size: 40px; color: #9ca3af" />
        <h3>Профиль не найден</h3>
      </div>

      <!-- ОСНОВНОЙ КОНТЕНТ -->
      <div v-else class="profile-grid">

        <!-- === ЛЕВАЯ КОЛОНКА (Личные данные) === -->
        <div class="left-column">
          <div class="glass-card info-card">

            <!-- Аватар -->
            <div class="avatar-wrapper">
               <a-avatar :size="120" :src="getAvatarUrl(user.avatar_url)"
                         :style="{ backgroundColor: stringToColor(user.name) }" class="main-avatar">
                  <template #icon><user-outlined style="font-size: 50px" /></template>
               </a-avatar>
            </div>

            <h1 class="user-name">{{ user.name }}</h1>

            <div class="role-tag">
               <component :is="getRoleIcon(user.role)" /> {{ getRoleName(user.role) }}
            </div>

            <a-divider class="custom-divider" />

            <!-- Инфо -->
            <div class="info-list">
               <div class="info-row">
                 <span class="label">Email</span>
                 <span class="val">{{ user.email }}</span>
               </div>
               <div class="info-row" v-if="user.city">
                 <span class="label">Город</span>
                 <span class="val">{{ user.city }}</span>
               </div>
               <div class="info-row" v-if="user.graduation_year">
                 <span class="label">Год выпуска</span>
                 <span class="val">{{ user.graduation_year }}</span>
               </div>
               <div class="info-row" v-if="user.telegram">
                 <span class="label">Telegram</span>
                 <a :href="'https://t.me/' + user.telegram.replace('@','')" target="_blank" class="val link">{{ user.telegram }}</a>
               </div>
            </div>

            <a-divider class="custom-divider" />

            <!-- О себе -->
            <div class="about-section">
               <h4>О себе</h4>
               <p v-if="user.about_me">{{ user.about_me }}</p>
               <p v-else class="empty-text">Информация не заполнена.</p>
            </div>

            <!-- Навыки -->
            <div class="skills-section" v-if="user.skills && user.skills.length">
               <h4>Навыки</h4>
               <div class="tags-cloud">
                  <span v-for="skill in user.skills" :key="skill" class="skill-tag">{{ skill }}</span>
               </div>
            </div>

            <!-- Кнопка действия -->
            <div class="action-area">
               <a-button type="primary" block shape="round" size="large" @click="writeMessage">
                 <message-outlined /> Написать сообщение
               </a-button>
            </div>
          </div>
        </div>

        <!-- === ПРАВАЯ КОЛОНКА (История и опыт) === -->
        <div class="right-column">

          <!-- 1. Блок: История обучения (Roadmap History) -->
          <div class="glass-card widget-card mb-20" v-if="user.roadmapHistory && user.roadmapHistory.length">
             <div class="card-header">
                <h3><history-outlined /> История обучения</h3>
             </div>
             <div class="history-list">
                <!-- Цикл по истории из БД -->
                <div v-for="h in user.roadmapHistory" :key="h.id" class="history-item">
                   <div class="h-info">
                      <div class="h-title">{{ h.role_title }}</div>
                      <div class="h-date">{{ formatDate(h.completed_at) }}</div>
                   </div>
                   <div class="h-badge" :class="getProgressColorClass(h.progress)">
                      {{ h.progress }}%
                   </div>
                </div>
             </div>
          </div>

          <!-- 2. Блок: Карьерный путь (Timeline) -->
          <div class="glass-card widget-card" v-if="user.employment && user.employment.length">
             <div class="card-header">
                <h3><solution-outlined /> Карьерный путь</h3>
             </div>
             <div class="timeline-container">
                <a-timeline>
                   <a-timeline-item v-for="job in user.employment" :key="job.id" color="blue">
                      <template #dot><div class="timeline-dot"><bank-outlined /></div></template>
                      <div class="job-card">
                         <div class="job-head">
                            <span class="job-company">{{ job.company_name }}</span>
                            <div class="job-actions">
                               <!-- Тут можно добавить иконки, если нужно -->
                            </div>
                         </div>
                         <div class="job-pos">{{ job.position_title }}</div>
                         <div class="job-footer">
                            <span class="job-salary" v-if="job.salary_amount">{{ formatMoney(job.salary_amount) }} ₽</span>
                            <span class="job-dates">{{ formatDate(job.start_date) }} — {{ job.is_current ? 'Н.в.' : formatDate(job.end_date) }}</span>
                         </div>
                      </div>
                   </a-timeline-item>
                </a-timeline>
             </div>
          </div>

          <!-- Заглушка, если данных нет -->
          <div v-else-if="(!user.roadmapHistory || !user.roadmapHistory.length) && (!user.employment || !user.employment.length)" class="glass-card widget-card empty-block">
             <folder-open-outlined style="font-size: 30px; color: #cbd5e1" />
             <p>Пользователь пока не заполнил информацию о карьере и обучении.</p>
          </div>

        </div>

      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '../axios';
import {
  ArrowLeftOutlined, UserOutlined, EnvironmentOutlined,
  IdcardOutlined, SafetyCertificateFilled, BankOutlined,
  MessageOutlined, SendOutlined, FrownOutlined,
  HistoryOutlined, SolutionOutlined, FolderOpenOutlined
} from '@ant-design/icons-vue';

export default {
  components: {
    ArrowLeftOutlined, UserOutlined, EnvironmentOutlined,
    IdcardOutlined, SafetyCertificateFilled, BankOutlined,
    MessageOutlined, SendOutlined, FrownOutlined,
    HistoryOutlined, SolutionOutlined, FolderOpenOutlined
  },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const user = ref(null);
    const loading = ref(true);
    const error = ref(false);

    const loadProfile = async () => {
      loading.value = true;
      try {
        const r = await api.get(`/users/${route.params.id}/public-info`);
        user.value = r.data;
      } catch (e) {
        console.error(e);
        error.value = true;
      } finally {
        loading.value = false;
      }
    };

    // 🔥 Переход в чат с созданием get-параметра
    const writeMessage = () => {
      router.push({ path: '/messages', query: { userId: user.value.id } });
    };

    // Хелперы
    const getAvatarUrl = (url) => url ? `http://localhost:4000${url}` : null;

    const stringToColor = (str) => {
      if (!str) return '#ccc';
      let hash = 0;
      for (let i = 0; i < str.length; i++) { hash = str.charCodeAt(i) + ((hash << 5) - hash); }
      const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
      return '#' + '00000'.substring(0, 6 - c.length) + c;
    };

    const getRoleName = (role) => ({ 'graduate': 'Студент', 'employer': 'Рекрутер', 'admin': 'Администратор' }[role] || 'Пользователь');
    const getRoleIcon = (role) => ({ 'graduate': 'IdcardOutlined', 'employer': 'BankOutlined', 'admin': 'SafetyCertificateFilled' }[role] || 'UserOutlined');

    const formatDate = (val) => val ? new Date(val).toLocaleDateString('ru-RU') : '';
    const formatMoney = (val) => new Intl.NumberFormat('ru-RU').format(val);

    // Цвет бейджа прогресса
    const getProgressColorClass = (p) => {
        if (p >= 100) return 'badge-success';
        if (p > 50) return 'badge-info';
        return 'badge-default';
    };

    onMounted(loadProfile);

    return {
      user, loading, error,
      getAvatarUrl, stringToColor, getRoleName, getRoleIcon, formatDate, formatMoney,
      writeMessage, getProgressColorClass
    };
  }
}
</script>

<style scoped>
.page-wrapper {
  min-height: 100vh; background: #f0f2f5; display: flex; justify-content: center; padding: 40px 20px; position: relative;
}
.blobs-container { position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 0; }
.blob { position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.5; }
.blob-1 { width: 400px; height: 400px; background: #a855f7; top: -100px; left: -100px; }
.blob-2 { width: 300px; height: 300px; background: #3b82f6; bottom: -50px; right: -50px; }

.content-container { position: relative; z-index: 1; width: 100%; max-width: 1100px; display: flex; flex-direction: column; gap: 20px; }

.top-nav { margin-bottom: 10px; }
.btn-back { background: white; border: none; padding: 10px 20px; border-radius: 30px; font-weight: 600; color: #4b5563; cursor: pointer; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); transition: 0.2s; }
.btn-back:hover { transform: translateX(-3px); color: #1f2937; }

/* GRID LAYOUT */
.profile-grid { display: grid; grid-template-columns: 1fr 1.6fr; gap: 30px; align-items: start; }
@media (max-width: 900px) { .profile-grid { grid-template-columns: 1fr; } }

/* GLASS CARD */
.glass-card {
  background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(20px);
  border-radius: 24px; border: 1px solid rgba(255,255,255,0.6);
  box-shadow: 0 15px 40px rgba(0,0,0,0.06); padding: 30px;
}

/* LEFT COLUMN */
.info-card { text-align: left; }
.avatar-wrapper { display: flex; justify-content: center; margin-bottom: 20px; }
.main-avatar { border: 4px solid white; box-shadow: 0 10px 20px rgba(0,0,0,0.1); }
.user-name { font-size: 1.8rem; font-weight: 800; color: #1f2937; margin: 0 0 5px; text-align: center; }
.role-tag { display: flex; justify-content: center; align-items: center; gap: 6px; margin-bottom: 15px; color: #6b7280; font-size: 0.9rem; }

.custom-divider { margin: 20px 0; }

.info-list { display: flex; flex-direction: column; gap: 12px; }
.info-row { display: flex; justify-content: space-between; font-size: 0.95rem; }
.info-row .label { color: #6b7280; font-weight: 500; }
.info-row .val { font-weight: 700; color: #1f2937; }
.info-row .val.link { color: #2563eb; cursor: pointer; }

.about-section h4, .skills-section h4 { font-weight: 700; color: #1f2937; margin-bottom: 10px; font-size: 1rem; }
.about-section p { color: #4b5563; line-height: 1.6; font-size: 0.95rem; }
.empty-text { font-style: italic; color: #9ca3af; }

.tags-cloud { display: flex; flex-wrap: wrap; gap: 8px; }
.skill-tag { background: #fff; border: 1px solid #e5e7eb; padding: 5px 12px; border-radius: 12px; font-weight: 600; color: #374151; font-size: 0.85rem; }

.action-area { margin-top: 30px; }

/* RIGHT COLUMN WIDGETS */
.mb-20 { margin-bottom: 20px; }
.card-header h3 { font-size: 1.2rem; font-weight: 700; color: #1f2937; margin: 0 0 20px 0; display: flex; align-items: center; gap: 10px; }

/* HISTORY LIST (Стили из скрина) */
.history-list { display: flex; flex-direction: column; gap: 10px; }
.history-item {
  display: flex; justify-content: space-between; align-items: center;
  background: white; padding: 15px 20px; border-radius: 16px;
  border: 1px solid #e5e7eb; transition: 0.2s;
}
.history-item:hover { transform: translateX(5px); border-color: #a78bfa; }

.h-title { font-weight: 700; color: #374151; font-size: 1rem; margin-bottom: 2px; }
.h-date { font-size: 0.75rem; color: #9ca3af; }

.h-badge {
  font-weight: 700; font-size: 0.85rem; padding: 4px 12px; border-radius: 8px;
}
.badge-default { background: #eff6ff; color: #3b82f6; } /* Синий */
.badge-info { background: #f3e8ff; color: #7c3aed; }    /* Фиолетовый */
.badge-success { background: #ecfdf5; color: #10b981; } /* Зеленый (100%) */

/* TIMELINE */
.timeline-container { margin-top: 10px; }
.timeline-dot { width: 32px; height: 32px; background: #eff6ff; border: 2px solid #3b82f6; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #3b82f6; }
.job-card {
  background: white; border-radius: 16px; padding: 16px 20px;
  box-shadow: 0 4px 10px rgba(0,0,0,0.03); border: 1px solid #e5e7eb;
  margin-left: 5px;
}
.job-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; }
.job-company { font-weight: 800; font-size: 1.1rem; color: #1f2937; }
.job-pos { color: #2563eb; font-weight: 600; font-size: 0.95rem; margin-bottom: 10px; }
.job-footer { display: flex; justify-content: space-between; align-items: center; }
.job-salary { background: #ecfccb; color: #3f6212; padding: 3px 10px; border-radius: 6px; font-weight: 700; font-size: 0.85rem; }
.job-dates { color: #9ca3af; font-size: 0.8rem; }

.empty-block { text-align: center; padding: 60px; color: #9ca3af; }

.fade-in-up { opacity: 0; animation: fadeInUp 0.6s ease-out forwards; }
@keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
.loading-state { text-align: center; padding: 100px; }
.error-state { text-align: center; padding: 100px; color: #9ca3af; }
</style>