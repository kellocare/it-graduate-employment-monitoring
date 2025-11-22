<template>
  <div class="page-wrapper">

    <!-- ДИНАМИЧЕСКИЙ ФОН (ПУЗЫРИ) -->
    <div class="blobs-container">
      <div class="blob blob-1"></div>
      <div class="blob blob-2"></div>
      <div class="blob blob-3"></div>
    </div>

    <div class="content-container">
      <!-- ШАПКА -->
      <header class="page-header fade-in-down">
        <div class="header-left">
          <h1>
            <div class="ai-avatar-glow">
              <robot-outlined />
            </div>
            AI Ассистент
          </h1>

          <!-- ПЕРЕКЛЮЧАТЕЛЬ РЕЖИМОВ -->
          <div class="glass-switcher">
            <div
              class="switch-option"
              :class="{ active: currentMode === 'vacancy' }"
              @click="setMode('vacancy')"
            >
              🔍 Вакансии
            </div>
            <div
              class="switch-option"
              :class="{ active: currentMode === 'resume' }"
              @click="setMode('resume')"
            >
              📝 Резюме
            </div>
            <div class="switch-slider" :style="sliderStyle"></div>
          </div>
        </div>

        <!-- КНОПКА УДАЛЕНИЯ -->
        <div class="actions">
          <button @click="clearHistory" class="btn-delete-glass" title="Очистить историю">
            <delete-outlined />
          </button>
        </div>
      </header>

      <!-- ЧАТ-КОНТЕЙНЕР (Стекло) -->
      <div class="chat-glass-card">
        <div class="messages-area custom-scroll" ref="msgContainer">

          <!-- ПРИВЕТСТВИЕ (ЕСЛИ ЧАТ ПУСТ) -->
          <transition name="fade" mode="out-in">
            <div v-if="messages.length === 0" class="empty-state">
              <div class="empty-content">
                <div class="icon-wrapper">
                  <search-outlined v-if="currentMode === 'vacancy'" />
                  <file-text-outlined v-else />
                </div>
                <h3>{{ currentMode === 'vacancy' ? 'Поиск работы' : 'Анализ резюме' }}</h3>
                <p class="subtitle-text">
                  {{ currentMode === 'vacancy'
                    ? 'Я проанализирую базу вакансий и подберу лучшие варианты.'
                    : 'Загрузи PDF или скинь текст, я найду ошибки и дам советы.' }}
                </p>
                <div class="suggestion-chips">
                  <span @click="newMessage = 'Найди работу Python Junior'" v-if="currentMode === 'vacancy'">Python Junior</span>
                  <span @click="newMessage = 'Какие навыки нужны для DevOps?'" v-if="currentMode === 'vacancy'">Навыки DevOps</span>
                  <span @click="$refs.fileInput.click()" v-if="currentMode === 'resume'">📎 Загрузить PDF</span>
                </div>
              </div>
            </div>
          </transition>

          <!-- СПИСОК СООБЩЕНИЙ -->
          <transition-group name="message-anim">
            <div
              v-for="(msg, index) in messages"
              :key="index"
              class="message-row"
              :class="msg.role === 'user' ? 'row-user' : 'row-ai'"
            >
              <div class="avatar">
                <user-outlined v-if="msg.role === 'user'" />
                <robot-outlined v-else />
              </div>

              <div class="bubble" :class="msg.role === 'user' ? 'bubble-user' : 'bubble-ai'">
                <div class="text" v-html="formatText(msg.content)"></div>
              </div>
            </div>
          </transition-group>

          <!-- ИНДИКАТОР ПЕЧАТИ (PULSE) -->
          <div v-if="loading" class="message-row row-ai">
            <div class="avatar"><robot-outlined /></div>
            <div class="bubble bubble-ai loading-pulse">
              <div class="typing-dot"></div>
              <div class="typing-dot"></div>
              <div class="typing-dot"></div>
            </div>
          </div>
        </div>

        <!-- ПОЛЕ ВВОДА -->
        <div class="input-area-glass">
          <!-- Скрытый инпут для файла -->
          <input
            type="file"
            ref="fileInput"
            accept="application/pdf"
            style="display: none"
            @change="handleFileUpload"
          />

          <transition name="scale">
            <button
              v-if="currentMode === 'resume'"
              class="btn-attach-glass"
              title="Загрузить PDF"
              @click="$refs.fileInput.click()"
              :disabled="loading"
            >
              <paper-clip-outlined />
            </button>
          </transition>

          <div class="textarea-wrapper">
            <textarea
              v-model="newMessage"
              @keydown.enter.prevent="sendMessage"
              :placeholder="currentMode === 'vacancy' ? 'Какую вакансию ищем?' : 'Напишите опыт или прикрепите PDF...'"
              rows="1"
            ></textarea>
          </div>

          <button @click="sendMessage" :disabled="loading || !newMessage.trim()" class="btn-send-gradient">
            <send-outlined />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import api from '../axios';
