<template>
  <div class="messenger-page">
    <div class="messenger-card">

      <!-- ЛЕВАЯ КОЛОНКА: Список диалогов -->
      <div class="sidebar custom-scroll">
        <div class="sidebar-header">
          <h3><message-outlined /> Сообщения</h3>
        </div>

        <div class="chats-list">
          <div v-if="conversations.length === 0" class="empty-chats">
            У вас пока нет активных диалогов
          </div>

          <div
            v-for="chat in conversations"
            :key="chat.user_id + '_' + chat.vacancy_id"
            class="chat-item"
            :class="{ active: activeChat && activeChat.user_id === chat.user_id && activeChat.vacancy_id === chat.vacancy_id }"
            @click="selectChat(chat)"
          >
            <div class="avatar-wrapper">
              <a-avatar :size="45" :src="getAvatarUrl(chat.avatar_url)" class="chat-avatar" :style="{ backgroundColor: stringToColor(chat.name || chat.email) }">
                <template #icon><user-outlined /></template>
              </a-avatar>
            </div>

            <div class="chat-info">
              <div class="chat-top-row">
                <div class="chat-name">
                   <!-- Если админ, добавим пометку -->
                   <span v-if="chat.role === 'admin'" style="color: #e53e3e;">🛡️ Администратор</span>
                   <span v-else>{{ chat.name || chat.email }}</span>
                </div>
                <div class="chat-date">{{ formatTime(chat.created_at) }}</div>
              </div>

              <div class="chat-vacancy" v-if="chat.vacancy_title">
                <span>{{ chat.vacancy_title }}</span>
              </div>

              <div class="chat-last-msg">
                {{ stripMarkdown(chat.last_message) }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ПРАВАЯ КОЛОНКА: Окно переписки -->
      <div class="chat-window">
        <template v-if="activeChat">

          <div class="chat-header">
            <div class="header-info">
               <div class="header-name">
                 <span v-if="activeChat.role === 'admin'" style="color: #e53e3e;">🛡️ Администратор</span>
                 <span v-else>{{ activeChat.name || activeChat.email }}</span>
               </div>
               <div class="header-vacancy" v-if="activeChat.vacancy_title">
                 <tag-outlined /> {{ activeChat.vacancy_title }}
               </div>
            </div>

            <!-- КНОПКИ ДЕЙСТВИЙ (ИСПРАВЛЕНО) -->
            <div class="header-actions">

               <!-- Кнопка "Сдать решение": ТОЛЬКО ДЛЯ СТУДЕНТОВ -->
               <button
                 v-if="currentUser && currentUser.role === 'graduate'"
                 class="btn-action btn-solution"
                 @click="showSolutionModal = true"
                 title="Отправить решение"
               >
                 <paper-clip-outlined /> <span>Сдать решение</span>
               </button>

               <!-- Кнопка "Видеозвонок": ВСЕМ КРОМЕ АДМИНА -->
               <button
                 v-if="currentUser && currentUser.role !== 'admin'"
                 class="btn-action btn-video"
                 @click="startVideoCall"
                 title="Видеозвонок"
               >
                 <video-camera-outlined />
               </button>

            </div>
          </div>

          <div class="messages-area custom-scroll" ref="messagesContainer" @click="handleMessageClick">
            <div v-for="(msg, index) in messages" :key="index"
                 class="message-row"
                 :class="msg.sender_id === currentUser.id ? 'row-me' : 'row-them'"
            >
              <div class="message-bubble" :class="msg.sender_id === currentUser.id ? 'bubble-me' : 'bubble-them'">

                <div class="msg-content" v-html="formatMessage(msg.content)"></div>

                <!-- КАРТОЧКА "ИСПРАВИТЬ ВАКАНСИЮ" -->
                <!-- Видит только работодатель в чате с админом -->
                <div v-if="msg.vacancy_id
                           && msg.sender_id !== currentUser.id
                           && currentUser.role === 'employer'
                           && activeChat.role === 'admin'"
                     class="vacancy-edit-request">
                   <div class="req-icon">
                     <warning-outlined />
                   </div>
                   <div class="req-content">
                      <span class="req-label">Модерация: Требуются правки</span>
                      <button class="req-btn" @click="openEditModal(msg.vacancy_id)">
                         <edit-outlined /> Исправить вакансию
                      </button>
                   </div>
                </div>

                <div class="msg-meta">
                  {{ formatTime(msg.created_at) }}
                  <span v-if="msg.sender_id === currentUser.id" class="check-icon">✓</span>
                </div>
              </div>
            </div>
          </div>

          <div class="input-wrapper">
            <div class="input-container">
              <a-textarea
                v-model:value="newMessage"
                :rows="1"
                placeholder="Напишите сообщение..."
                @pressEnter.prevent="sendMessage"
                class="modern-input"
              />
              <button class="btn-send-modern" @click="sendMessage" :disabled="!newMessage.trim()">
                <send-outlined />
              </button>
            </div>
          </div>
        </template>

        <template v-else>
          <div class="no-chat-selected">
            <div class="empty-illustration">
              <div class="circle-bg">
                <message-outlined />
              </div>
            </div>
            <h3>Выберите чат</h3>
            <p>Слева находится список ваших диалогов.<br>Выберите один из них, чтобы начать общение.</p>
          </div>
        </template>
      </div>

    </div>

    <!-- МОДАЛКИ -->
    <a-modal v-model:open="showSolutionModal" title="Отправка решения" ok-text="Отправить" cancel-text="Отмена" @ok="submitSolution" :confirm-loading="uploading" centered>
      <a-form layout="vertical">
        <a-alert message="Важно" description="ИИ проверит решение автоматически. Прикрепите файлы или ссылку." type="info" show-icon class="mb-20" />
        <a-form-item label="Комментарий или ссылка"><a-textarea v-model:value="solutionDesc" rows="4" placeholder="Опишите решение..." /></a-form-item>
        <a-form-item label="Файл (Архив, PDF)">
          <a-upload :file-list="fileList" :before-upload="beforeUpload" @remove="handleRemove" max-count="1"><a-button><upload-outlined /> Загрузить файл</a-button></a-upload>
        </a-form-item>
      </a-form>
    </a-modal>

    <EditVacancyModal v-if="editingVacancyId" :vacancyId="editingVacancyId" @close="editingVacancyId = null"
                      @saved="onVacancySaved"/>

  </div>
</template>

<script>
import api from '../axios';
import {marked} from 'marked';
import {message} from 'ant-design-vue';
import EditVacancyModal from '../components/EditVacancyModal.vue';

import {
  UserOutlined, SendOutlined, MessageOutlined,
  VideoCameraOutlined, UploadOutlined, TagOutlined,
  PaperClipOutlined, WarningOutlined, EditOutlined
} from '@ant-design/icons-vue';

export default {
  components: {
    EditVacancyModal, UserOutlined, SendOutlined, MessageOutlined,
    VideoCameraOutlined, UploadOutlined, TagOutlined,
    PaperClipOutlined, WarningOutlined, EditOutlined
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
      editingVacancyId: null
    };
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
      this.activeChat = chat;
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
      if (!this.newMessage.trim() || !this.activeChat) return;
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
    openEditModal(id) {
      this.editingVacancyId = id;
    },
    onVacancySaved() {
      this.editingVacancyId = null;
      message.success('Вакансия исправлена и отправлена на проверку!');
    },
    async startVideoCall() {
      if (!this.activeChat) return;
      const roomId = `call-${this.currentUser.id}-${Date.now()}`;
      const link = `${window.location.origin}/room/${roomId}`;
      const text = `📞 Видеозвонок: ${link}`;
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
      let clean = text.replace(/[*_`#]/g, '').replace(/\[(.*?)\]\(.*?\)/g, '$1');
      if (clean.length > 45) return clean.substring(0, 45) + '...';
      return clean;
    },
    formatMessage(text) {
      if (!text) return '';
      const roomRegex = new RegExp(`${window.location.origin}/room/([a-zA-Z0-9_-]+)`, 'g');
      if (text.match(roomRegex)) {
        return text.replace(roomRegex, (match, roomId) => {
          return `<div class="video-call-card"><div class="video-icon-pulse">📹</div><div class="video-details"><span class="video-label">Входящий звонок</span><button class="join-call-btn" data-route="/room/${roomId}">Присоединиться</button></div></div>`;
        });
      }
      try {
        return marked.parse(text, {breaks: true});
      } catch (e) {
        return text;
      }
    },
    stringToColor(str) {
      if (!str) return '#1890ff';
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
      }
      const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
      return '#' + '00000'.substring(0, 6 - c.length) + c;
    },
    handleMessageClick(event) {
      if (event.target.classList.contains('join-call-btn')) {
        const route = event.target.dataset.route;
        if (route) this.$router.push(route);
      }
    },
    beforeUpload(file) {
      this.fileList = [file];
      return false;
    },
    handleRemove() {
      this.fileList = [];
    },
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
        this.showSolutionModal = false;
        this.solutionDesc = '';
        this.fileList = [];
      } catch (e) {
        message.error('Ошибка');
      } finally {
        this.uploading = false;
      }
    },
    scrollToBottom() {
      this.$nextTick(() => {
        const container = this.$refs.messagesContainer;
        if (container) container.scrollTop = container.scrollHeight;
      });
    },
    getAvatarUrl(url) {
      return url ? `http://localhost:4000${url}` : null;
    },
    formatTime(dateStr) {
      return new Date(dateStr).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
    }
  }
};
</script>

<style scoped>
.messenger-page {
  height: calc(100vh - 64px);
  background: #f3f4f6;
  padding: 20px;
  display: flex;
  justify-content: center;
}

.messenger-card {
  width: 100%;
  max-width: 1100px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
  display: flex;
  overflow: hidden;
  border: 1px solid #e5e7eb;
  height: 85vh;
}

.sidebar {
  width: 320px;
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  background: #f9fafb;
}

.sidebar-header {
  padding: 20px;
  border-bottom: 1px solid #e5e7eb;
  background: #fff;
}

.sidebar-header h3 {
  margin: 0;
  color: #1f2937;
  font-weight: 700;
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  gap: 10px;
}

.chats-list {
  overflow-y: auto;
  flex: 1;
  padding: 10px;
}

.chat-item {
  padding: 12px;
  display: flex;
  gap: 12px;
  cursor: pointer;
  transition: 0.2s;
  border-radius: 12px;
  margin-bottom: 5px;
  border: 1px solid transparent;
}

.chat-item:hover {
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.chat-item.active {
  background: #fff;
  border-color: #bfdbfe;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.1);
}

.chat-item.active .chat-name {
  color: #2563eb;
}

.avatar-wrapper {
  flex-shrink: 0;
}

.chat-info {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.chat-top-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2px;
}

.chat-name {
  font-weight: 600;
  color: #374151;
  font-size: 0.95rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 140px;
}

.chat-date {
  font-size: 0.75rem;
  color: #9ca3af;
}

.chat-vacancy {
  font-size: 0.75rem;
  color: #6b7280;
  background: #f3f4f6;
  display: inline-block;
  padding: 1px 6px;
  border-radius: 4px;
  margin-bottom: 4px;
  width: fit-content;
}

.chat-last-msg {
  font-size: 0.85rem;
  color: #6b7280;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chat-window {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #fff;
  position: relative;
}

.chat-header {
  padding: 0 25px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 70px;
  background: #fff;
}

.header-name {
  font-weight: 700;
  font-size: 1.1rem;
  color: #111827;
}

.header-vacancy {
  font-size: 0.85rem;
  color: #6b7280;
  margin-top: 2px;
}

.header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.btn-action {
  border: none;
  height: 40px;
  border-radius: 12px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 16px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.btn-solution {
  background: #eef2ff;
  color: #4f46e5;
}

.btn-solution:hover {
  background: #e0e7ff;
  transform: translateY(-1px);
}

.btn-video {
  background: #fdf2f8;
  color: #db2777;
  padding: 0;
  width: 40px;
}

.btn-video:hover {
  background: #fce7f3;
  transform: translateY(-1px) rotate(5deg);
}

.messages-area {
  flex: 1;
  padding: 25px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 15px;
  background: #ffffff;
}

.message-row {
  display: flex;
  width: 100%;
}

.row-me {
  justify-content: flex-end;
}

.row-them {
  justify-content: flex-start;
}

.message-bubble {
  max-width: 70%;
  padding: 12px 18px;
  border-radius: 16px;
  line-height: 1.5;
  font-size: 0.95rem;
  position: relative;
  word-wrap: break-word;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.03);
}

.bubble-me {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
  border-bottom-right-radius: 4px;
}

.bubble-them {
  background: #f3f4f6;
  color: #1f2937;
  border-bottom-left-radius: 4px;
  border: 1px solid #e5e7eb;
}

.msg-meta {
  font-size: 0.7rem;
  text-align: right;
  margin-top: 4px;
  opacity: 0.7;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
}

.check-icon {
  font-size: 0.8rem;
}

.vacancy-edit-request {
  margin-top: 10px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(0, 0, 0, 0.05);
  transition: transform 0.2s;
}

.vacancy-edit-request:hover {
  transform: translateY(-2px);
}

.req-icon {
  width: 36px;
  height: 36px;
  background: #fffbe6;
  color: #faad14;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
}

.req-content {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}

.req-label {
  font-size: 0.75rem;
  font-weight: 700;
  color: #8c8c8c;
  text-transform: uppercase;
}

.req-btn {
  background: linear-gradient(135deg, #faad14, #d48806);
  color: white;
  border: none;
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: 0.2s;
}

.req-btn:hover {
  background: linear-gradient(135deg, #d48806, #ad6800);
  box-shadow: 0 2px 8px rgba(250, 173, 20, 0.4);
}

.input-wrapper {
  padding: 20px;
  background: #fff;
  border-top: 1px solid #f3f4f6;
}

.input-container {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 24px;
  padding: 6px 6px 6px 20px;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: all 0.3s ease;
}

.input-container:focus-within {
  background: #fff;
  border-color: #bfdbfe;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1);
}

.modern-input {
  border: none !important;
  background: transparent !important;
  box-shadow: none !important;
  resize: none;
  padding: 8px 0;
  font-size: 0.95rem;
}

.modern-input:focus {
  outline: none;
}

.btn-send-modern {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
  font-size: 1.1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  flex-shrink: 0;
}

.btn-send-modern:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 10px rgba(37, 99, 235, 0.3);
}

.btn-send-modern:disabled {
  background: #e5e7eb;
  color: #9ca3af;
  transform: none;
  box-shadow: none;
  cursor: default;
}

.no-chat-selected {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #f9fafb;
  text-align: center;
  padding: 40px;
}

.circle-bg {
  width: 120px;
  height: 120px;
  background: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3.5rem;
  color: #3b82f6;
  box-shadow: 0 10px 30px rgba(59, 130, 246, 0.15);
}

.custom-scroll::-webkit-scrollbar {
  width: 6px;
}

.custom-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scroll::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 10px;
}

:deep(.video-call-card) {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  padding: 12px;
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  max-width: 280px;
  transition: transform 0.2s;
}

:deep(.video-call-card:hover) {
  transform: translateY(-2px);
}

:deep(.video-icon-pulse) {
  width: 40px;
  height: 40px;
  background: #eef2ff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  animation: pulse-ring 2s infinite;
}

:deep(.video-details) {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

:deep(.video-label) {
  font-size: 0.75rem;
  font-weight: 700;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

:deep(.join-call-btn) {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}

:deep(.join-call-btn:hover) {
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.4);
}

@keyframes pulse-ring {
  0% {
    box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(99, 102, 241, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(99, 102, 241, 0);
  }
}

.mb-20 {
  margin-bottom: 20px;
}
</style>