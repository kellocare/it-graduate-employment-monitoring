<template>
  <div class="home-wrapper">
    <!-- Плавная анимация смены компонентов -->
    <transition name="fade" mode="out-in">
      <component :is="currentComponent" :user="user" />
    </transition>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue';
import LandingPage from '../components/LandingPage.vue';
import UserHome from '../components/UserHome.vue';

export default {
  components: { LandingPage, UserHome },
  setup() {
    const user = ref(null);

    onMounted(() => {
      const userData = localStorage.getItem('user');
      if (userData) {
        try {
          user.value = JSON.parse(userData);
        } catch (e) {
          localStorage.removeItem('user');
        }
      }
    });

    // Вычисляем, какой компонент показать
    const currentComponent = computed(() => {
      return user.value ? 'UserHome' : 'LandingPage';
    });

    return {currentComponent, user};
  }
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>