import { marked } from 'marked';
import { Modal, message } from 'ant-design-vue';
import {
  RobotOutlined, UserOutlined, PaperClipOutlined,
  DeleteOutlined, SearchOutlined, FileTextOutlined, SendOutlined
} from '@ant-design/icons-vue';

export default {
  components: {
    RobotOutlined, UserOutlined, PaperClipOutlined,
    DeleteOutlined, SearchOutlined, FileTextOutlined, SendOutlined
  },
  data() {
    return {
      messages: [],
      newMessage: '',
      loading: false,
      currentMode: 'vacancy'
    };
  },
  computed: {
    sliderStyle() {
      return {
        transform: this.currentMode === 'vacancy' ? 'translateX(0)' : 'translateX(100%)'
      };
    }
  },
  async mounted() {
    await this.loadHistory();
  },
  methods: {
    async loadHistory() {
      try {
        const response = await api.get('/chat/history');
        this.messages = response.data;
        this.scrollToBottom();
      } catch (e) { console.error(e); }
    },

    setMode(mode) {
      if (this.currentMode === mode) return;
      this.currentMode = mode;
      this.messages = []; // Очистка чата при смене режима
      message.info(`Режим: ${mode === 'vacancy' ? 'Поиск вакансий' : 'Анализ резюме'}`);
    },

    async sendMessage() {
      if (!this.newMessage.trim()) return;
      const text = this.newMessage;
      this.newMessage = '';
      this.messages.push({ role: 'user', content: text });
      this.scrollToBottom();
      this.loading = true;

      try {
        const response = await api.post('/chat/send', { message: text, mode: this.currentMode });
        this.messages.push(response.data);
        this.scrollToBottom();
      } catch (e) {
        this.messages.push({ role: 'assistant', content: 'Ошибка связи с ИИ.' });
      } finally { this.loading = false; }
    },

    async handleFileUpload(event) {
      const file = event.target.files[0];
      if (!file) return;
      if (file.type !== 'application/pdf') { message.error('Только PDF!'); return; }

      event.target.value = '';
      this.loading = true;
      this.messages.push({ role: 'user', content: `📎 Файл: ${file.name}` });
      this.scrollToBottom();

      const formData = new FormData();
      formData.append('file', file);
      try {
        const response = await api.post('/chat/upload-resume', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        this.messages.push(response.data);
        this.scrollToBottom();
      } catch (e) {
        this.messages.push({ role: 'assistant', content: 'Ошибка чтения файла.' });
      } finally { this.loading = false; }
    },

    clearHistory() {
      Modal.confirm({
        title: 'Удалить историю?',
        okText: 'Да', okType: 'danger', cancelText: 'Нет',
        onOk: async () => {
          await api.delete('/chat/clear');
          this.messages = [];
        }
      });
    },

    scrollToBottom() {
      this.$nextTick(() => {
        const container = this.$refs.msgContainer;
        if (container) container.scrollTop = container.scrollHeight;
      });
    },
    formatText(text) {
      return marked.parse(text || '', { breaks: true });
    }
  }
};
</script>

<style scoped>
/* === ОСНОВНОЙ ЛЭЙАУТ === */
.page-wrapper {
  position: relative;
  width: 100%;
  min-height: 85vh;
  overflow: hidden;
  display: flex;
  justify-content: center;
}

/* === ПЛАВАЮЩИЕ ПУЗЫРЬКИ (BLOBS) === */
.blobs-container {
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
}

.blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(60px);
  opacity: 0.6;
  animation: float 10s infinite alternate ease-in-out;
}

