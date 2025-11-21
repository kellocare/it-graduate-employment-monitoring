<template>
  <div class="messenger-page">
    <div class="messenger-container">

      <!-- Сайдбар (без изменений) -->
      <div class="sidebar">
        <div class="sidebar-header"><h3>Сообщения</h3></div>
        <div class="chats-list">
          <div v-if="conversations.length === 0" class="empty-chats">Нет диалогов</div>
          <div
            v-for="chat in conversations" :key="chat.user_id"
            class="chat-item" :class="{ active: activeChat && activeChat.user_id === chat.user_id }"
            @click="selectChat(chat)"
          >
            <a-avatar :size="40" :src="getAvatarUrl(chat.avatar_url)" class="chat-avatar">
              <template #icon><user-outlined /></template>
            </a-avatar>
            <div class="chat-info">
              <div class="chat-name">{{ chat.name || chat.email }}</div>
              <div class="chat-last-msg">{{ chat.last_message }}</div>
            </div>
            <div class="chat-date">{{ formatTime(chat.created_at) }}</div>
          </div>
        </div>
      </div>

      <!-- Окно чата -->
      <div class="chat-window">
        <template v-if="activeChat">
          <div class="chat-header">
            <div class="header-info"><span class="chat-header-name">{{ activeChat.name || activeChat.email }}</span></div>
            <a-tooltip title="Начать видеозвонок">
              <a-button type="primary" shape="circle" @click="startVideoCall"><video-camera-outlined /></a-button>
            </a-tooltip>
          </div>

          <!-- ДОБАВИЛИ ОБРАБОТЧИК КЛИКА @click="handleMessageClick" -->
          <div class="messages-area" ref="messagesContainer" @click="handleMessageClick">
            <div v-for="(msg, index) in messages" :key="index"
                 class="message-bubble"
                 :class="msg.sender_id === currentUser.id ? 'my-msg' : 'their-msg'"
            >
              <div class="msg-content" v-html="formatMessage(msg.content)"></div>
              <div class="msg-time">{{ formatTime(msg.created_at) }}</div>
            </div>
          </div>

          <div class="input-area">
            <a-textarea v-model:value="newMessage" :rows="1" placeholder="Напишите сообщение..." @pressEnter.prevent="sendMessage" class="msg-input" />
            <a-button type="primary" shape="circle" @click="sendMessage"><send-outlined /></a-button>
          </div>
        </template>

        <template v-else>
          <div class="no-chat-selected">
            <message-outlined style="font-size: 60px; color: #ddd; margin-bottom: 20px;" />
            <p>Выберите собеседника, чтобы начать общение</p>
          </div>
        </template>
      </div>

    </div>
  </div>
</template>

<script>
import api from '../axios';
import { UserOutlined, SendOutlined, MessageOutlined, VideoCameraOutlined } from '@ant-design/icons-vue';

