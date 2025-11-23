<template>
  <nav
    class="sidebar"
    :class="{ 'expanded': isHovered }"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  >

    <!-- ЛОГОТИП -->
    <div class="logo-wrapper">
      <div class="logo-box">
        <rocket-filled />
      </div>
      <transition name="fade">
        <span v-if="isHovered" class="logo-text">IT Monitor</span>
      </transition>
    </div>

    <!-- МЕНЮ -->
    <div class="menu-items">
      <router-link to="/" class="nav-item" active-class="active">
        <home-outlined class="nav-icon" />
        <transition name="fade">
          <span v-if="isHovered" class="nav-text">Главная</span>
        </transition>
      </router-link>

      <router-link to="/vacancies" class="nav-item" active-class="active">
        <solution-outlined class="nav-icon" />
        <transition name="fade">
          <span v-if="isHovered" class="nav-text">Вакансии</span>
        </transition>
      </router-link>

      <router-link to="/roadmap" class="nav-item" active-class="active">
        <compass-outlined class="nav-icon" />
        <transition name="fade">
          <span v-if="isHovered" class="nav-text">Roadmap</span>
        </transition>
      </router-link>

      <router-link to="/chat" class="nav-item" active-class="active">
        <robot-outlined class="nav-icon" />
        <transition name="fade">
          <span v-if="isHovered" class="nav-text">AI Ассистент</span>
        </transition>
      </router-link>

      <router-link to="/profile" class="nav-item" active-class="active">
        <user-outlined class="nav-icon" />
        <transition name="fade">
          <span v-if="isHovered" class="nav-text">Профиль</span>
        </transition>
      </router-link>
    </div>

    <!-- НИЖНЯЯ ЧАСТЬ -->
    <div class="bottom-section">
      <div class="nav-item logout-btn" @click="logout">
        <logout-outlined class="nav-icon" />
        <transition name="fade">
          <span v-if="isHovered" class="nav-text">Выход</span>
        </transition>
      </div>
    </div>

  </nav>
</template>

<script>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  RocketFilled, HomeOutlined, SolutionOutlined,
  CompassOutlined, RobotOutlined, UserOutlined, LogoutOutlined
} from '@ant-design/icons-vue';

export default {
  name: 'Navbar',
  components: {
    RocketFilled, HomeOutlined, SolutionOutlined,
    CompassOutlined, RobotOutlined, UserOutlined, LogoutOutlined
  },
  setup() {
    const isHovered = ref(false);
    const router = useRouter();

    const logout = () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      router.push('/login');
    };

    return { isHovered, logout };
  }
}
</script>

<style scoped>
/* === БОКОВАЯ ПАНЕЛЬ === */
.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  /* Ширина чуть больше, чтобы контент дышал */
  width: 80px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  border-right: 1px solid rgba(255, 255, 255, 0.6);
  box-shadow: 5px 0 25px rgba(0, 0, 0, 0.03);
  z-index: 1000;

  display: flex;
  flex-direction: column;
  /* Отступы по краям, чтобы элементы центрировались автоматически */
  padding: 20px 12px;
  transition: width 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
  overflow: hidden;
}

/* Расширенное состояние */
.sidebar.expanded {
  width: 260px;
  padding: 20px 15px; /* Чуть меняем паддинги при открытии */
}

/* === ЛОГОТИП === */
.logo-wrapper {
  height: 50px;
  display: flex;
  align-items: center;
  margin-bottom: 40px;
  /* Центрируем лого в свернутом виде */
  justify-content: center;
  width: 100%;
}
/* Когда меню открыто, логотип уезжает влево */
.sidebar.expanded .logo-wrapper {
  justify-content: flex-start;
  padding-left: 5px;
}

.logo-box {
  width: 44px;
  height: 44px;
  /* Фиксируем размеры, чтобы не прыгало */
  min-width: 44px;
  background: linear-gradient(135deg, #6366f1, #a855f7);
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.4rem;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
}

.logo-text {
  margin-left: 15px;
  font-size: 1.3rem;
  font-weight: 800;
  background: linear-gradient(135deg, #1f2937, #4b5563);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  white-space: nowrap;
}

/* === МЕНЮ === */
.menu-items {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}

.nav-item {
  position: relative;
  height: 50px;
  width: 100%;
  display: flex;
  align-items: center;
  /* ГЛАВНОЕ ИСПРАВЛЕНИЕ: Центрируем содержимое (иконку) */
  justify-content: center;
  border-radius: 16px;
  text-decoration: none;
  color: #6b7280;
  transition: all 0.3s ease;
  cursor: pointer;
}

/* Когда меню открыто, выравниваем элементы по левому краю */
.sidebar.expanded .nav-item {
  justify-content: flex-start;
  padding-left: 14px; /* Отступ слева внутри кнопки */
}

/* Иконка */
.nav-icon {
  font-size: 1.4rem;
  transition: transform 0.2s;
}

/* Текст */
.nav-text {
  margin-left: 16px;
  font-weight: 600;
  font-size: 1rem;
  white-space: nowrap;
  color: #4b5563;
}

/* === ЭФФЕКТЫ (HOVER / ACTIVE) === */

/* Наведение */
.nav-item:hover {
  background: rgba(99, 102, 241, 0.08);
  color: #6366f1;
}
.nav-item:hover .nav-icon {
  transform: scale(1.1);
}

/* Активная вкладка */
.nav-item.active {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
  box-shadow: 0 8px 20px rgba(99, 102, 241, 0.3);
}
.nav-item.active .nav-text {
  color: white;
}

/* === НИЗ (ВЫХОД) === */
.bottom-section {
  border-top: 1px solid rgba(0,0,0,0.06);
  padding-top: 20px;
  margin-top: auto;
  width: 100%;
}

.logout-btn:hover {
  background: #fee2e2;
  color: #ef4444;
}
.logout-btn:hover .nav-text {
  color: #ef4444;
}

/* АНИМАЦИЯ ТЕКСТА */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s ease 0.1s; /* Задержка чтобы меню успело раскрыться */
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>