.blob-1 {
  width: 400px; height: 400px;
  background: #a855f7; /* Purple */
  top: -50px; left: -100px;
  animation-duration: 12s;
}

.blob-2 {
  width: 350px; height: 350px;
  background: #3b82f6; /* Blue */
  bottom: -50px; right: -50px;
  animation-duration: 15s;
  animation-delay: 1s;
}

.blob-3 {
  width: 300px; height: 300px;
  background: #ec4899; /* Pink */
  top: 40%; left: 40%;
  opacity: 0.4;
  animation-duration: 18s;
  animation-delay: 2s;
}

@keyframes float {
  0% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(30px, 50px) scale(1.1); }
  100% { transform: translate(-20px, -30px) scale(0.9); }
}

/* === КОНТЕНТ === */
.content-container {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 1000px;
  display: flex;
  flex-direction: column;
  padding: 20px;
  margin: 0 auto;
}

/* HEADER */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 25px;
  position: relative;
  z-index: 20;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.header-left h1 {
  display: flex;
  align-items: center;
  gap: 15px;
  font-size: 2rem;
  font-weight: 800;
  color: #1f2937;
  margin: 0;
  line-height: 1;
}

.ai-avatar-glow {
  width: 45px; height: 45px;
  background: linear-gradient(135deg, #6366f1, #a855f7);
  color: white;
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.5rem;
  box-shadow: 0 0 20px rgba(99, 102, 241, 0.5);
}

.actions {
  margin-top: 5px;
}

/* Кнопка удаления */
.btn-delete-glass {
  width: 45px;
  height: 45px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #ef4444;
  font-size: 1.3rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(5px);
}

.btn-delete-glass:hover {
  background: #fee2e2;
  transform: rotate(10deg) scale(1.1);
  box-shadow: 0 5px 15px rgba(239, 68, 68, 0.2);
}


/* SWITCHER */
.glass-switcher {
  position: relative;
  display: flex;
  background: rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 4px;
  border: 1px solid rgba(255,255,255,0.5);
  width: 300px;
  cursor: pointer;
}
.switch-option {
  flex: 1;
  text-align: center;
  padding: 8px;
  font-weight: 600;
  font-size: 0.9rem;
  color: #6b7280;
  z-index: 2;
  transition: color 0.3s;
}
.switch-option.active { color: #4f46e5; }
.switch-slider {
  position: absolute;
  top: 4px; left: 4px;
  width: calc(50% - 4px); height: calc(100% - 8px);
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
  transition: transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
  z-index: 1;
}

/* === CHAT AREA === */
.chat-glass-card {
  flex-grow: 1;
  background: rgba(255, 255, 255, 0.75); /* Чуть плотнее */
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.9);
  border-radius: 24px;
  box-shadow: 0 20px 50px rgba(0,0,0,0.05);

  display: flex;
  flex-direction: column;
  overflow: hidden;

  height: 70vh; /* ФИКС ВЫСОТЫ */
  width: 100%;
  position: relative;
  z-index: 10;
  margin-top: 20px;
}

.messages-area {
  flex: 1;
  padding: 25px;
  overflow-y: auto;
  display: flex; flex-direction: column; gap: 20px;
}

/* Custom Scrollbar */
.custom-scroll::-webkit-scrollbar { width: 6px; }
.custom-scroll::-webkit-scrollbar-track { background: transparent; }
.custom-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }

/* Messages */
.message-row { display: flex; gap: 15px; max-width: 85%; align-items: flex-end; }
.row-user { align-self: flex-end; flex-direction: row-reverse; }
.row-ai { align-self: flex-start; }

.avatar {
  width: 35px; height: 35px; flex-shrink: 0;
  background: rgba(255,255,255,0.8);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 10px rgba(0,0,0,0.05);
  font-size: 1.1rem; color: #6b7280;
}

.bubble {
  padding: 15px 20px;
  border-radius: 20px;
  font-size: 0.95rem;
  line-height: 1.6;
  position: relative;
  box-shadow: 0 4px 15px rgba(0,0,0,0.03);
}
.bubble-user {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
  border-bottom-right-radius: 4px;
}
.bubble-ai {
  background: white;
  color: #1f2937;
  border-bottom-left-radius: 4px;
}

/* Input Area */
.input-area-glass {
  padding: 20px;
  background: rgba(255,255,255,0.5);
  border-top: 1px solid rgba(255,255,255,0.6);
  display: flex; gap: 10px; align-items: flex-end;
}

.textarea-wrapper {
  flex-grow: 1;
  background: white;
  border-radius: 16px;
  padding: 2px;
  box-shadow: inset 0 2px 5px rgba(0,0,0,0.02);
  border: 1px solid #e5e7eb;
  transition: 0.3s;
}
.textarea-wrapper:focus-within { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }

textarea {
  width: 100%; padding: 12px 15px; border: none; outline: none;
  background: transparent; resize: none; max-height: 100px; font-family: inherit;
}

.btn-send-gradient {
  width: 50px; height: 50px; border-radius: 16px; border: none;
  background: linear-gradient(135deg, #6366f1, #ec4899);
  color: white; cursor: pointer; font-size: 1.2rem;
  display: flex; align-items: center; justify-content: center;
  transition: 0.3s;
  box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);
}
.btn-send-gradient:hover { transform: scale(1.05) rotate(-10deg); }
.btn-send-gradient:disabled { opacity: 0.5; transform: none; cursor: default; }

.btn-attach-glass {
  width: 50px; height: 50px; border-radius: 16px; border: 1px solid rgba(0,0,0,0.1);
  background: white; color: #64748b; cursor: pointer; font-size: 1.2rem;
  display: flex; align-items: center; justify-content: center;
  transition: 0.2s;
}
.btn-attach-glass:hover { color: #6366f1; background: #f8fafc; }

/* Empty State */
.empty-state {
  height: 100%; display: flex; align-items: center; justify-content: center;
}
.empty-content {
  text-align: center;
  background: rgba(255,255,255,0.6);
  padding: 40px; border-radius: 24px;
  border: 1px solid white;
  box-shadow: 0 10px 30px rgba(0,0,0,0.05);
}
.icon-wrapper {
  font-size: 4rem; margin-bottom: 20px;
  background: -webkit-linear-gradient(#6366f1, #ec4899);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
}
.suggestion-chips {
  display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin-top: 20px;
}
.suggestion-chips span {
  background: white; padding: 8px 16px; border-radius: 20px;
  font-size: 0.85rem; color: #6366f1; border: 1px solid #e0e7ff;
  cursor: pointer; transition: 0.2s;
}
.suggestion-chips span:hover { background: #6366f1; color: white; transform: translateY(-2px); }

/* Animations */
.loading-pulse { display: flex; gap: 5px; padding: 20px !important; }
.typing-dot { width: 8px; height: 8px; background: #6366f1; border-radius: 50%; animation: pulse 1.4s infinite ease-in-out both; }
.typing-dot:nth-child(1) { animation-delay: -0.32s; }
.typing-dot:nth-child(2) { animation-delay: -0.16s; }
@keyframes pulse { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }

.fade-in-down { animation: fadeInDown 0.8s ease; }
.message-anim-enter-active, .message-anim-leave-active { transition: all 0.3s ease; }
.message-anim-enter-from { opacity: 0; transform: translateY(20px); }
@keyframes fadeInDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
</style>