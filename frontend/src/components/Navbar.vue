<template>
  <nav
    class="sidebar"
    :class="{ 'expanded': isExpanded }"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  >

    <!-- ЛОГОТИП -->
    <div class="logo-wrapper">
      <div class="logo-box"><rocket-filled /></div>

      <transition name="fade">
        <span v-if="isExpanded" class="logo-text">IT Monitor</span>
      </transition>

      <!-- КНОПКА ЗАКРЕПА -->
      <transition name="fade">
        <div
          v-if="isExpanded && user"
          class="pin-btn"
          :class="{ 'active': isPinned }"
          @click.stop="togglePin"
          title="Закрепить меню"
        >
          <pushpin-filled v-if="isPinned" />
          <pushpin-outlined v-else />
        </div>
      </transition>
    </div>

    <!-- 1. ЕСЛИ АВТОРИЗОВАН -->
    <template v-if="user">
      <!-- МЕНЮ -->
      <div class="menu-items">
        <router-link
          v-for="item in menuItems"
          :key="item.path"
          :to="item.path"
          class="nav-item"
          active-class="active"
        >
          <component :is="item.icon" class="nav-icon" />
          <transition name="fade">
            <span v-if="isExpanded" class="nav-text">{{ item.name }}</span>
          </transition>
        </router-link>
      </div>

      <!-- НИЖНЯЯ СЕКЦИЯ -->
      <div class="bottom-section">
        <div class="nav-item action-btn" @click="$router.push('/messages')" title="Сообщения">
          <div class="icon-container">
             <message-outlined class="nav-icon" />
             <div v-if="msgCount > 0" class="badge-dot">{{ msgCount > 9 ? '9+' : msgCount }}</div>
          </div>
          <transition name="fade"><span v-if="isExpanded" class="nav-text">Сообщения</span></transition>
        </div>

        <a-popover
          placement="rightBottom"
          trigger="click"
          overlayClassName="cyber-popover"
          :arrowPointAtCenter="true"
        >
          <template #content>
              <div class="notif-list custom-scroll">
                <div v-if="notifications.length === 0" class="empty-notif">Нет новых уведомлений</div>
                <div v-for="item in notifications" :key="item.id" class="notif-item" :class="{ 'unread': !item.is_read }">
                  <div class="notif-header" @click="markRead(item)">
                     <div class="notif-title">{{ item.title }}</div>
                     <div class="notif-date">{{ new Date(item.created_at).toLocaleDateString() }}</div>
                  </div>
                  <div class="notif-msg" @click="markRead(item)">{{ item.message }}</div>
                  <div v-if="item.type === 'invite' && !item.is_read" class="invite-actions">
                    <button class="btn-accept" @click="respond(item, 'accepted')">Принять</button>
                    <button class="btn-decline" @click="respond(item, 'declined')">Отклонить</button>
                  </div>
                </div>
              </div>
          </template>

          <div class="nav-item action-btn" title="Уведомления">
            <div class="icon-container">
               <bell-outlined class="nav-icon" />
               <div v-if="unreadCount > 0" class="badge-dot">{{ unreadCount > 9 ? '9+' : unreadCount }}</div>
            </div>
            <transition name="fade"><span v-if="isExpanded" class="nav-text">Уведомления</span></transition>
          </div>
        </a-popover>

        <div class="nav-item logout-btn" @click="logout">
          <logout-outlined class="nav-icon" />
          <transition name="fade"><span v-if="isExpanded" class="nav-text">Выход</span></transition>
        </div>
      </div>
    </template>

    <!-- 2. ЕСЛИ ГОСТЬ -->
    <template v-else>
      <div class="menu-items">
        <router-link to="/login" class="nav-item" active-class="active">
          <login-outlined class="nav-icon" />
          <transition name="fade">
            <span v-if="isExpanded" class="nav-text">Войти</span>
          </transition>
        </router-link>
      </div>
    </template>

  </nav>
</template>

<script>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import api from '../axios';
import { message } from 'ant-design-vue';
import {
  RocketFilled, HomeOutlined, SolutionOutlined, CompassOutlined,
  RobotOutlined, UserOutlined, LogoutOutlined, MessageOutlined, BellOutlined,
  TeamOutlined, SafetyCertificateOutlined,
  PushpinOutlined, PushpinFilled,
  LoginOutlined, BankOutlined, FileTextOutlined // 🔥 Добавлена иконка отчетов
} from '@ant-design/icons-vue';

