<template>
  <div class="messenger-page">
    <div class="messenger-container">

      <!-- ЛЕВАЯ КОЛОНКА: Список диалогов -->
      <div class="sidebar">
        <div class="sidebar-header">
          <h3>Сообщения</h3>
        </div>
        <div class="chats-list">
          <div v-if="conversations.length === 0" class="empty-chats">Нет диалогов</div>

          <div
            v-for="chat in conversations"
            :key="chat.user_id + '_' + chat.vacancy_id"
            class="chat-item"
            :class="{ active: activeChat && activeChat.user_id === chat.user_id && activeChat.vacancy_id === chat.vacancy_id }"
            @click="selectChat(chat)"
          >
            <a-avatar :size="40" :src="getAvatarUrl(chat.avatar_url)" class="chat-avatar">
              <template #icon><user-outlined /></template>
            </a-avatar>
            <div class="chat-info">
              <div class="chat-name">{{ chat.name || chat.email }}</div>
              <!-- Отображение вакансии в списке -->
              <div class="chat-vacancy" v-if="chat.vacancy_title">
                <tag-outlined /> {{ chat.vacancy_title }}
              </div>
              <div class="chat-last-msg">{{ chat.last_message }}</div>
            </div>
            <div class="chat-date">{{ formatTime(chat.created_at) }}</div>
          </div>
        </div>
      </div>

      <!-- ПРАВАЯ КОЛОНКА: Окно переписки -->
      <div class="chat-window">
        <template v-if="activeChat">

          <!-- ЗАГОЛОВОК ЧАТА -->
          <div class="chat-header">
            <div class="header-info">
               <span class="chat-header-name">{{ activeChat.name || activeChat.email }}</span>
               <span class="chat-header-vacancy" v-if="activeChat.vacancy_title">
                 — {{ activeChat.vacancy_title }}
               </span>
            </div>

            <div class="header-actions">
               <!-- КНОПКА СДАЧИ РЕШЕНИЯ -->
               <a-button type="primary" ghost size="small" @click="showSolutionModal = true" style="margin-right: 10px;">
                 📎 Сдать решение
               </a-button>

               <!-- КНОПКА ВИДЕОЗВОНКА -->
               <a-tooltip title="Начать видеозвонок">
                 <a-button type="primary" shape="circle" @click="startVideoCall">
                    <video-camera-outlined />
                 </a-button>
               </a-tooltip>
            </div>
          </div>

          <!-- ОБЛАСТЬ СООБЩЕНИЙ -->
          <div class="messages-area" ref="messagesContainer" @click="handleMessageClick">
            <div v-for="(msg, index) in messages" :key="index"
                 class="message-bubble"
                 :class="msg.sender_id === currentUser.id ? 'my-msg' : 'their-msg'"
            >
              <!-- v-html рендерит и Markdown, и кнопки звонков -->
              <div class="msg-content" v-html="formatMessage(msg.content)"></div>
              <div class="msg-time">{{ formatTime(msg.created_at) }}</div>
            </div>
          </div>

          <!-- ВВОД СООБЩЕНИЯ -->
          <div class="input-area">
            <a-textarea
              v-model:value="newMessage"
              :rows="1"
              placeholder="Напишите сообщение..."
              @pressEnter.prevent="sendMessage"
              class="msg-input"
            />
            <a-button type="primary" shape="circle" @click="sendMessage">
              <send-outlined />
            </a-button>
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

    <!-- МОДАЛЬНОЕ ОКНО СДАЧИ РЕШЕНИЯ -->
    <a-modal
      v-model:open="showSolutionModal"
      title="Отправка решения тестового задания"
      ok-text="Отправить"
      cancel-text="Отмена"
      @ok="submitSolution"
      :confirm-loading="uploading"
    >
      <a-form layout="vertical">
        <a-alert
          message="Внимание"
          description="ИИ проверит ваше решение и вынесет финальный вердикт о приеме на работу."
          type="info"
          show-icon
          class="mb-20"
        />

        <a-form-item label="Комментарий к решению">
          <a-textarea
            v-model:value="solutionDesc"
            rows="4"
            placeholder="Опишите ваше решение, архитектуру или вставьте ссылку на GitHub..."
          />
        </a-form-item>

        <a-form-item label="Файл (Архив, PDF, Docx)">
          <a-upload
            :file-list="fileList"
            :before-upload="beforeUpload"
            @remove="handleRemove"
            max-count="1"
          >
            <a-button>
              <upload-outlined /> Выбрать файл
            </a-button>
          </a-upload>
        </a-form-item>
      </a-form>
    </a-modal>

  </div>
