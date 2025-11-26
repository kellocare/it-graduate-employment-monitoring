<template>
  <div class="nav-container fade-in-down">
    <div class="glass-nav">

      <!-- 1. Дашборд -->
      <router-link to="/admin" class="nav-item" active-class="active-link" exact-active-class="active-link">
        <dashboard-outlined /> <span>Дашборд</span>
      </router-link>

      <!-- 2. Пользователи -->
      <router-link to="/admin/users" class="nav-item" active-class="active-link">
        <team-outlined /> <span>Пользователи</span>
      </router-link>

      <!-- 3. Вакансии (Модерация) -->
      <router-link to="/admin/vacancies" class="nav-item" active-class="active-link">
        <div class="badge-wrapper">
          <safety-certificate-filled />
          <span v-if="pendingCount > 0" class="pulse-dot"></span>
        </div>
        <span>Модерация</span>
      </router-link>

      <!-- 4. Новости -->
      <router-link to="/admin/news" class="nav-item" active-class="active-link">
        <read-outlined /> <span>Новости</span>
      </router-link>

      <!-- 5. 🔥 НОВАЯ ВКЛАДКА: База данных (Реестр) -->
      <router-link to="/admin/data" class="nav-item" active-class="active-link">
        <database-outlined /> <span>БД</span>
      </router-link>

      <!-- 6. Логи -->
      <router-link to="/admin/logs" class="nav-item" active-class="active-link">
        <history-outlined /> <span>Логи</span>
      </router-link>

      <!-- 7. Отзывы -->
      <router-link to="/admin/reviews" class="nav-item" active-class="active-link">
          <message-filled /> <span>Отзывы</span>
      </router-link>

    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import api from '../axios';
// 🔥 Импортируем недостающие иконки: MessageFilled и DatabaseOutlined
import {
  DashboardOutlined,
  TeamOutlined,
  SafetyCertificateFilled,
  ReadOutlined,
  HistoryOutlined,
  MessageFilled,
  DatabaseOutlined
} from '@ant-design/icons-vue';

export default {
  components: {
    DashboardOutlined,
    TeamOutlined,
    SafetyCertificateFilled,
    ReadOutlined,
    HistoryOutlined,
    MessageFilled,    // Добавили
    DatabaseOutlined  // Добавили
  },
  setup() {
    const pendingCount = ref(0);

    const checkPending = async () => {
      try {
        const res = await api.get('/vacancies/admin/all');
        pendingCount.value = res.data.filter(v => v.status === 'pending').length;
      } catch (e) {}
    };

    onMounted(checkPending);

    return { pendingCount };
  }
}
</script>

<style scoped>
.nav-container {
  display: flex;
  justify-content: center;
  margin-bottom: 30px;
  position: sticky;
  top: 20px; /* Прилипает при скролле */
  z-index: 50;
}

.glass-nav {
  display: flex;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(16px);
  padding: 6px;
  border-radius: 50px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.1);
  gap: 5px;
  border: 1px solid rgba(255, 255, 255, 0.6);
  flex-wrap: wrap; /* На случай маленьких экранов */
  justify-content: center;
}

.nav-item {
  text-decoration: none;
  color: #6b7280; /* Цвет обычного текста (серый) */
  font-weight: 600;
  padding: 10px 24px;
  border-radius: 40px;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;
  font-size: 0.95rem;
  border: 1px solid transparent;
  white-space: nowrap;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.8);
  color: #1f2937;
  transform: translateY(-2px);
}

/* === ВАЖНО: СТИЛИ АКТИВНОЙ КНОПКИ === */
.active-link {
  background: linear-gradient(135deg, #6366f1, #8b5cf6) !important; /* Фиолетовый градиент */
  color: #ffffff !important; /* Белый текст ПРИНУДИТЕЛЬНО */
  box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);
}

/* При наведении на активную кнопку она не должна белеть */
.active-link:hover {
  background: linear-gradient(135deg, #4f46e5, #7c3aed) !important;
  color: white !important;
  transform: none;
}

.pulse-dot {
  position: absolute; top: -2px; right: -4px; width: 8px; height: 8px;
  background: #ff4d4f; border-radius: 50%; border: 2px solid white;
  animation: pulse 1.5s infinite;
}
.badge-wrapper { position: relative; display: flex; align-items: center; }
@keyframes pulse { 0% { transform: scale(1); opacity: 1; } 100% { transform: scale(2); opacity: 0; } }
.fade-in-down { animation: fadeInUp 0.6s ease-out; }
@keyframes fadeInUp { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
</style>