export default {
  name: 'Navbar',
  components: {
    RocketFilled, HomeOutlined, SolutionOutlined, CompassOutlined,
    RobotOutlined, UserOutlined, LogoutOutlined, MessageOutlined, BellOutlined,
    TeamOutlined, SafetyCertificateOutlined, PushpinOutlined, PushpinFilled,
    LoginOutlined, BankOutlined, FileTextOutlined // 🔥
  },
  setup() {
    const isHovered = ref(false);
    const isPinned = ref(localStorage.getItem('navbarPinned') === 'true');
    const router = useRouter();
    const notifications = ref([]);
    const msgCount = ref(0);
    const user = ref(null);

    const isExpanded = computed(() => {
      if (!user.value) return isHovered.value;
      return isHovered.value || isPinned.value;
    });

    const togglePin = () => {
      if (!user.value) return;
      isPinned.value = !isPinned.value;
      localStorage.setItem('navbarPinned', isPinned.value);
    };

    const menuItems = computed(() => {
      if (!user.value) return [];

      const role = user.value.role;
      const items = [{path: '/', name: 'Главная', icon: 'HomeOutlined'}];

      if (role === 'graduate') {
        items.push(
            {path: '/vacancies', name: 'Вакансии', icon: 'SolutionOutlined'},
            {path: '/roadmap', name: 'Roadmap', icon: 'CompassOutlined'},
            {path: '/chat', name: 'AI Ассистент', icon: 'RobotOutlined'}
        );
      } else if (role === 'employer') {
        items.push(
            {path: '/vacancies', name: 'Вакансии', icon: 'SolutionOutlined'},
            {path: '/employer', name: 'Моя компания', icon: 'TeamOutlined'}
        );
      } else if (role === 'university_staff') {
         // 🔥 ОБНОВЛЕННЫЙ СПИСОК ДЛЯ ВУЗА
         items.push(
            {path: '/university/dashboard', name: 'Дашборд', icon: 'BankOutlined'},
            {path: '/university/students', name: 'Студенты', icon: 'TeamOutlined'},
            {path: '/university/reports', name: 'Отчеты', icon: 'FileTextOutlined'} // <--- НОВАЯ КНОПКА
         );
      } else if (role === 'admin') {
        items.push(
            {path: '/admin', name: 'Админ панель', icon: 'SafetyCertificateOutlined'}
        );
      }
      items.push({path: '/profile', name: 'Профиль', icon: 'UserOutlined'});
      return items;
    });

    const unreadCount = computed(() => notifications.value.filter(n => !n.is_read).length);

    const logout = () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      user.value = null;
      router.push('/login');
    };

    const loadData = async () => {
      const u = localStorage.getItem('user');
      if (!u) {
        user.value = null;
        return;
      }
      user.value = JSON.parse(u);

      try {
        const [notifRes, msgRes] = await Promise.all([
          api.get('/notifications'),
          api.get('/messages/unread')
        ]);
        notifications.value = notifRes.data;
        msgCount.value = msgRes.data.count;
      } catch (e) {
        console.error(e);
      }
    };

    const markRead = async (item) => {
      if (item.is_read) return;
      try {
        await api.post('/notifications/read', {id: item.id});
        item.is_read = true;
      } catch (e) {}
    };

    const respond = async (item, status) => {
      try {
        await api.post('/invites/respond', {notification_id: item.id, employer_id: item.sender_id, status: status});
        message.success(status === 'accepted' ? 'Чат создан!' : 'Отклонено');
        item.is_read = true;
        if (status === 'accepted') router.push('/messages');
      } catch (e) {
        message.error('Ошибка');
      }
    };

    onMounted(() => {
      loadData();
      setInterval(loadData, 10000);
    });

    return {
      isHovered, isPinned, isExpanded, togglePin,
      logout, notifications, msgCount, unreadCount, markRead, respond, menuItems, user
    };
  }
}
</script>

<style>
.cyber-popover .ant-popover-inner {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
  padding: 0;
  overflow: hidden;
}
.cyber-popover .ant-popover-arrow { display: none; }
</style>

<style scoped>
/* Sidebar */
.sidebar {
  position: fixed; top: 0; left: 0; height: 100vh; width: 80px;
  background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(20px);
  border-right: 1px solid rgba(255, 255, 255, 0.6);
  box-shadow: 5px 0 25px rgba(0, 0, 0, 0.03); z-index: 1000;
  display: flex; flex-direction: column; padding: 20px 12px;
  transition: width 0.4s cubic-bezier(0.2, 0.8, 0.2, 1); overflow: hidden;
}
.sidebar.expanded { width: 260px; padding: 20px 15px; }

