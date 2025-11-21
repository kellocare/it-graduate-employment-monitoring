<template>
  <div class="navbar-wrapper">
    <div class="logo" @click="$router.push('/')">
      <rocket-two-tone two-tone-color="#1890ff" style="font-size: 1.5rem; margin-right: 10px;" />
      IT-Monitoring
    </div>

    <a-menu v-model:selectedKeys="current" mode="horizontal" :items="menuItems" @click="handleMenuClick" class="custom-menu" />

    <div class="auth-actions">
      <template v-if="user">

        <!-- ИКОНКА СООБЩЕНИЙ (ОБНОВЛЕНО) -->
        <div class="icon-btn" @click="$router.push('/messages')" title="Сообщения">
           <a-badge :count="msgCount" :offset="[-5, 5]">
             <message-outlined style="font-size: 20px; color: #555;" />
           </a-badge>
        </div>

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
              >
                <div class="notif-header" @click="markRead(item)">
                   <div class="notif-title">{{ item.title }}</div>
                   <div class="notif-date">{{ new Date(item.created_at).toLocaleDateString() }}</div>
                </div>
                <div class="notif-msg" @click="markRead(item)">{{ item.message }}</div>

                <div v-if="item.type === 'invite' && !item.is_read" class="invite-actions">
                  <a-button type="primary" size="small" @click="respond(item, 'accepted')">Принять</a-button>
                  <a-button danger size="small" @click="respond(item, 'declined')">Отклонить</a-button>
                </div>
              </div>
            </div>
          </template>
          <a-badge :count="unreadCount" class="notif-badge">
            <bell-outlined style="font-size: 20px; cursor: pointer; color: #555;" />
          </a-badge>
        </a-popover>

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
import api from '../axios';
import { message } from 'ant-design-vue';
import {
  HomeOutlined, AppstoreOutlined, RobotOutlined, DownOutlined,
  LineChartOutlined, RocketTwoTone, BankOutlined, UserOutlined, BellOutlined, MessageOutlined
} from '@ant-design/icons-vue';

export default {
  components: { DownOutlined, RocketTwoTone, UserOutlined, BellOutlined, MessageOutlined },
  setup() {
    const router = useRouter();
    const route = useRoute();
    const current = ref(['home']);
    const user = ref(null);
    const menuItems = ref([]);

    const notifications = ref([]);
    const unreadCount = computed(() => notifications.value.filter(n => !n.is_read).length);
    const msgCount = ref(0); // <--- Новая переменная для сообщений

    const loadNotifications = async () => {
      if (!user.value) return;
      try {
        const r = await api.get('/notifications');
        notifications.value = r.data;
      } catch (e) { console.error(e); }
    };

    // Загрузка счетчика сообщений
    const loadMsgCount = async () => {
        if (!user.value) return;
        try {
            const r = await api.get('/messages/unread');
            msgCount.value = r.data.count;
        } catch (e) {}
    };

    const markRead = async (item) => {
      if (item.is_read) return;
      try {
        await api.post('/notifications/read', { id: item.id });
        item.is_read = true;
      } catch (e) {}
    };

    const respond = async (item, status) => {
      try {
        await api.post('/invites/respond', {
          notification_id: item.id,
          employer_id: item.sender_id,
          status: status
        });
        message.success(status === 'accepted' ? 'Приглашение принято! Чат создан.' : 'Приглашение отклонено');
        item.is_read = true;
        if (status === 'accepted') router.push('/messages');
      } catch (e) {
        message.error('Ошибка при отправке ответа');
      }
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

      loadNotifications();
      loadMsgCount(); // <--- Вызов
    };

    onMounted(() => {
      checkUser();
      setInterval(() => {
          loadNotifications();
          loadMsgCount();
      }, 10000); // Каждые 10 сек
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

    return { current, menuItems, handleMenuClick, user, logout, goToProfile, notifications, unreadCount, markRead, respond, msgCount };
  }
};
</script>

<style scoped>
.navbar-wrapper { display: flex; align-items: center; justify-content: space-between; padding: 0 20px; background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.06); height: 64px; position: sticky; top: 0; z-index: 100; }
.logo { font-size: 1.2rem; font-weight: bold; color: #1890ff; cursor: pointer; margin-right: 40px; display: flex; align-items: center; }
.custom-menu { flex-grow: 1; border-bottom: none; line-height: 64px; }
.user-btn { color: #333; }
.auth-actions { display: flex; align-items: center; gap: 15px; }

.icon-btn { cursor: pointer; padding: 5px; transition: 0.2s; }
.icon-btn:hover { opacity: 0.7; }

.notif-badge { margin-right: 10px; }
.notif-list { width: 320px; max-height: 400px; overflow-y: auto; }
.notif-item { padding: 12px; border-bottom: 1px solid #f0f0f0; cursor: pointer; transition: 0.2s; }
.notif-item:hover { background: #fafafa; }
.notif-item.unread { background: #e6f7ff; }
.notif-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px; }
.notif-title { font-weight: bold; color: #1890ff; font-size: 0.95em; }
.notif-date { font-size: 0.75em; color: #999; white-space: nowrap; margin-left: 10px; }
.notif-msg { font-size: 0.9em; color: #555; line-height: 1.4; }
.empty-notif { padding: 20px; text-align: center; color: #999; }
.invite-actions { margin-top: 10px; display: flex; gap: 10px; justify-content: flex-end; }
</style>