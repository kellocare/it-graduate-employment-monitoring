<template>
  <div class="admin-layout-wrapper">
    <!-- 1. Глобальный фон админки -->
    <AdminBackground />

    <!-- 2. Навигация (Табы) -->
    <AdminTabs />

    <!-- 3. Меняющийся контент (здесь будут Dashboard, Users, Vacancies) -->
    <div class="admin-page-content">
      <!-- transition добавляет плавность при переключении -->
      <router-view v-slot="{ Component }">
        <transition name="fade-page" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </div>
  </div>
</template>

<script>
import AdminBackground from './AdminBackground.vue';
import AdminTabs from './AdminTabs.vue';

export default {
  components: {
    AdminBackground,
    AdminTabs
  }
}
</script>

<style scoped>
.admin-layout-wrapper {
  position: relative;
  min-height: 100vh;
  /* Добавляем отступ сверху, чтобы контент не наезжал на Табы */
  padding-top: 20px;
}

.admin-page-content {
  position: relative;
  z-index: 5; /* Контент выше фона */
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px 50px 20px;
}

/* Анимация переключения страниц */
.fade-page-enter-active,
.fade-page-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-page-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.fade-page-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>