/* Logo */
.logo-wrapper {
  height: 50px; display: flex; align-items: center; margin-bottom: 30px; position: relative; justify-content: center; width: 100%; flex-shrink: 0;
}
.sidebar.expanded .logo-wrapper { justify-content: flex-start; padding-left: 5px; }
.logo-box {
  width: 44px; height: 44px; min-width: 44px;
  background: linear-gradient(135deg, #6366f1, #a855f7); border-radius: 14px;
  display: flex; align-items: center; justify-content: center; color: white; font-size: 1.4rem;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
}
.logo-text {
  margin-left: 15px; font-size: 1.3rem; font-weight: 800;
  background: linear-gradient(135deg, #1f2937, #4b5563);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; white-space: nowrap;
}

/* Pin Btn */
.pin-btn {
  position: absolute; right: 0; top: 50%; transform: translateY(-50%);
  width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
  border-radius: 8px; cursor: pointer; color: #9ca3af; transition: all 0.2s;
}
.pin-btn:hover { background: rgba(0, 0, 0, 0.05); color: #6366f1; }
.pin-btn.active { color: #6366f1; background: rgba(99, 102, 241, 0.1); }

/* Menu */
.menu-items { flex: 1; display: flex; flex-direction: column; gap: 10px; width: 100%; overflow-y: auto; overflow-x: hidden; }
.menu-items::-webkit-scrollbar { width: 0; }
.nav-item {
  position: relative; height: 50px; width: 100%;
  display: flex; align-items: center; justify-content: center;
  border-radius: 14px; text-decoration: none; color: #6b7280;
  transition: all 0.3s ease; cursor: pointer; flex-shrink: 0;
}
.sidebar.expanded .nav-item { justify-content: flex-start; padding-left: 14px; }
.nav-icon { font-size: 1.4rem; transition: transform 0.2s; }
.nav-text { margin-left: 16px; font-weight: 600; font-size: 1rem; white-space: nowrap; color: #4b5563; }
.nav-item:hover { background: rgba(99, 102, 241, 0.08); color: #6366f1; }
.nav-item:hover .nav-icon { transform: scale(1.1); }
.nav-item.active { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; box-shadow: 0 8px 20px rgba(99, 102, 241, 0.3); }
.nav-item.active .nav-text { color: white; }

/* Bottom */
.bottom-section { margin-top: auto; width: 100%; border-top: 1px solid rgba(0, 0, 0, 0.06); padding-top: 10px; display: flex; flex-direction: column; gap: 5px; flex-shrink: 0; }
.action-btn { color: #4b5563; }
.logout-btn:hover { background: #fee2e2; color: #ef4444; }
.logout-btn:hover .nav-text { color: #ef4444; }
.icon-container { position: relative; display: flex; align-items: center; justify-content: center; }
.badge-dot { position: absolute; top: -5px; right: -5px; background: #ef4444; color: white; font-size: 0.7rem; font-weight: 700; min-width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; }

/* Notif */
.notif-list { width: 320px; max-height: 400px; overflow-y: auto; padding: 10px 0; }
.notif-item { padding: 12px 20px; border-bottom: 1px solid #f3f4f6; cursor: pointer; transition: 0.2s; }
.notif-item:hover { background: #f9fafb; }
.notif-item.unread { background: #eff6ff; }
.notif-header { display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 4px; }
.notif-title { font-weight: 700; color: #1f2937; }
.notif-date { color: #9ca3af; font-size: 0.75rem; }
.notif-msg { font-size: 0.9rem; color: #4b5563; line-height: 1.4; }
.empty-notif { padding: 20px; text-align: center; color: #9ca3af; }
.invite-actions { display: flex; gap: 8px; margin-top: 10px; justify-content: flex-end; }
.btn-accept { background: #10b981; color: white; border: none; padding: 4px 12px; border-radius: 6px; cursor: pointer; font-size: 0.8rem; font-weight: 600; }
.btn-decline { background: #fee2e2; color: #ef4444; border: none; padding: 4px 12px; border-radius: 6px; cursor: pointer; font-size: 0.8rem; font-weight: 600; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease 0.1s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.custom-scroll::-webkit-scrollbar { width: 4px; }
.custom-scroll::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 2px; }
</style>