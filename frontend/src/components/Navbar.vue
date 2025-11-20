<template>
  <div class="navbar-wrapper">
    <div class="logo" @click="$router.push('/')">
        <rocket-two-tone two-tone-color="#1890ff" style="font-size: 1.5rem; margin-right: 10px;" />
          IT-Monitoring
    </div>

    <a-menu v-model:selectedKeys="current" mode="horizontal" :items="menuItems" @click="handleMenuClick" class="custom-menu" />

    <div class="auth-actions">
      <template v-if="user">
        <a-dropdown>
          <a-button type="text" class="user-btn">
            <span style="margin-right: 5px;">{{ user.first_name || user.email }}</span> <down-outlined />
          </a-button>
          <template #overlay>
            <a-menu>
              <a-menu-item key="profile" @click="$router.push('/profile')">
                👤 Мой профиль
              </a-menu-item>
              <a-menu-divider />
              <a-menu-item key="logout" @click="logout" danger>
                Выйти
              </a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
      </template>

      <template v-else>
        <a-button type="primary" @click="$router.push('/login')">Войти</a-button>
      </template>
    </div>
  </div>
</template>

<script>
import { ref, watch, onMounted, h } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import {
  HomeOutlined,
  AppstoreOutlined,
  RobotOutlined,
  DownOutlined,
  LineChartOutlined,
  RocketTwoTone
} from '@ant-design/icons-vue';

export default {
  components: { DownOutlined },
  setup() {
    const router = useRouter();
    const route = useRoute();
    const current = ref(['home']);
    const user = ref(null);
    const menuItems = ref([]); // Будем заполнять динамически

    const checkUser = () => {
      const userData = localStorage.getItem('user');
      user.value = userData ? JSON.parse(userData) : null;

      // Базовые пункты
      const items = [
        { key: 'home', icon: () => h(HomeOutlined), label: 'Главная' },
        { key: 'vacancies', icon: () => h(AppstoreOutlined), label: 'Вакансии' },
        { key: 'chat', icon: () => h(RobotOutlined), label: 'AI Ассистент' },
      ];

      // Добавляем Дашборд ТОЛЬКО если роль НЕ graduate
      // (Предполагаем, что админ это 'admin' или 'university_rep')
      if (user.value && user.value.role !== 'graduate') {
         items.push({ key: 'dashboard', icon: () => h(LineChartOutlined), label: 'Аналитика (Дашборд)' });
      }

      menuItems.value = items;
    };

    onMounted(checkUser);

    // Исправленная логика подсветки
    watch(() => route.path, (path) => {
      if (path === '/') current.value = ['home'];
      else if (path.includes('vacancies')) current.value = ['vacancies'];
      else if (path.includes('chat')) current.value = ['chat'];
      else if (path.includes('dashboard')) current.value = ['dashboard'];
      else {
        // Если мы в профиле или на логине — снимаем выделение с меню
        current.value = [];
      }
    });

    const handleMenuClick = (e) => {
      if (e.key === 'home') router.push('/');
      if (e.key === 'vacancies') router.push('/vacancies');
      if (e.key === 'chat') router.push('/chat');
      if (e.key === 'dashboard') router.push('/dashboard');
    };

    const logout = () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      user.value = null;
      router.push('/login');
      // Перезагружаем, чтобы меню перерисовалось для гостя
      setTimeout(() => window.location.reload(), 100);
    };

    return { current, menuItems, handleMenuClick, user, logout };
  }
};
</script>

<style scoped>
.navbar-wrapper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  height: 64px;
  position: sticky;
  top: 0;
  z-index: 100;
}

.logo {
  font-size: 1.2rem;
  font-weight: bold;
  color: #1890ff;
  cursor: pointer;
  margin-right: 40px;
  display: flex;
  align-items: center;
}

.custom-menu {
  flex-grow: 1;
  border-bottom: none;
  line-height: 64px;
}

.user-btn {
  color: #333;
}
</style>