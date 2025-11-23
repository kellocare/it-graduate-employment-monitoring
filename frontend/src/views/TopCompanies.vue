<template>
  <div class="page-wrapper">

    <!-- Фон -->
    <div class="blobs-container">
      <div class="blob blob-1"></div>
      <div class="blob blob-2"></div>
    </div>

    <div class="content-container fade-in-up">

      <!-- Заголовок -->
      <div class="page-header">
        <h1><trophy-filled class="icon-gold" /> Рейтинг Работодателей</h1>
        <p class="subtitle">Топ компаний по отзывам сотрудников и AI-аналитике</p>
      </div>

      <!-- Лоадер -->
      <div v-if="loading" class="loading-state">
        <loading-outlined spin /> Загрузка рейтинга...
      </div>

      <!-- Сетка компаний -->
      <div v-else class="companies-grid">
        <div
          v-for="(comp, index) in companies"
          :key="comp.id"
          class="glass-card company-card"
          @click="openCompanyModal(comp.id)"
        >
          <!-- Номер места в топе -->
          <div class="rank-badge" :class="'rank-'+(index+1)">#{{ index + 1 }}</div>

          <div class="card-header">
             <div class="company-logo">
               <!-- Если есть логотип - показываем, если нет - иконка -->
               <img v-if="comp.logo_url" :src="comp.logo_url" />
               <bank-filled v-else />
             </div>
             <div class="company-info">
               <h3>{{ comp.name }}</h3>
               <div class="meta-row">
                 <span><environment-outlined /> {{ comp.city || 'Везде' }}</span>
                 <span><team-outlined /> {{ comp.review_count || 0 }} отзывов</span>
               </div>
             </div>
          </div>

          <!-- AI Score -->
          <div class="ai-score-bar">
             <div class="score-label"><robot-filled /> AI Trust</div>
             <div class="score-val" :style="{ color: getScoreColor(comp.ai_score) }">
               {{ comp.ai_score }}%
             </div>
          </div>
          <div class="progress-track">
             <div class="progress-fill" :style="{ width: comp.ai_score + '%', background: getScoreColor(comp.ai_score) }"></div>
          </div>

          <div class="card-footer">
             <button class="btn-details">Подробнее</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 🔥 ПОДКЛЮЧЕНИЕ МОДАЛКИ 🔥 -->
    <!-- Важно: v-if заставляет компонент пересоздаваться при открытии, чтобы подгрузить данные -->
    <CompanyDetailsModal
      v-if="selectedCompanyId"
      :companyId="selectedCompanyId"
      @close="selectedCompanyId = null"
    />

  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import api from '../axios';

// 1. ИМПОРТИРУЕМ КОМПОНЕНТ МОДАЛКИ
import CompanyDetailsModal from '../components/CompanyDetailsModal.vue';

import {
  TrophyFilled, LoadingOutlined, BankFilled,
  EnvironmentOutlined, TeamOutlined, RobotFilled
} from '@ant-design/icons-vue';

export default {
  components: {
    CompanyDetailsModal, // <--- 2. РЕГИСТРИРУЕМ КОМПОНЕНТ
    TrophyFilled, LoadingOutlined, BankFilled,
    EnvironmentOutlined, TeamOutlined, RobotFilled
  },
  setup() {
    const companies = ref([]);
    const loading = ref(true);
    const selectedCompanyId = ref(null);

    const loadCompanies = async () => {
      try {
        const r = await api.get('/companies');
        companies.value = r.data;
      } catch(e) {
        console.error(e);
      } finally {
        loading.value = false;
      }
    };

    // Функция открытия
    const openCompanyModal = (id) => {
        selectedCompanyId.value = id;
    };

    const getScoreColor = (s) => {
       if(s >= 80) return '#10b981';
       if(s >= 50) return '#f59e0b';
       return '#ef4444';
    };

    onMounted(loadCompanies);

    return {
      companies, loading,
      selectedCompanyId, openCompanyModal, // Возвращаем переменные
      getScoreColor
    };
  }
}
</script>

<style scoped>
/* Стили страницы */
.page-wrapper { padding: 40px 20px; background: #f3f4f6; min-height: 100vh; position: relative; display: flex; justify-content: center; }
.blobs-container { position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 0; }
.blob { position: absolute; border-radius: 50%; filter: blur(60px); opacity: 0.5; animation: float 10s infinite alternate; }
.blob-1 { width: 400px; height: 400px; background: #a855f7; top: -100px; left: -100px; }
.blob-2 { width: 300px; height: 300px; background: #3b82f6; bottom: -50px; right: -50px; animation-delay: 2s; }

.content-container { max-width: 1000px; width: 100%; position: relative; z-index: 1; }

.page-header { text-align: center; margin-bottom: 40px; }
.page-header h1 { font-size: 2.5rem; font-weight: 800; color: #1f2937; margin: 0; }
.icon-gold { color: #fbbf24; margin-right: 10px; filter: drop-shadow(0 4px 10px rgba(251, 191, 36, 0.4)); }
.subtitle { color: #6b7280; font-size: 1.1rem; margin-top: 5px; }

.companies-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 25px; }

/* Карточка компании */
.glass-card {
  background: rgba(255,255,255,0.7); backdrop-filter: blur(20px);
  border: 1px solid white; border-radius: 24px; padding: 20px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.05); cursor: pointer;
  transition: 0.3s; position: relative; overflow: hidden;
}
.glass-card:hover { transform: translateY(-8px); box-shadow: 0 20px 40px rgba(0,0,0,0.1); }

.rank-badge { position: absolute; top: 0; right: 0; background: #f3f4f6; padding: 5px 15px; border-bottom-left-radius: 20px; font-weight: 800; color: #9ca3af; }
.rank-1 { background: linear-gradient(135deg, #fcd34d, #fbbf24); color: white; }
.rank-2 { background: linear-gradient(135deg, #9ca3af, #6b7280); color: white; }
.rank-3 { background: linear-gradient(135deg, #d97706, #b45309); color: white; }

.card-header { display: flex; gap: 15px; margin-bottom: 20px; }
.company-logo { width: 60px; height: 60px; border-radius: 15px; background: #eef2ff; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; color: #6366f1; overflow: hidden; }
.company-logo img { width: 100%; height: 100%; object-fit: cover; }
.company-info h3 { margin: 0 0 5px; font-weight: 700; color: #1f2937; }
.meta-row { font-size: 0.8rem; color: #6b7280; display: flex; flex-direction: column; gap: 2px; }

.ai-score-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; }
.score-label { font-weight: 700; color: #6366f1; display: flex; align-items: center; gap: 5px; font-size: 0.9rem; }
.score-val { font-weight: 900; font-size: 1.1rem; }
.progress-track { height: 6px; background: #e5e7eb; border-radius: 3px; overflow: hidden; margin-bottom: 20px; }
.progress-fill { height: 100%; border-radius: 3px; transition: width 1s ease; }

.btn-details { width: 100%; background: #1f2937; color: white; border: none; padding: 10px; border-radius: 12px; font-weight: 600; cursor: pointer; transition: 0.2s; }
.btn-details:hover { background: #374151; }

.loading-state { text-align: center; font-size: 1.2rem; color: #6b7280; margin-top: 50px; }
.fade-in-up { animation: fadeInUp 0.6s ease forwards; }
@keyframes fadeInUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
</style>