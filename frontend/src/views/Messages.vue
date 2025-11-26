<template>
  <div class="page-wrapper">

    <!-- ФОН (Пузыри) -->
    <div class="blobs-container">
      <div class="blob blob-1"></div>
      <div class="blob blob-2"></div>
      <div class="blob blob-3"></div>
    </div>

    <!-- ОСНОВНОЙ КОНТЕЙНЕР -->
    <div class="messenger-container">
      <div class="messenger-layout glass-effect">

        <!-- ЛЕВАЯ КОЛОНКА: СПИСОК -->
        <div class="sidebar">
          <div class="sidebar-header">
            <h3>Сообщения</h3>
          </div>

          <div class="chats-list custom-scroll">
            <div v-if="conversations.length === 0" class="empty-chats">
              <span style="opacity: 0.6">Нет активных диалогов</span>
            </div>

            <div
              v-for="chat in conversations"
              :key="chat.user_id + '_' + chat.vacancy_id"
              class="chat-item"
              :class="{ active: activeChat && activeChat.user_id === chat.user_id && activeChat.vacancy_id === chat.vacancy_id }"
              @click="selectChat(chat)"
            >
              <div class="avatar-wrapper">
                <a-avatar :size="48" :src="getAvatarUrl(chat.avatar_url)"
                          :style="{ backgroundColor: stringToColor(chat.name || chat.email), fontSize: '18px' }">
                  <template #icon><user-outlined/></template>
                </a-avatar>
              </div>

              <div class="chat-info">
                <div class="chat-top">
                  <div class="chat-name">
                    <span v-if="chat.role === 'admin'" class="admin-badge">🛡️ Admin</span>
                    <span v-else>{{ chat.name || chat.email }}</span>
                  </div>
                  <div class="chat-time">{{ formatTime(chat.created_at) }}</div>
                </div>

                <div class="chat-vacancy-tag" v-if="chat.vacancy_title">
                  {{ chat.vacancy_title }}
                </div>

                <div class="chat-bottom">
                  <div class="chat-preview">
                    {{ stripMarkdown(chat.last_message) }}
                  </div>
                  <div v-if="chat.unread_count > 0" class="unread-badge">
                    {{ chat.unread_count }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ПРАВАЯ КОЛОНКА: ЧАТ -->
        <div class="chat-main">
          <template v-if="activeChat">

            <!-- ХЕДЕР -->
            <div class="chat-header">
              <div class="header-info" @click="openProfileModal" style="cursor: pointer">
                <div class="header-title">
                  <span v-if="activeChat.role === 'admin'" style="color: #ef4444;">🛡️ Администратор</span>
                  <span v-else>{{ activeChat.name || activeChat.email }}</span>
                </div>
                <div class="header-subtitle" v-if="activeChat.vacancy_title">
                  <tag-outlined class="icon-small"/> {{ activeChat.vacancy_title }}
                </div>
              </div>

              <!-- КНОПКИ ДЕЙСТВИЙ -->
              <div class="header-actions">

                <!-- 🔥 1. ПРОФИЛЬ (НОВОЕ) -->
                <a-tooltip title="Информация о пользователе" placement="bottom">
                  <button class="action-btn btn-gray" @click="openProfileModal">
                    <info-circle-outlined />
                  </button>
                </a-tooltip>

                <!-- 2. Сдать решение -->
                <a-tooltip title="Отправить решение" placement="bottom">
                  <button v-if="canSendSolution" class="action-btn btn-indigo" @click="showSolutionModal = true">
                    <paper-clip-outlined/>
                  </button>
                </a-tooltip>

                <!-- 3. Календарь -->
                <a-tooltip title="Назначить интервью" placement="bottom">
                  <button v-if="currentUser && currentUser.role === 'employer'" class="action-btn btn-emerald" @click="showCalendarModal = true">
                    <calendar-outlined/>
                  </button>
                </a-tooltip>

                <!-- 4. Видео -->
                <a-tooltip title="Видеозвонок" placement="bottom">
                  <button v-if="currentUser && currentUser.role !== 'admin'" class="action-btn btn-rose" @click="startVideoCall">
                    <video-camera-outlined/>
                  </button>
                </a-tooltip>

              </div>
            </div>

            <!-- ОБЛАСТЬ СООБЩЕНИЙ -->
            <div class="messages-area custom-scroll" ref="messagesContainer">
              <div v-if="messages.length === 0" class="no-messages-placeholder">
                Напишите первое сообщение...
              </div>

              <div v-for="(msg, index) in messages" :key="index"
                   class="message-row"
                   :class="msg.sender_id === currentUser.id ? 'row-me' : 'row-them'"
              >
                <div class="message-bubble">
                  <div class="msg-content" v-html="formatMessage(msg.content)"></div>

                  <div v-if="msg.vacancy_id && msg.sender_id !== currentUser.id && currentUser.role === 'employer' && activeChat.role === 'admin'"
                       class="system-card">
                    <warning-outlined class="sys-icon"/>
                    <div>
                      <div class="sys-title">Модерация</div>
                      <button class="sys-btn" @click="openEditModal(msg.vacancy_id)">Исправить</button>
                    </div>
                  </div>

                  <div class="msg-meta">
                    {{ formatTime(msg.created_at) }}
                    <check-outlined v-if="msg.sender_id === currentUser.id" class="read-icon"/>
                  </div>
                </div>
              </div>
            </div>

            <!-- ПОЛЕ ВВОДА -->
            <div class="input-wrapper">
              <div class="input-container">
                <a-textarea
                    v-model:value="newMessage"
                    :auto-size="{ minRows: 1, maxRows: 4 }"
                    placeholder="Напишите сообщение..."
                    @pressEnter.prevent="sendMessage"
                    class="modern-textarea"
                />
                <button class="send-btn" @click="sendMessage" :disabled="!newMessage.trim()">
                  <send-outlined/>
                </button>
              </div>
            </div>

          </template>

          <template v-else>
            <div class="empty-state">
              <div class="empty-circle">
                <message-outlined />
              </div>
              <h3>Выберите чат</h3>
              <p>Список ваших диалогов находится слева</p>
            </div>
          </template>
        </div>

      </div>
    </div>

    <!-- === 🔥 МОДАЛКА ПРОФИЛЯ (НОВАЯ) === -->
    <a-modal v-model:open="showProfileModalState" :footer="null" width="500px" centered class="profile-modal">
      <div v-if="userProfile" class="profile-card-content">
        <!-- Обложка -->
        <div class="profile-cover"></div>

        <!-- Аватар и инфо -->
        <div class="profile-main-info">
          <div class="profile-avatar-large">
             <a-avatar :size="100" :src="getAvatarUrl(userProfile.avatar_url)"
                       :style="{ backgroundColor: stringToColor(userProfile.name || userProfile.email) }">
                <template #icon><user-outlined style="font-size: 40px"/></template>
             </a-avatar>
          </div>
          <h2 class="profile-name">{{ userProfile.name || userProfile.email }}</h2>
          <p class="profile-role">{{ getRoleName(userProfile.role) }}</p>
          <div v-if="userProfile.city" class="profile-location">
             <environment-outlined /> {{ userProfile.city }}
          </div>
        </div>

        <a-divider style="margin: 15px 0" />

        <!-- Навыки (если есть) -->
        <div v-if="userProfile.skills && userProfile.skills.length > 0" class="profile-section">
           <h4>Навыки</h4>
           <div class="skills-row">
              <span v-for="skill in userProfile.skills.slice(0, 5)" :key="skill" class="skill-pill">{{ skill }}</span>
              <span v-if="userProfile.skills.length > 5" class="skill-more">+{{ userProfile.skills.length - 5 }}</span>
           </div>
        </div>

        <!-- О себе -->
        <div class="profile-section" v-if="userProfile.about_me">
           <h4>О себе</h4>
           <p class="bio-text">{{ userProfile.about_me }}</p>
        </div>

        <!-- Кнопка перехода -->
        <div class="profile-actions">
           <a-button type="primary" block shape="round" size="large" @click="goToFullProfile">
              <idcard-outlined /> Открыть полный профиль
           </a-button>
        </div>
      </div>
      <div v-else class="loading-profile">
         <loading-outlined spin /> Загрузка профиля...
      </div>
    </a-modal>

    <!-- Остальные модалки -->
    <a-modal v-model:open="showSolutionModal" title="Отправка решения" ok-text="Отправить" cancel-text="Отмена" @ok="submitSolution" :confirm-loading="uploading" centered>
       <a-form layout="vertical">
        <a-alert message="Важно" description="AI проверит решение автоматически." type="info" show-icon class="mb-20"/>
        <a-form-item label="Комментарий"><a-textarea v-model:value="solutionDesc" rows="4" /></a-form-item>
        <a-form-item label="Файл"><a-upload :file-list="fileList" :before-upload="beforeUpload" @remove="handleRemove" max-count="1"><a-button><upload-outlined/> Загрузить</a-button></a-upload></a-form-item>
      </a-form>
    </a-modal>

    <a-modal v-model:open="showCalendarModal" title="Назначить интервью" ok-text="Назначить" @ok="scheduleInterview" centered>
      <a-form layout="vertical">
        <a-form-item label="Дата"><input type="datetime-local" v-model="interviewDate" class="date-input"/></a-form-item>
        <a-form-item label="Ссылка"><div style="display:flex; gap:10px"><a-input v-model:value="interviewLink"/><a-button @click="generateInternalLink">Сгенерировать</a-button></div></a-form-item>
      </a-form>
    </a-modal>

    <EditVacancyModal v-if="editingVacancyId" :vacancyId="editingVacancyId" @close="editingVacancyId = null" @saved="onVacancySaved"/>
  </div>
</template>

<script>
import api from '../axios';
import {marked} from 'marked';
import {message} from 'ant-design-vue';
import {nextTick} from 'vue';
import EditVacancyModal from '../components/EditVacancyModal.vue';

import {
  UserOutlined, SendOutlined, MessageOutlined,
  VideoCameraOutlined, UploadOutlined, TagOutlined,
  PaperClipOutlined, WarningOutlined, EditOutlined,
  SafetyCertificateFilled, CheckOutlined, FileDoneOutlined, CalendarOutlined,
  InfoCircleOutlined, IdcardOutlined, EnvironmentOutlined, LoadingOutlined // 🔥 Новые иконки
} from '@ant-design/icons-vue';

export default {
  components: {
    EditVacancyModal, UserOutlined, SendOutlined, MessageOutlined,
    VideoCameraOutlined, UploadOutlined, TagOutlined,
    PaperClipOutlined, WarningOutlined, EditOutlined,
    SafetyCertificateFilled, CheckOutlined, FileDoneOutlined, CalendarOutlined,
    InfoCircleOutlined, IdcardOutlined, EnvironmentOutlined, LoadingOutlined
  },
  data() {
    return {
      currentUser: null,
      conversations: [],
      activeChat: null,
      messages: [],
      newMessage: '',
      pollingInterval: null,
      showSolutionModal: false,
      solutionDesc: '',
      fileList: [],
      uploading: false,
      editingVacancyId: null,
      showCalendarModal: false,
      interviewDate: '',
      interviewLink: '',
      solutionSubmittedLocal: false,

      // 🔥 Данные для профиля
      showProfileModalState: false,
      userProfile: null
    };
  },
  computed: {
    canSendSolution() {
      if (!this.currentUser || this.currentUser.role !== 'graduate' || !this.activeChat) return false;
      if (this.solutionSubmittedLocal) return false;
      const hasTask = this.messages.some(m => m.sender_id !== this.currentUser.id && (m.content.includes('ЗАДАНИЕ') || m.content.includes('Task')));
      const sent = this.messages.some(m => m.sender_id === this.currentUser.id && (m.content.includes('отправил решение') || m.content.includes('Solution sent')));
      return hasTask && !sent;
    }
  },
  async mounted() {
    const userData = localStorage.getItem('user');
    if (userData) this.currentUser = JSON.parse(userData);

    await this.loadConversations();

    this.pollingInterval = setInterval(() => {
      if (this.activeChat) {
        this.loadMessages(this.activeChat.user_id, this.activeChat.vacancy_id, false);
      }
      this.loadConversations();
    }, 3000);
  },
  beforeUnmount() {
    if (this.pollingInterval) clearInterval(this.pollingInterval);
  },
  methods: {
    async loadConversations() {
      try {
        const r = await api.get('/messages/conversations');
        this.conversations = r.data;
      } catch (e) {
        console.error(e);
      }
    },
    async selectChat(chat) {
      chat.unread_count = 0;
      this.activeChat = chat;
      this.solutionSubmittedLocal = false;
      await this.loadMessages(chat.user_id, chat.vacancy_id, true);
    },
    async loadMessages(partnerId, vacancyId, scroll = false) {
      try {
        const r = await api.get(`/messages/${partnerId}`, {params: {vacancy_id: vacancyId}});
        if (JSON.stringify(r.data) !== JSON.stringify(this.messages)) {
          this.messages = r.data;
          if (scroll) this.scrollToBottom();
        }
      } catch (e) {
        console.error(e);
      }
    },
    async sendMessage() {
      if (!this.newMessage.trim()) return;
      const text = this.newMessage;
      this.newMessage = '';
      this.messages.push({sender_id: this.currentUser.id, content: text, created_at: new Date().toISOString()});
      this.scrollToBottom();
      try {
        await api.post('/messages/send', {
          receiver_id: this.activeChat.user_id,
          content: text,
          vacancy_id: this.activeChat.vacancy_id
        });
        await this.loadConversations();
      } catch (e) {
        console.error('Ошибка отправки');
      }
    },
    // 🔥 НОВЫЙ МЕТОД: ОТКРЫТИЕ ПРОФИЛЯ
    async openProfileModal() {
        if(!this.activeChat) return;
        this.showProfileModalState = true;
        this.userProfile = null; // Сброс перед загрузкой

        try {
            // Попытка получить расширенные данные (если есть такой роут)
            // Можно адаптировать под ваш API, например /users/:id/public
            const r = await api.get(`/users/${this.activeChat.user_id}/public-info`);
            this.userProfile = r.data;
        } catch (e) {
            // Если API нет или ошибка, используем данные из чата как fallback
            console.warn('Не удалось загрузить полный профиль, используем данные чата');
            this.userProfile = {
                id: this.activeChat.user_id,
                name: this.activeChat.name,
                email: this.activeChat.email,
                role: this.activeChat.role,
                avatar_url: this.activeChat.avatar_url,
                about_me: 'Информация недоступна или не заполнена.',
                skills: []
            };
        }
    },
    goToFullProfile() {
        if(!this.userProfile) return;
        const id = this.userProfile.id || this.activeChat.user_id;
        // Логика перехода зависит от роли. Предполагаем роут /profile/:id
        this.$router.push(`/profile/${id}`);
    },
    getRoleName(role) {
        if (role === 'graduate') return 'Студент';
        if (role === 'employer') return 'Рекрутер';
        if (role === 'admin') return 'Администратор';
        return 'Пользователь';
    },
    openEditModal(id) {
      this.editingVacancyId = id;
    },
    onVacancySaved() {
      this.editingVacancyId = null;
      message.success('Вакансия исправлена и отправлена на проверку!');
    },
    generateInternalLink() {
      this.interviewLink = `${window.location.origin}/room/meet-${Date.now()}`;
    },
    async scheduleInterview() {
      if (!this.interviewDate) return message.warning('Выберите дату');
      try {
        await api.post('/interviews/schedule', {
          student_id: this.activeChat.user_id,
          vacancy_id: this.activeChat.vacancy_id,
          date: this.interviewDate,
          link: this.interviewLink
        });
        message.success('Назначено');
        this.showCalendarModal = false;
        this.newMessage = `interview_invite|${this.interviewDate}|${this.interviewLink}`;
        this.sendMessage();
      } catch (e) {
        message.error('Ошибка');
      }
    },
    async startVideoCall() {
      if (!this.activeChat) return;
      const roomId = `call-${this.currentUser.id}-${Date.now()}`;
      const link = `${window.location.origin}/room/${roomId}`;
      const text = `video_call_invite|${link}`;
      try {
        await api.post('/messages/send', {
          receiver_id: this.activeChat.user_id,
          content: text,
          vacancy_id: this.activeChat.vacancy_id
        });
        this.scrollToBottom();
        this.$router.push(`/room/${roomId}`);
      } catch (e) {
      }
    },
    stripMarkdown(text) {
      if (!text) return '';
      let clean = text.replace(/[*_`#]/g, '').replace(/\[(.*?)\]\(.*?\)/g, '$1')
          .replace(/video_call_invite\|.*/, '📹 Видеозвонок')
          .replace(/interview_invite\|.*/, '📅 Интервью');
      if (clean.length > 35) return clean.substring(0, 35) + '...';
      return clean;
    },
    formatMessage(text) {
      if (!text) return '';
      if (text.startsWith('video_call_invite|')) {
        const link = text.split('|')[1];
        const route = link.replace(window.location.origin, '');
        const videoIcon = `<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>`;
        return `<div class="video-call-card"><div class="video-icon-pulse">${videoIcon}</div><div class="video-details"><span class="video-label">Входящий звонок</span><button class="join-call-btn" data-route="${route}">Присоединиться</button></div></div>`;
      }
      if (text.startsWith('interview_invite|')) {
        const [_, dateStr, link] = text.split('|');
        const date = new Date(dateStr).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
        const calendarIcon = `<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`;
        let buttonHtml = `<a href="${link}" target="_blank" class="join-call-btn" style="text-decoration:none; display:block; text-align:center;">Перейти ко встрече</a>`;
        if (link.includes(window.location.origin)) {
          const route = link.replace(window.location.origin, '');
          buttonHtml = `<button class="join-call-btn" data-route="${route}">Присоединиться</button>`;
        }
        return `<div class="video-call-card interview-card"><div class="video-icon-pulse" style="background:#ecfdf5; color:#10b981">${calendarIcon}</div><div class="video-details"><span class="video-label">Техническое интервью</span><div style="font-weight:700; margin: 4px 0; font-size: 0.9rem;">${date}</div>${buttonHtml}</div></div>`;
      }
      try { return marked.parse(text, {breaks: true}); } catch (e) { return text; }
    },
    stringToColor(str) {
      if (!str) return '#1890ff';
      let hash = 0;
      for (let i = 0; i < str.length; i++) { hash = str.charCodeAt(i) + ((hash << 5) - hash); }
      const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
      return '#' + '00000'.substring(0, 6 - c.length) + c;
    },
    handleMessageClick(event) {
      if (event.target.classList.contains('join-call-btn')) {
        const route = event.target.dataset.route;
        if (route) this.$router.push(route);
      }
    },
    beforeUpload(file) { this.fileList = [file]; return false; },
    handleRemove() { this.fileList = []; },
    async submitSolution() {
      if (!this.solutionDesc && this.fileList.length === 0) return message.warning('Заполните поля');
      this.uploading = true;
      const formData = new FormData();
      formData.append('employer_user_id', this.activeChat.user_id);
      formData.append('description', this.solutionDesc);
      if (this.fileList.length > 0) formData.append('solution', this.fileList[0]);
      try {
        await api.post('/applications/solution', formData, {headers: {'Content-Type': 'multipart/form-data'}});
        message.success('Отправлено!');
        this.showSolutionModal = false; this.solutionDesc = ''; this.fileList = [];
      } catch (e) { message.error('Ошибка'); } finally { this.uploading = false; }
    },
    scrollToBottom() {
      nextTick(() => {
        const container = this.$refs.messagesContainer;
        if (container) container.scrollTop = container.scrollHeight;
      });
    },
    getAvatarUrl(url) { return url ? `http://localhost:4000${url}` : null; },
    formatTime(dateStr) { return new Date(dateStr).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}); }
  }
};
</script>

<style scoped>
/* --- ГЛОБАЛЬНЫЙ КОНТЕЙНЕР --- */
.page-wrapper {
  position: relative;
  width: 100%;
  height: calc(100vh - 40px);
  background: #f0f2f5;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

/* --- ФОНОВЫЕ БЛОБЫ --- */
.blobs-container {
  position: absolute;
  inset: 0;
  overflow: hidden;
  z-index: 0;
  pointer-events: none;
}
.blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.4;
  animation: float 20s infinite alternate ease-in-out;
}
.blob-1 { width: 500px; height: 500px; background: #c4b5fd; top: -100px; left: -100px; }
.blob-2 { width: 400px; height: 400px; background: #93c5fd; bottom: -100px; right: -100px; animation-delay: -5s; }
.blob-3 { width: 300px; height: 300px; background: #f9a8d4; top: 30%; left: 40%; animation-delay: -10s; }

@keyframes float {
  from { transform: translate(0, 0); }
  to { transform: translate(40px, -40px); }
}

/* --- КАРТОЧКА МЕССЕНДЖЕРА --- */
.messenger-container {
  position: relative;
  z-index: 10;
  width: 95%;
  max-width: 1400px;
  height: 90vh;
}

.messenger-layout {
  display: flex;
  width: 100%;
  height: 100%;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.5);
  overflow: hidden;
}

/* --- SIDEBAR --- */
.sidebar {
  width: 350px;
  border-right: 1px solid rgba(0,0,0,0.06);
  display: flex;
  flex-direction: column;
  background: rgba(255,255,255,0.4);
}

.sidebar-header {
  padding: 20px 24px;
  border-bottom: 1px solid rgba(0,0,0,0.06);
}
.sidebar-header h3 { margin: 0; font-weight: 700; color: #1f2937; }

.chats-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.chat-item {
  display: flex; gap: 12px; padding: 12px;
  border-radius: 12px; cursor: pointer;
  transition: 0.2s; margin-bottom: 4px;
}
.chat-item:hover { background: rgba(0,0,0,0.04); }
.chat-item.active { background: white; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }

.avatar-wrapper { position: relative; display: flex; align-items: center; }

.chat-info { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center; }
.chat-top { display: flex; justify-content: space-between; margin-bottom: 2px; }
.chat-name { font-weight: 600; font-size: 0.95rem; color: #374151; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px; }
.chat-time { font-size: 0.75rem; color: #9ca3af; }
.chat-vacancy-tag {
  font-size: 0.7rem; color: #7c3aed; background: #f3e8ff;
  padding: 1px 6px; border-radius: 4px; width: fit-content; margin-bottom: 4px;
}
.chat-bottom { display: flex; justify-content: space-between; align-items: center; }
.chat-preview { font-size: 0.85rem; color: #6b7280; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; padding-right: 10px; }
.unread-badge {
  background: #ef4444; color: white; font-size: 0.7rem; font-weight: 700;
  height: 18px; min-width: 18px; border-radius: 9px; display: flex; align-items: center; justify-content: center; padding: 0 5px;
}

/* --- CHAT MAIN --- */
.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: rgba(255,255,255,0.2);
  min-width: 0;
}

.chat-header {
  height: 70px; padding: 0 24px;
  display: flex; justify-content: space-between; align-items: center;
  border-bottom: 1px solid rgba(0,0,0,0.06);
  background: rgba(255,255,255,0.7);
  z-index: 5;
}
.header-title { font-weight: 700; font-size: 1.1rem; color: #1f2937; }
.header-subtitle { font-size: 0.8rem; color: #6b7280; display: flex; align-items: center; gap: 4px; }

/* КНОПКИ ДЕЙСТВИЙ - ВЫРАВНИВАНИЕ */
.header-actions {
  display: flex;
  align-items: center; /* Центрируем по вертикали */
  gap: 10px; /* Отступы между кнопками */
}

.action-btn {
  width: 38px; height: 38px; border-radius: 10px; border: none; cursor: pointer;
  display: flex; align-items: center; justify-content: center; transition: 0.2s;
}

/* Цвета кнопок */
.btn-indigo { background: #eef2ff; color: #4f46e5; }
.btn-indigo:hover { background: #e0e7ff; }

.btn-rose { background: #fff1f2; color: #e11d48; }
.btn-rose:hover { background: #ffe4e6; }

.btn-emerald { background: #ecfdf5; color: #10b981; }
.btn-emerald:hover { background: #d1fae5; }

/* 🔥 СЕРАЯ КНОПКА (ИНФО) */
.btn-gray { background: #f3f4f6; color: #4b5563; }
.btn-gray:hover { background: #e5e7eb; color: #1f2937; }


/* --- MESSAGES AREA --- */
.messages-area {
  flex: 1;
  padding: 20px 30px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.no-messages-placeholder {
  margin: auto;
  color: #9ca3af;
  font-size: 0.9rem;
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.message-row {
  display: flex;
  width: 100%;
  animation: fadeInUp 0.3s ease-out forwards;
}
.row-me { justify-content: flex-end; }
.row-them { justify-content: flex-start; }

.message-bubble {
  max-width: 70%;
  padding: 12px 18px;
  border-radius: 18px;
  font-size: 0.95rem;
  line-height: 1.5;
  position: relative;
  word-wrap: break-word;
}

.row-them .message-bubble {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  color: #1f2937;
  border-bottom-left-radius: 4px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.02);
}

.row-me .message-bubble {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  border-bottom-right-radius: 4px;
  box-shadow: 0 4px 10px rgba(37, 99, 235, 0.2);
}

.msg-meta {
  font-size: 0.7rem; margin-top: 4px; opacity: 0.7;
  display: flex; align-items: center; justify-content: flex-end; gap: 4px;
}
.msg-content :deep(p) { margin: 0; }
.msg-content :deep(a) { color: inherit; text-decoration: underline; }

/* --- INPUT --- */
.input-wrapper {
  padding: 20px;
  background: rgba(255,255,255,0.8);
  border-top: 1px solid rgba(0,0,0,0.06);
}
.input-container {
  display: flex; gap: 10px; align-items: flex-end;
  background: white; padding: 8px; border-radius: 14px;
  border: 1px solid #e5e7eb; box-shadow: 0 2px 10px rgba(0,0,0,0.03);
}
.input-container:focus-within { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }

.modern-textarea {
  flex: 1; border: none !important; background: transparent !important;
  box-shadow: none !important; resize: none; padding: 8px; font-size: 0.95rem;
}
.send-btn {
  width: 40px; height: 40px; border-radius: 50%; background: #3b82f6;
  color: white; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: 0.2s; margin-bottom: 2px;
}
.send-btn:disabled { background: #e5e7eb; cursor: default; }
.send-btn:not(:disabled):hover { transform: scale(1.05); background: #2563eb; }

/* --- EMPTY STATE --- */
.empty-state {
  height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #9ca3af;
}
.empty-circle {
  width: 80px; height: 80px; background: rgba(0,0,0,0.03); border-radius: 50%;
  display: flex; align-items: center; justify-content: center; font-size: 2rem; margin-bottom: 20px;
}

/* SCROLLBAR */
.custom-scroll::-webkit-scrollbar { width: 6px; }
.custom-scroll::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 10px; }
.custom-scroll::-webkit-scrollbar-track { background: transparent; }

/* System cards */
.system-card {
  margin-top: 8px; background: #fff7ed; padding: 8px 12px; border-radius: 8px;
  border: 1px solid #fed7aa; display: flex; gap: 10px; align-items: center; color: #9a3412;
}
.sys-btn { background: #f97316; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 0.75rem; margin-top: 2px; }

/* Video Cards */
:deep(.video-call-card) {
  background: rgba(255,255,255,0.9); padding: 10px; border-radius: 12px;
  display: flex; gap: 10px; align-items: center; color: #374151; box-shadow: 0 2px 5px rgba(0,0,0,0.05);
}
:deep(.video-icon-pulse) {
  width: 40px; height: 40px; background: #fee2e2; color: #ef4444; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
}
:deep(.join-call-btn) {
  background: #10b981; color: white; border: none; padding: 6px 12px;
  border-radius: 6px; font-weight: 600; cursor: pointer; margin-top: 4px; display: inline-block; text-decoration: none;
}
.date-input { width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 6px; }
.mb-20 { margin-bottom: 20px; }

/* 🔥 СТИЛИ ДЛЯ МОДАЛКИ ПРОФИЛЯ */
.profile-card-content { text-align: center; margin-top: -20px; }
.profile-cover {
  height: 100px; background: linear-gradient(120deg, #a78bfa, #3b82f6);
  margin: 0 -24px; border-radius: 0;
}
.profile-main-info { margin-top: -50px; }
.profile-avatar-large {
  display: inline-block; padding: 4px; background: white; border-radius: 50%;
}
.profile-name { margin: 10px 0 5px; font-weight: 800; color: #1f2937; font-size: 1.5rem; }
.profile-role { color: #6b7280; font-size: 0.9rem; margin-bottom: 5px; }
.profile-location { color: #4b5563; font-size: 0.9rem; display: flex; align-items: center; justify-content: center; gap: 5px; }

.profile-section { text-align: left; margin-bottom: 20px; }
.profile-section h4 { font-size: 1rem; font-weight: 700; color: #1f2937; margin-bottom: 10px; }
.bio-text { color: #4b5563; line-height: 1.6; font-size: 0.95rem; white-space: pre-line; }

.skills-row { display: flex; flex-wrap: wrap; gap: 8px; }
.skill-pill { background: #eff6ff; color: #2563eb; padding: 4px 12px; border-radius: 20px; font-size: 0.85rem; font-weight: 600; }
.skill-more { background: #f3f4f6; color: #6b7280; padding: 4px 10px; border-radius: 20px; font-size: 0.8rem; }

.loading-profile { text-align: center; padding: 40px; color: #6b7280; font-size: 1.1rem; }
</style>