</template>

<script>
import api from '../axios';
import { marked } from 'marked'; // <--- ВАЖНО: Библиотека для Markdown
import { message } from 'ant-design-vue';
import {
  UserOutlined, SendOutlined, MessageOutlined,
  VideoCameraOutlined, UploadOutlined, TagOutlined
} from '@ant-design/icons-vue';

export default {
  components: {
    UserOutlined, SendOutlined, MessageOutlined,
    VideoCameraOutlined, UploadOutlined, TagOutlined
  },
  data() {
    return {
      currentUser: null,
      conversations: [],
      activeChat: null,
      messages: [],
      newMessage: '',
      pollingInterval: null,

      // Данные для модалки
      showSolutionModal: false,
      solutionDesc: '',
      fileList: [],
      uploading: false,
    };
  },
  async mounted() {
    const userData = localStorage.getItem('user');
    if (userData) this.currentUser = JSON.parse(userData);

    await this.loadConversations();

    // Поллинг сообщений
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
      } catch (e) { console.error(e); }
    },
    async selectChat(chat) {
      this.activeChat = chat;
      await this.loadMessages(chat.user_id, chat.vacancy_id, true);
    },
    async loadMessages(partnerId, vacancyId, scroll = false) {
      try {
        const r = await api.get(`/messages/${partnerId}`, { params: { vacancy_id: vacancyId } });
        // Обновляем только если изменилось количество сообщений (простая оптимизация)
        if (r.data.length !== this.messages.length) {
           this.messages = r.data;
           if (scroll) this.scrollToBottom();
        }
      } catch (e) { console.error(e); }
    },
    async sendMessage() {
      if (!this.newMessage.trim() || !this.activeChat) return;

      const text = this.newMessage;
      this.newMessage = '';

      this.messages.push({
        sender_id: this.currentUser.id,
        content: text,
        created_at: new Date().toISOString()
      });
      this.scrollToBottom();

      try {
        await api.post('/messages/send', {
          receiver_id: this.activeChat.user_id,
          content: text,
          vacancy_id: this.activeChat.vacancy_id
        });
        await this.loadConversations();
      } catch (e) { console.error('Ошибка отправки'); }
    },

    // --- ВИДЕОЗВОНОК ---
    async startVideoCall() {
      if (!this.activeChat) return;

      const roomId = `call-${this.currentUser.id}-${Date.now()}`;
      const link = `${window.location.origin}/room/${roomId}`;
      const text = `📞 Видеозвонок: ${link}`;

      this.messages.push({ sender_id: this.currentUser.id, content: text, created_at: new Date().toISOString() });
      this.scrollToBottom();

      try {
        await api.post('/messages/send', {
            receiver_id: this.activeChat.user_id,
            content: text,
            vacancy_id: this.activeChat.vacancy_id
        });
        this.$router.push(`/room/${roomId}`);
      } catch (e) {}
    },

    // --- ФОРМАТИРОВАНИЕ СООБЩЕНИЙ ---
    formatMessage(text) {
      if (!text) return '';

      // 1. Проверка на ссылку звонка (превращаем в кнопку)
      const roomRegex = new RegExp(`${window.location.origin}/room/([a-zA-Z0-9_-]+)`, 'g');
      if (text.match(roomRegex)) {
          return text.replace(roomRegex, (match, roomId) => {
              return `<br><span class="join-call-btn" data-route="/room/${roomId}">🎥 Присоединиться к звонку</span>`;
          });
      }

      // 2. Если это обычный текст — парсим Markdown (для ТЗ от ИИ)
      try {
        return marked.parse(text, { breaks: true });
      } catch (e) {
        return text;
      }
    },

    // Обработка клика по кнопке звонка внутри сообщения
    handleMessageClick(event) {
        if (event.target.classList.contains('join-call-btn')) {
            const route = event.target.dataset.route;
            if (route) this.$router.push(route);
        }
    },

    // --- СДАЧА РЕШЕНИЯ ---
    beforeUpload(file) { this.fileList = [file]; return false; },
    handleRemove() { this.fileList = []; },

    async submitSolution() {
      if (!this.solutionDesc && this.fileList.length === 0) {
        return message.warning('Добавьте описание или файл');
      }

      this.uploading = true;
      const formData = new FormData();
      formData.append('employer_user_id', this.activeChat.user_id);
      formData.append('description', this.solutionDesc);
      if (this.fileList.length > 0) {
        formData.append('solution', this.fileList[0]);
      }

      try {
        await api.post('/applications/solution', formData, {
           headers: { 'Content-Type': 'multipart/form-data' }
        });
        message.success('Решение отправлено!');
        this.showSolutionModal = false;
        this.solutionDesc = '';
        this.fileList = [];

        // Сразу обновляем сообщения, чтобы увидеть подтверждение
        await this.loadMessages(this.activeChat.user_id, this.activeChat.vacancy_id, true);
      } catch (e) {
        message.error(e.response?.data?.message || 'Ошибка отправки');
      } finally {
        this.uploading = false;
      }
    },

    // --- УТИЛИТЫ ---
    scrollToBottom() {
      this.$nextTick(() => {
        const container = this.$refs.messagesContainer;
        if (container) container.scrollTop = container.scrollHeight;
      });
    },
    getAvatarUrl(url) { return url ? `http://localhost:4000${url}` : null; },
    formatTime(dateStr) {
      const date = new Date(dateStr);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  }
};
</script>

