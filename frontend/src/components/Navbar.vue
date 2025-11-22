<template>
  <div class="navbar-wrapper" :class="{ 'scrolled': isScrolled }">
    <div class="navbar-container">
      <!-- Логотип -->
      <div class="logo" @click="$router.push('/')">
        <div class="logo-icon">
          <rocket-filled />
        </div>
        <span class="logo-text">IT-Monitoring</span>
      </div>

      <!-- Меню -->
      <div class="nav-menu">
        <a-menu v-model:selectedKeys="current" mode="horizontal" :items="menuItems" @click="handleMenuClick" class="custom-menu" />
      </div>

      <!-- Правая часть -->
      <div class="auth-actions">
        <template v-if="user">

          <!-- Иконка сообщений -->
          <div class="icon-btn" @click="$router.push('/messages')" title="Сообщения">
             <a-badge :count="msgCount" :offset="[-2, 2]" color="#764ba2">
               <message-filled style="font-size: 22px; color: #4a5568;" />
             </a-badge>
          </div>

          <!-- Уведомления -->
          <a-popover trigger="click" placement="bottomRight" overlayClassName="notif-popover">
            <template #content>
              <div class="notif-list">
                <div v-if="notifications.length === 0" class="empty-notif">
                  <smile-outlined style="font-size: 24px; color: #cbd5e0;" />
                  <p>Нет новых уведомлений</p>
                </div>
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
            <a-badge :count="unreadCount" class="notif-badge" color="#f56565">
              <bell-filled style="font-size: 22px; cursor: pointer; color: #4a5568;" />
            </a-badge>
          </a-popover>

          <!-- Профиль -->
          <a-dropdown placement="bottomRight">
            <div class="user-profile-btn">
              <!-- АВАТАР: Если есть URL - картинка, иначе - буква -->
              <a-avatar
                :size="36"
                :src="avatarUrl"
                style="background-color: #667eea; vertical-align: middle;"
              >
                <template v-if="!avatarUrl">
                  {{ (user.first_name || user.email)[0].toUpperCase() }}
                </template>
              </a-avatar>

              <span class="user-name">{{ user.first_name || 'Пользователь' }}</span>
              <down-outlined style="font-size: 10px; color: #718096;" />
            </div>

            <template #overlay>
              <a-menu class="profile-menu">
                <a-menu-item key="profile" @click="goToProfile">
                  <user-outlined /> {{ user.role === 'employer' ? 'Кабинет компании' : 'Мой профиль' }}
                </a-menu-item>
                <a-menu-divider />
                <a-menu-item key="logout" @click="logout" style="color: #e53e3e;">
                  <logout-outlined /> Выйти
                </a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
        </template>

        <template v-else>
          <a-button type="text" @click="$router.push('/login')" class="btn-login">Войти</a-button>
          <a-button type="primary" shape="round" @click="$router.push('/login')" class="btn-signup">Регистрация</a-button>
        </template>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, watch, onMounted, computed, h, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import api from '../axios';
import { message } from 'ant-design-vue';
import {
  HomeFilled, AppstoreFilled, RobotFilled, DownOutlined,
  LineChartOutlined, RocketFilled, BankFilled, UserOutlined,
  BellFilled, MessageFilled, SmileOutlined, LogoutOutlined
} from '@ant-design/icons-vue';

