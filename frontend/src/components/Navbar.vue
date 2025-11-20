<template>
  <div class="navbar-wrapper">
    <div class="logo" @click="$router.push('/')">
      <rocket-two-tone two-tone-color="#1890ff" style="font-size: 1.5rem; margin-right: 10px;" />
      IT-Monitoring
    </div>

    <a-menu v-model:selectedKeys="current" mode="horizontal" :items="menuItems" @click="handleMenuClick" class="custom-menu" />

    <div class="auth-actions">
      <template v-if="user">

        <!-- КОЛОКОЛЬЧИК УВЕДОМЛЕНИЙ -->
        <a-popover trigger="click" placement="bottomRight" overlayClassName="notif-popover">
          <template #content>
            <div class="notif-list">
              <div v-if="notifications.length === 0" class="empty-notif">Нет новых уведомлений</div>
              <div
                v-for="item in notifications"
                :key="item.id"
                class="notif-item"
                :class="{ 'unread': !item.is_read }"
                @click="markRead(item)"
              >
                <div class="notif-title">{{ item.title }}</div>
                <div class="notif-msg">{{ item.message }}</div>
                <div class="notif-date">{{ new Date(item.created_at).toLocaleDateString() }}</div>
              </div>
            </div>
          </template>
          <a-badge :count="unreadCount" class="notif-badge">
            <bell-outlined style="font-size: 20px; cursor: pointer; color: #555;" />
          </a-badge>
        </a-popover>
        <!-- КОНЕЦ КОЛОКОЛЬЧИКА -->

        <a-dropdown>
          <a-button type="text" class="user-btn">
            <span style="margin-right: 5px;">{{ user.first_name || user.email }}</span> <down-outlined />
          </a-button>
          <template #overlay>
            <a-menu>
              <a-menu-item key="profile" @click="goToProfile">
                <user-outlined /> {{ user.role === 'employer' ? 'Кабинет компании' : 'Мой профиль' }}
              </a-menu-item>
              <a-menu-divider />
              <a-menu-item key="logout" @click="logout" danger>Выйти</a-menu-item>
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
import { ref, watch, onMounted, computed, h } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import api from '../axios'; // Не забудь импортировать api!
import {
  HomeOutlined, AppstoreOutlined, RobotOutlined, DownOutlined,
  LineChartOutlined, RocketTwoTone, BankOutlined, UserOutlined, BellOutlined
} from '@ant-design/icons-vue';

export default {
  components: { DownOutlined, RocketTwoTone, UserOutlined, BellOutlined },
  setup() {
    const router = useRouter();
    const route = useRoute();
    const current = ref(['home']);
    const user = ref(null);
    const menuItems = ref([]);

    // Уведомления
    const notifications = ref([]);

    // Считаем непрочитанные
    const unreadCount = computed(() => notifications.value.filter(n => !n.is_read).length);

    const loadNotifications = async () => {
      if (!user.value) return;
      try {
        const r = await api.get('/notifications');
        notifications.value = r.data;
      } catch (e) { console.error(e); }
    };

    const markRead = async (item) => {
      if (item.is_read) return;
      try {
        await api.post('/notifications/read', { id: item.id });
        item.is_read = true; // Обновляем локально
      } catch (e) {}
    };

    const checkUser = () => {
      const userData = localStorage.getItem('user');
      user.value = userData ? JSON.parse(userData) : null;
      const role = user.value?.role;

      const items = [
        { key: 'home', icon: () => h(HomeOutlined), label: 'Главная' },
        { key: 'vacancies', icon: () => h(AppstoreOutlined), label: 'Вакансии' },
      ];

      if (role === 'graduate') items.push({ key: 'chat', icon: () => h(RobotOutlined), label: 'AI Ассистент' });
      if (role === 'employer') items.push({ key: 'employer', icon: () => h(BankOutlined), label: 'Моя компания' });
      if (role === 'admin' || role === 'university_rep') items.push({ key: 'dashboard', icon: () => h(LineChartOutlined), label: 'Аналитика (Дашборд)' });

      menuItems.value = items;

      // Загружаем уведомления при старте
      loadNotifications();
    };

    onMounted(() => {
      checkUser();
      // Можно добавить поллинг (обновление) раз в 30 сек
      setInterval(loadNotifications, 30000);
    });

    watch(() => route.path, (path) => {
      if (path === '/') current.value = ['home'];
      else if (path.includes('vacancies')) current.value = ['vacancies'];
      else if (path.includes('chat')) current.value = ['chat'];
      else if (path.includes('dashboard')) current.value = ['dashboard'];
      else if (path.includes('employer')) current.value = ['employer'];
      else current.value = [];
    });

    const handleMenuClick = (e) => {
      if (e.key === 'home') router.push('/');
      if (e.key === 'vacancies') router.push('/vacancies');
      if (e.key === 'chat') router.push('/chat');
      if (e.key === 'dashboard') router.push('/dashboard');
      if (e.key === 'employer') router.push('/employer');
    };

    const goToProfile = () => {
      if (user.value.role === 'employer') router.push('/employer');
      else router.push('/profile');
    };

    const logout = () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      user.value = null;
      router.push('/login');
      setTimeout(() => window.location.reload(), 100);
    };

    return { current, menuItems, handleMenuClick, user, logout, goToProfile, notifications, unreadCount, markRead };
  }
};
</script>

<style scoped>
.navbar-wrapper { display: flex; align-items: center; justify-content: space-between; padding: 0 20px; background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.06); height: 64px; position: sticky; top: 0; z-index: 100; }
.logo { font-size: 1.2rem; font-weight: bold; color: #1890ff; cursor: pointer; margin-right: 40px; display: flex; align-items: center; }
.custom-menu { flex-grow: 1; border-bottom: none; line-height: 64px; }
.user-btn { color: #333; }
.auth-actions { display: flex; align-items: center; gap: 15px; }

/* Стили уведомлений */
.notif-badge { margin-right: 10px; }
.notif-list { width: 300px; max-height: 400px; overflow-y: auto; }
.notif-item { padding: 12px; border-bottom: 1px solid #f0f0f0; cursor: pointer; transition: 0.2s; }
.notif-item:hover { background: #fafafa; }
.notif-item.unread { background: #e6f7ff; }
.notif-title { font-weight: bold; color: #1890ff; margin-bottom: 4px; }
.notif-msg { font-size: 0.9em; color: #555; line-height: 1.4; }
.notif-date { font-size: 0.8em; color: #999; margin-top: 5px; text-align: right; }
.empty-notif { padding: 20px; text-align: center; color: #999; }
</style>