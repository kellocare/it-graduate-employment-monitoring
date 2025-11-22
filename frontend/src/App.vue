<template>
  <MagicCursor />
  <div class="app-layout">
    <Navbar />


    <div class="main-content">
      <!-- Анимация переходов между страницами -->
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </div>

    <Footer />
  </div>
</template>

<script>
import Navbar from './components/Navbar.vue';
import Footer from './components/Footer.vue';
import MagicCursor from './components/MagicCursor.vue';

export default {
  components: {MagicCursor, Navbar, Footer }
}
</script>

<style>
/* Глобальные стили */
body {
  background-color: #f0f2f5;
  margin: 0;
  overflow-x: hidden; /* Чтобы анимация не вызывала полосу прокрутки */
}

.app-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.main-content {
  flex: 1;
  padding-bottom: 20px;
}

/* --- СТИЛИ АНИМАЦИИ (FADE) --- */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(10px); /* Легкий сдвиг снизу */
}

.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px); /* Легкий уход вверх */
}
</style>