<style scoped>
.messenger-page { height: calc(100vh - 64px - 60px); background: #f0f2f5; padding: 20px; display: flex; justify-content: center; }
.messenger-container { width: 100%; max-width: 1000px; background: #fff; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); display: flex; overflow: hidden; }

/* Сайдбар */
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
.chat-vacancy { font-size: 0.75em; color: #1890ff; margin-top: 2px; font-weight: bold; }
.empty-chats { padding: 20px; text-align: center; color: #999; }

/* Окно чата */
.chat-window { flex: 1; display: flex; flex-direction: column; background: #fff; }
.chat-header { padding: 10px 20px; border-bottom: 1px solid #f0f0f0; display: flex; justify-content: space-between; align-items: center; background: #fff; height: 60px; }
.header-actions { display: flex; align-items: center; }
.chat-header-name { font-weight: bold; color: #333; font-size: 1.1em; }
.chat-header-vacancy { color: #888; font-weight: normal; font-size: 0.9em; margin-left: 10px; }

.messages-area { flex: 1; padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; background: #f9f9f9; }
.message-bubble { max-width: 75%; padding: 10px 14px; border-radius: 12px; line-height: 1.4; position: relative; font-size: 0.95em; word-wrap: break-word; }
.my-msg { align-self: flex-end; background: #1890ff; color: white; border-bottom-right-radius: 2px; }
.their-msg { align-self: flex-start; background: #fff; color: #333; border: 1px solid #e8e8e8; border-bottom-left-radius: 2px; }
.msg-time { font-size: 0.7em; text-align: right; margin-top: 4px; opacity: 0.7; }

.input-area { padding: 15px; border-top: 1px solid #f0f0f0; display: flex; gap: 10px; align-items: center; background: #fff; }
.msg-input { border-radius: 20px; }

/* --- СТИЛИ ДЛЯ MARKDOWN И КНОПОК --- */
:deep(.join-call-btn) { display: inline-block; background-color: #52c41a; color: white; padding: 5px 12px; border-radius: 15px; margin-top: 5px; cursor: pointer; font-weight: bold; box-shadow: 0 2px 5px rgba(0,0,0,0.2); transition: 0.2s; text-decoration: none; }
:deep(.join-call-btn):hover { background-color: #73d13d; transform: translateY(-1px); }

/* Стили для заголовков и списков в Markdown (чтобы не разъезжалось) */
:deep(h3), :deep(h4) { margin: 10px 0 5px 0; font-size: 1.1em; font-weight: bold; color: inherit; }
:deep(p) { margin: 0 0 5px 0; }
:deep(ul), :deep(ol) { margin: 5px 0; padding-left: 20px; }
:deep(li) { margin-bottom: 2px; list-style-type: disc; }
:deep(strong) { font-weight: bold; }
:deep(pre) { background: rgba(0, 0, 0, 0.1); padding: 8px; border-radius: 6px; overflow-x: auto; margin: 5px 0; }
:deep(code) { font-family: monospace; background: rgba(0, 0, 0, 0.1); padding: 2px 4px; border-radius: 3px; }

.mb-20 { margin-bottom: 20px; }
</style>