export default {
  components: { UserOutlined, SendOutlined, MessageOutlined, VideoCameraOutlined },
  data() {
    return {
      currentUser: null,
      conversations: [],
      activeChat: null,
      messages: [],
      newMessage: '',
      pollingInterval: null
    };
  },
  async mounted() {
    const userData = localStorage.getItem('user');
    if (userData) this.currentUser = JSON.parse(userData);
    await this.loadConversations();
    this.pollingInterval = setInterval(() => {
      if (this.activeChat) this.loadMessages(this.activeChat.user_id, false);
      this.loadConversations();
    }, 3000);
  },
  beforeUnmount() {
    if (this.pollingInterval) clearInterval(this.pollingInterval);
  },
  methods: {
    async loadConversations() {
      try { const r = await api.get('/messages/conversations'); this.conversations = r.data; } catch (e) {}
    },
    async selectChat(chat) {
      this.activeChat = chat;
      await this.loadMessages(chat.user_id, true);
    },
    async loadMessages(partnerId, scroll = false) {
      try {
        const r = await api.get(`/messages/${partnerId}`);
        if (r.data.length !== this.messages.length) {
           this.messages = r.data;
           if (scroll) this.scrollToBottom();
        }
      } catch (e) {}
    },
    async sendMessage() {
      if (!this.newMessage.trim() || !this.activeChat) return;
      const text = this.newMessage;
      this.newMessage = '';
      this.messages.push({ sender_id: this.currentUser.id, content: text, created_at: new Date().toISOString() });
      this.scrollToBottom();
      try {
        await api.post('/messages/send', { receiver_id: this.activeChat.user_id, content: text });
        await this.loadConversations();
      } catch (e) {}
    },

    async startVideoCall() {
      if (!this.activeChat) return;
      const roomId = `call-${this.currentUser.id}-${Date.now()}`;
      // Генерируем ссылку относительно корня сайта
      const link = `${window.location.origin}/room/${roomId}`;

      // Сообщение с маркером [VIDEO_CALL]
      const text = `📞 Видеозвонок: ${link}`;

      this.messages.push({ sender_id: this.currentUser.id, content: text, created_at: new Date().toISOString() });
      this.scrollToBottom();

      try {
        await api.post('/messages/send', { receiver_id: this.activeChat.user_id, content: text });
        this.$router.push(`/room/${roomId}`);
      } catch (e) {}
    },

    // ПРЕВРАЩЕНИЕ ССЫЛОК В КНОПКИ
    formatMessage(text) {
      if (!text) return '';
      // Ищем ссылки на нашу комнату
      const roomRegex = new RegExp(`${window.location.origin}/room/([a-zA-Z0-9_-]+)`, 'g');

      if (text.match(roomRegex)) {
          // Заменяем на красивую кнопку (span с data-url)
          return text.replace(roomRegex, (match, roomId) => {
              // class="join-call-btn" - для стилей
              // data-route="/room/${roomId}" - для перехвата клика
              return `<br><span class="join-call-btn" data-route="/room/${roomId}">🎥 Присоединиться к звонку</span>`;
          });
      }
      return text;
    },

    // ПЕРЕХВАТ КЛИКА (Делегирование событий)
    handleMessageClick(event) {
        // Если кликнули по нашему span'у
        if (event.target.classList.contains('join-call-btn')) {
            const route = event.target.dataset.route;
            if (route) {
                this.$router.push(route); // Внутренний переход!
            }
        }
    },

    scrollToBottom() {
      this.$nextTick(() => {
        const container = this.$refs.messagesContainer;
        if (container) container.scrollTop = container.scrollHeight;
      });
    },
    getAvatarUrl(url) { return url ? `http://localhost:4000${url}` : null; },
    formatTime(dateStr) { return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
  }
};
</script>

<style scoped>
.messenger-page { height: calc(100vh - 64px - 60px); background: #f0f2f5; padding: 20px; display: flex; justify-content: center; }
.messenger-container { width: 100%; max-width: 1000px; background: #fff; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); display: flex; overflow: hidden; }

.sidebar { width: 300px; border-right: 1px solid #f0f0f0; display: flex; flex-direction: column; }
.sidebar-header { padding: 20px; border-bottom: 1px solid #f0f0f0; }
.sidebar-header h3 { margin: 0; color: #333; }
.chats-list { overflow-y: auto; flex: 1; }
.chat-item { padding: 15px 20px; display: flex; align-items: center; gap: 12px; cursor: pointer; transition: 0.2s; border-bottom: 1px solid #fafafa; }
.chat-item:hover { background: #f9f9f9; }
.chat-item.active { background: #e6f7ff; border-right: 3px solid #1890ff; }
.chat-info { flex: 1; overflow: hidden; }
.chat-name { font-weight: bold; color: #333; font-size: 0.95em; }
.chat-last-msg { font-size: 0.85em; color: #888; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.chat-date { font-size: 0.75em; color: #bbb; align-self: flex-start; }
.empty-chats { padding: 20px; text-align: center; color: #999; }

.chat-window { flex: 1; display: flex; flex-direction: column; background: #fff; }
.chat-header { padding: 10px 20px; border-bottom: 1px solid #f0f0f0; display: flex; justify-content: space-between; align-items: center; background: #fff; height: 60px; }
.chat-header-name { font-weight: bold; color: #333; font-size: 1.1em; }
.no-chat-selected { flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; color: #999; }

.messages-area { flex: 1; padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; background: #f9f9f9; }
.message-bubble { max-width: 70%; padding: 10px 14px; border-radius: 12px; line-height: 1.4; position: relative; font-size: 0.95em; word-wrap: break-word; }
.my-msg { align-self: flex-end; background: #1890ff; color: white; border-bottom-right-radius: 2px; }
.their-msg { align-self: flex-start; background: #fff; color: #333; border: 1px solid #e8e8e8; border-bottom-left-radius: 2px; }
.msg-time { font-size: 0.7em; text-align: right; margin-top: 4px; opacity: 0.7; }

.input-area { padding: 15px; border-top: 1px solid #f0f0f0; display: flex; gap: 10px; align-items: center; background: #fff; }
.msg-input { border-radius: 20px; }

/* --- СТИЛИ ДЛЯ КНОПКИ ЗВОНКА ВНУТРИ СООБЩЕНИЯ --- */
/* Используем deep selector, так как v-html рендерит динамически */
:deep(.join-call-btn) {
  display: inline-block;
  background-color: #52c41a; /* Зеленый цвет звонка */
  color: white;
  padding: 5px 12px;
  border-radius: 15px;
  margin-top: 5px;
  cursor: pointer;
  font-weight: bold;
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
  transition: 0.2s;
  text-decoration: none;
}
:deep(.join-call-btn):hover {
  background-color: #73d13d;
  transform: transla