<template>
  <div class="page-container">
    <header class="page-header">
      <h1>🤖 Карьерный ассистент</h1>
      <div class="actions">
        <button @click="clearHistory" class="btn-clear">Начать заново</button>
        <button @click="$router.push('/')" class="btn-back">На главную</button>
      </div>
    </header>

    <div class="chat-container">
      <div class="messages-area" ref="msgContainer">
        <!-- Приветствие, если пусто -->
        <div v-if="messages.length === 0" class="empty-state">
          <p>Привет! Я ИИ-консультант.</p>
          <p>Расскажи мне, какие технологии тебе нравятся, и я подберу вакансию.</p>
        </div>

        <!-- Сообщения -->
        <div
          v-for="(msg, index) in messages"
          :key="index"
          class="message-bubble"
          :class="msg.role === 'user' ? 'my-msg' : 'ai-msg'"
        >
          <div class="sender">{{ msg.role === 'user' ? 'Вы' : 'Ассистент' }}</div>
          <div class="text" v-html="formatText(msg.content)"></div>
        </div>

        <!-- Индикатор печати -->
        <div v-if="loading" class="message-bubble ai-msg loading-bubble">
          <span class="dot">.</span><span class="dot">.</span><span class="dot">.</span>
        </div>
      </div>

      <div class="input-area">
        <textarea
          v-model="newMessage"
          @keydown.enter.prevent="sendMessage"
          placeholder="Напишите сообщение... (Enter для отправки)"
          rows="1"
        ></textarea>
        <button @click="sendMessage" :disabled="loading || !newMessage.trim()">
          ➤
        </button>
      </div>

      <div class="disclaimer">
        ⚠️ ИИ может ошибаться. Пожалуйста, проверяйте информацию о вакансиях и не полагайтесь полностью на советы бота.
      </div>

    </div>
  </div>
</template>

<script>
import api from '../axios';
import { marked } from 'marked'; // <--- Импортируем парсер

export default {
  data() {
    return {
      messages: [],
      newMessage: '',
      loading: false
    };
  },
  async mounted() {
    await this.loadHistory();
    this.scrollToBottom();
  },
  methods: {
    async loadHistory() {
      try {
        const response = await api.get('/chat/history');
        this.messages = response.data;
      } catch (e) { console.error(e); }
    },
    async sendMessage() {
      if (!this.newMessage.trim()) return;

      const text = this.newMessage;
      this.newMessage = '';

      this.messages.push({ role: 'user', content: text });
      this.scrollToBottom();
      this.loading = true;

      try {
        const response = await api.post('/chat/send', { message: text });
        this.messages.push(response.data);
        this.scrollToBottom();
      } catch (e) {
        this.messages.push({ role: 'assistant', content: 'Ошибка связи с ИИ.' });
      } finally {
        this.loading = false;
      }
    },
    async clearHistory() {
      if(!confirm('Удалить переписку?')) return;
      await api.delete('/chat/clear');
      this.messages = [];
    },
    scrollToBottom() {
      this.$nextTick(() => {
        const container = this.$refs.msgContainer;
        if (container) container.scrollTop = container.scrollHeight;
      });
    },

    // ОБНОВЛЕННЫЙ МЕТОД
    formatText(text) {
      // breaks: true превращает нажатие Enter в тег <br>,
      // это чинит списки, которые ИИ пишет слитно.
      return marked.parse(text, { breaks: true });
    }
  }
};
</script>

<style scoped>
.page-container { max-width: 800px; margin: 0 auto; padding: 20px; height: 90vh; display: flex; flex-direction: column; color: #333; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-shrink: 0; }
.page-header h1 { margin: 0; color: #2c3e50; font-size: 1.5em; }

.chat-container {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  background: white;
  border-radius: 12px;
  box-shadow: 0 5px 20px rgba(0,0,0,0.1);
  overflow: hidden;
  border: 1px solid #ddd;
}

.messages-area {
  flex-grow: 1;
  padding: 20px;
  overflow-y: auto;
  background: #f4f7f6;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.disclaimer {
  text-align: center;
  font-size: 0.75em;
  color: #999;
  padding: 8px;
  background: #f9f9f9;
  border-top: 1px solid #eee;
}

.message-bubble {
  max-width: 80%;
  padding: 12px 16px;
  border-radius: 12px;
  line-height: 1.5;
  position: relative;
  font-size: 0.95em;
}

.my-msg {
  align-self: flex-end;
  background: #3498db;
  color: white;
  border-bottom-right-radius: 2px;
}

.ai-msg {
  align-self: flex-start;
  background: white;
  color: #333;
  border: 1px solid #e0e0e0;
  border-bottom-left-radius: 2px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}

.sender { font-size: 0.75em; margin-bottom: 4px; opacity: 0.7; font-weight: bold; }

.input-area {
  padding: 15px;
  background: white;
  border-top: 1px solid #eee;
  display: flex;
  gap: 10px;
  align-items: center;
}

textarea {
  flex-grow: 1;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 20px;
  resize: none;
  font-family: inherit;
  background-color: #fff !important;
  color: #000 !important;
  outline: none;
}
textarea:focus { border-color: #3498db; }

button {
  background: #3498db;
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 1.2em;
  transition: 0.2s;
}

/* Стили для Markdown внутри сообщений */
.text :deep(p) {
  margin: 0 0 8px 0;
}
.text :deep(p):last-child {
  margin-bottom: 0;
}

/* Жестко задаем стиль для списков */
.text :deep(ul), .text :deep(ol) {
  margin: 5px 0;
  padding-left: 25px; /* Отступ слева для точек */
  list-style-type: disc; /* Точки */
}

.text :deep(li) {
  margin-bottom: 5px;
  display: list-item; /* Принудительно делаем элементом списка */
}

.text :deep(strong) {
  font-weight: bold;
}
button:hover { background: #2980b9; }
button:disabled { background: #ccc; cursor: default; }

.btn-clear { background: transparent; color: #e74c3c; border: 1px solid #e74c3c; padding: 5px 10px; border-radius: 6px; font-size: 0.9em; }
.btn-back { background: #95a5a6; color: white; padding: 5px 10px; border: none; border-radius: 6px; margin-left: 10px; font-size: 0.9em; }

.empty-state { text-align: center; color: #888; margin-top: 50px; }
.loading-bubble { color: #888; font-style: italic; }

/* Анимация точек */
.dot { animation: blink 1.4s infinite both; }
.dot:nth-child(2) { animation-delay: 0.2s; }
.dot:nth-child(3) { animation-delay: 0.4s; }
@keyframes blink { 0% {opacity: 0.2;} 20% {opacity: 1;} 100% {opacity: 0.2;} }
</style>