export default {
  components: {
    DownOutlined, RocketFilled, UserOutlined, BellFilled, MessageFilled,
    SmileOutlined, LogoutOutlined
  },
  setup() {
    const router = useRouter();
    const route = useRoute();
    const current = ref(['home']);
    const user = ref(null);
    const avatarUrl = ref(null); // Отдельная переменная для аватара
    const menuItems = ref([]);
    const isScrolled = ref(false);

    const notifications = ref([]);
    const unreadCount = computed(() => notifications.value.filter(n => !n.is_read).length);
    const msgCount = ref(0);

    const handleScroll = () => { isScrolled.value = window.scrollY > 20; };

    const loadNotifications = async () => {
      if (!user.value) return;
      try { const r = await api.get('/notifications'); notifications.value = r.data; } catch (e) {}
    };

    const loadMsgCount = async () => {
      if (!user.value) return;
      try { const r = await api.get('/messages/unread'); msgCount.value = r.data.count; } catch (e) {}
    };

    // ЗАГРУЗКА СВЕЖЕГО ПРОФИЛЯ (ДЛЯ АВАТАРА)
    const fetchUserProfile = async () => {
        if (!user.value) return;
        // Если это студент, грузим профиль, чтобы взять аватар
        if (user.value.role === 'graduate') {
            try {
                const r = await api.get('/graduates/me');
                if (r.data && r.data.avatar_url) {
                    avatarUrl.value = `http://localhost:4000${r.data.avatar_url}`;
                }
            } catch (e) {}
        }
        // Если работодатель, можно загрузить лого компании, но пока оставим дефолт
    };

    const markRead = async (item) => {
      if (item.is_read) return;
      try { await api.post('/notifications/read', { id: item.id }); item.is_read = true; } catch (e) {}
    };

    const respond = async (item, status) => {
      try {
        await api.post('/invites/respond', { notification_id: item.id, employer_id: item.sender_id, status: status });
        message.success(status === 'accepted' ? 'Приглашение принято!' : 'Приглашение отклонено');
        item.is_read = true;
        if (status === 'accepted') router.push('/messages');
      } catch (e) { message.error('Ошибка'); }
    };

    const checkUser = () => {
      const userData = localStorage.getItem('user');
      user.value = userData ? JSON.parse(userData) : null;

      if (!user.value) return;

      const role = user.value.role;

      const items = [
        { key: 'home', icon: () => h(HomeFilled), label: 'Главная' },
        { key: 'vacancies', icon: () => h(AppstoreFilled), label: 'Вакансии' },
      ];

      if (role === 'graduate') items.push({ key: 'chat', icon: () => h(RobotFilled), label: 'AI Ассистент' });
      if (role === 'employer') items.push({ key: 'employer', icon: () => h(BankFilled), label: 'Моя компания' });
      if (role === 'admin' || role === 'university_rep') items.push({ key: 'dashboard', icon: () => h(LineChartOutlined), label: 'Аналитика' });

      menuItems.value = items;

      loadNotifications();
      loadMsgCount();
      fetchUserProfile(); // <--- Загружаем аватарку
    };

    onMounted(() => {
      checkUser();
      window.addEventListener('scroll', handleScroll);
      setInterval(() => { loadNotifications(); loadMsgCount(); }, 10000);
    });

    onUnmounted(() => {
      window.removeEventListener('scroll', handleScroll);
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

    return { current, menuItems, handleMenuClick, user, logout, goToProfile, notifications, unreadCount, markRead, respond, msgCount, isScrolled, avatarUrl };
  }
};
</script>

<style scoped>
.navbar-wrapper {
  position: sticky; top: 0; z-index: 1000; width: 100%;
  background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.3);
  transition: all 0.3s ease;
}
.navbar-wrapper.scrolled { background: rgba(255, 255, 255, 0.95); box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); }

.navbar-container { max-width: 1200px; margin: 0 auto; height: 70px; display: flex; align-items: center; justify-content: space-between; padding: 0 20px; }

.logo { display: flex; align-items: center; cursor: pointer; gap: 10px; }
.logo-icon { width: 36px; height: 36px; background: var(--primary-gradient); border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; font-size: 20px; box-shadow: 0 4px 10px rgba(118, 75, 162, 0.3); }
.logo-text { font-size: 1.2rem; font-weight: 800; background: var(--primary-gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent; letter-spacing: -0.5px; }

.nav-menu { flex: 1; display: flex; justify-content: center; }
.custom-menu { background: transparent; border-bottom: none; font-weight: 500; width: auto; }

.auth-actions { display: flex; align-items: center; gap: 20px; }
.icon-btn { cursor: pointer; transition: transform 0.2s; }
.icon-btn:hover { transform: scale(1.1); }

.user-profile-btn { display: flex; align-items: center; gap: 10px; cursor: pointer; padding: 5px 10px; border-radius: 20px; transition: background 0.2s; }
.user-profile-btn:hover { background: rgba(0, 0, 0, 0.03); }
.user-name { font-weight: 600; color: #4a5568; }

.btn-login { color: #4a5568; font-weight: 600; }
.btn-signup { font-weight: 600; padding: 0 25px; height: 38px; }

/* Стили уведомлений */
.notif-list { width: 320px; max-height: 400px; overflow-y: auto; }
.notif-item { padding: 15px; border-bottom: 1px solid #f0f0f0; cursor: pointer; transition: background 0.2s; }
.notif-item:hover { background: #f7fafc; }
.notif-item.unread { background: #ebf8ff; border-left: 3px solid #4299e1; }
.notif-title { font-weight: 700; color: #2d3748; margin-bottom: 4px; }
.notif-msg { font-size: 0.9em; color: #718096; line-height: 1.4; }
.notif-date { font-size: 0.75em; color: #a0aec0; margin-top: 8px; text-align: right; }
.empty-notif { padding: 30px; text-align: center; color: #a0aec0; display: flex; flex-direction: column; align-items: center; gap: 10px; }
.invite-actions { margin-top: 10px; display: flex; gap: 10px; justify-content: flex-start; }
</style>