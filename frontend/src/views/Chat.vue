<template>
  <div class="page-wrapper">

    <!-- ФОН -->
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

          <!-- ПЕРЕКЛЮЧАТЕЛЬ (3 РЕЖИМА) -->
          <div class="glass-switcher three-modes">
            <div class="switch-option" :class="{ active: currentMode === 'vacancy' }" @click="setMode('vacancy')">
              <search-outlined /> Поиск
            </div>
            <div class="switch-option" :class="{ active: currentMode === 'resume' }" @click="setMode('resume')">
              <file-text-outlined /> Резюме
            </div>
            <div class="switch-option" :class="{ active: currentMode === 'interview' }" @click="setMode('interview')">
              <audio-outlined /> Интервью
            </div>

            <!-- Бегунок (логика в computed) -->
            <div class="switch-slider" :style="sliderStyle"></div>
          </div>
        </div>

        <!-- КНОПКИ ДЕЙСТВИЙ -->
        <div class="actions">
          <transition name="fade" mode="out-in">
             <!-- Очистка (для чатов) -->
            <button v-if="currentMode !== 'resume'" @click="clearHistory" class="btn-delete-glass" title="Очистить историю" key="clear">
              <delete-outlined />
            </button>

             <!-- Кнопки Резюме -->
            <div v-else class="resume-actions">
               <button @click="saveToProfile" class="btn-save-glass" :disabled="saving || generatingPdf">
                  <loading-outlined v-if="saving" />
                  <save-outlined v-else />
                  <span>Сохранить</span>
               </button>

               <button @click="downloadPDF" class="btn-download-glass" :disabled="generatingPdf || saving">
                  <loading-outlined v-if="generatingPdf" />
                  <download-outlined v-else />
                  <span>PDF</span>
               </button>
            </div>
          </transition>
        </div>
      </header>

      <!-- КОНТЕНТ РЕЖИМОВ -->
      <div class="mode-container">
        <transition name="mode-switch" mode="out-in">

          <!-- === РЕЖИМ 1 и 3: ЧАТ (ВАКАНСИИ или ИНТЕРВЬЮ) === -->
          <div v-if="currentMode === 'vacancy' || currentMode === 'interview'" :key="currentMode" class="chat-glass-card">
            <div class="messages-area custom-scroll" ref="msgContainer">

              <transition name="fade" mode="out-in">
                <div v-if="messages.length === 0" class="empty-state">
                  <div class="empty-content">
                    <div class="icon-wrapper">
                        <search-outlined v-if="currentMode === 'vacancy'" />
                        <audio-outlined v-else />
                    </div>
                    <h3>{{ currentMode === 'vacancy' ? 'Поиск работы' : 'Тренировка собеседования' }}</h3>
                    <p class="subtitle-text">
                        {{ currentMode === 'vacancy' ? 'Я подберу лучшие вакансии для вас.' : 'Я проведу техническое интервью и оценю ваши знания.' }}
                    </p>

                    <!-- Подсказки -->
                    <div class="suggestion-chips" v-if="currentMode === 'vacancy'">
                      <span @click="newMessage = 'Найди работу Python Junior'">Python Junior</span>
                      <span @click="newMessage = 'Какие навыки нужны для DevOps?'">DevOps</span>
                    </div>
                    <div class="suggestion-chips" v-else>
                      <span @click="startInterview('Frontend Junior')">Frontend Junior</span>
                      <span @click="startInterview('Python Backend')">Python Backend</span>
                      <span @click="startInterview('SQL и Базы Данных')">SQL & DB</span>
                    </div>
                  </div>
                </div>
              </transition>

              <!-- Сообщения -->
              <transition-group name="message-anim">
                <div v-for="(msg, index) in messages" :key="index" class="message-row" :class="msg.role === 'user' ? 'row-user' : 'row-ai'">
                  <div class="avatar"><user-outlined v-if="msg.role === 'user'" /><robot-outlined v-else /></div>
                  <div class="bubble" :class="msg.role === 'user' ? 'bubble-user' : 'bubble-ai'">
                    <div class="text" v-html="formatText(msg.content)"></div>
                  </div>
                </div>
              </transition-group>

              <!-- Лоадер -->
              <div v-if="loading" class="message-row row-ai">
                <div class="avatar"><robot-outlined /></div>
                <div class="bubble bubble-ai loading-pulse"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>
              </div>
            </div>

            <!-- Ввод -->
            <div class="input-area-glass">
              <div class="textarea-wrapper">
                <textarea
                    v-model="newMessage"
                    @keydown.enter.prevent="sendMessage"
                    :placeholder="currentMode === 'vacancy' ? 'Какую вакансию ищем?' : 'Ваш ответ...'"
                    rows="1">
                </textarea>
              </div>
              <button @click="sendMessage" :disabled="loading || !newMessage.trim()" class="btn-send-gradient"><send-outlined /></button>
            </div>
          </div>

          <!-- === РЕЖИМ 2: КОНСТРУКТОР РЕЗЮМЕ === -->
          <div v-else key="resume" class="resume-builder-wrapper">

             <!-- ЛЕВАЯ КОЛОНКА -->
             <div class="form-column custom-scroll">
               <div class="glass-card section-card">
                  <h3><user-outlined /> Личные данные</h3>
                  <div class="form-group"><label>ФИО</label><input v-model="resume.fullName" placeholder="Иван Иванов" class="glass-input" /></div>
                  <div class="form-group"><label>Должность</label><input v-model="resume.position" placeholder="Frontend Developer" class="glass-input" /></div>
                  <div class="form-group"><label>Контакты</label><input v-model="resume.contacts" placeholder="email@mail.com" class="glass-input" /></div>
               </div>

               <div class="glass-card section-card">
                  <div class="sec-head">
                      <h3><file-text-outlined /> О себе</h3>
                      <button class="btn-ai-small" @click="improveText('summary')" :disabled="aiLoading">
                          <robot-filled /> {{ aiLoading ? '...' : 'AI' }}
                      </button>
                  </div>
                  <textarea v-model="resume.summary" rows="3" class="glass-input" placeholder="Кратко о вашем опыте..."></textarea>
               </div>

               <div class="glass-card section-card">
                   <h3><thunderbolt-outlined /> Навыки</h3>
                   <textarea v-model="resume.skills" rows="2" class="glass-input" placeholder="JavaScript, Vue.js, Node.js..."></textarea>
               </div>

               <div class="glass-card section-card">
                  <div class="sec-head">
                      <!-- ИСПРАВЛЕНО ЗДЕСЬ: заменено briefcase-outlined на solution-outlined -->
                      <h3><solution-outlined /> Опыт</h3>
                      <button class="btn-add" @click="addExperience"><plus-outlined /></button>
                  </div>
                  <div v-for="(exp, index) in resume.experience" :key="index" class="exp-item">
                     <input v-model="exp.company" placeholder="Компания" class="glass-input mb-2" />
                     <input v-model="exp.role" placeholder="Должность" class="glass-input mb-2" />
                     <div class="textarea-ai">
                         <textarea v-model="exp.description" rows="2" class="glass-input" placeholder="Обязанности"></textarea>
                         <button class="ai-btn-icon" @click="improveExp(index)"><star-outlined /></button>
                     </div>
                     <button class="btn-remove" @click="removeExperience(index)"><delete-outlined /></button>
                  </div>
               </div>
             </div>

             <!-- ПРАВАЯ КОЛОНКА -->
             <div class="preview-column custom-scroll">
                <div class="a4-page" id="resume-preview">
                   <div class="r-header">
                      <h1 class="r-name">{{ resume.fullName || 'ВАШЕ ИМЯ' }}</h1>
                      <p class="r-pos">{{ resume.position }}</p>
                      <p class="r-contact">{{ resume.contacts }}</p>
                   </div>

                   <div class="r-sec" v-if="resume.summary">
                      <h3 class="r-title">О СЕБЕ</h3>
                      <div class="r-line"></div>
                      <p class="r-text">{{ resume.summary }}</p>
                   </div>

                   <div class="r-sec" v-if="resume.skills">
                      <h3 class="r-title">НАВЫКИ</h3>
                      <div class="r-line"></div>
                      <p class="r-text">{{ resume.skills }}</p>
                   </div>

                   <div class="r-sec" v-if="resume.experience.length">
                      <h3 class="r-title">ОПЫТ РАБОТЫ</h3>
                      <div class="r-line"></div>
                      <div v-for="(e, i) in resume.experience" :key="i" class="r-item">
                         <div class="r-row">
                            <b>{{ e.company }}</b>
                            <span>{{ e.role }}</span>
                         </div>
                         <p class="r-text">{{ e.description }}</p>
                      </div>
                   </div>
                </div>
             </div>

             <input type="file" ref="fileInput" accept="application/pdf" style="display: none" @change="handleFileUpload" />
             <button class="btn-floating-upload" @click="$refs.fileInput.click()" title="Загрузить PDF">
                <paper-clip-outlined />
             </button>
          </div>

        </transition>
      </div>

    </div>
  </div>
</template>

<script>
import api from '../axios';
import { marked } from 'marked';
import { Modal, message } from 'ant-design-vue';
import html2pdf from 'html2pdf.js';
// ИСПРАВЛЕНЫ ИМПОРТЫ (удален BriefcaseOutlined, добавлен SolutionOutlined)
import {
  RobotOutlined, UserOutlined, DeleteOutlined, SearchOutlined,
  FileTextOutlined, SendOutlined, PlusOutlined, RobotFilled,
  DownloadOutlined, PaperClipOutlined, LoadingOutlined, SaveOutlined,
  AudioOutlined, ThunderboltOutlined, SolutionOutlined, StarOutlined
} from '@ant-design/icons-vue';
import { reactive, ref, onMounted, computed } from 'vue';

export default {
  components: {
    RobotOutlined, UserOutlined, DeleteOutlined, SearchOutlined,
    FileTextOutlined, SendOutlined, PlusOutlined, RobotFilled,
    DownloadOutlined, PaperClipOutlined, LoadingOutlined, SaveOutlined,
    AudioOutlined, ThunderboltOutlined, SolutionOutlined, StarOutlined
  },
  setup() {
    const messages = ref([]);
    const newMessage = ref('');
    const loading = ref(false);
    const currentMode = ref('vacancy');
    const generatingPdf = ref(false);
    const saving = ref(false);

    const aiLoading = ref(false);
    const resume = reactive({
      fullName: '', position: '', contacts: '', summary: '', skills: '',
      experience: [{ company: '', role: '', description: '' }]
    });

    const sliderStyle = computed(() => {
       if (currentMode.value === 'vacancy') return { transform: 'translateX(0)', width: '33.33%' };
       if (currentMode.value === 'resume') return { transform: 'translateX(100%)', width: '33.33%' };
       return { transform: 'translateX(200%)', width: '33.33%' }; // interview
    });

    const loadHistory = async () => {
        try { const r = await api.get('/chat/history'); messages.value = r.data; } catch(e){}
    };

    const setMode = (mode) => {
        currentMode.value = mode;
        messages.value = [];
    };

    const clearHistory = () => { Modal.confirm({ title: 'Удалить историю?', okText:'Да', okType:'danger', onOk: async () => { await api.delete('/chat/clear'); messages.value = []; } }); };

    const sendMessage = async () => {
      if(!newMessage.value.trim()) return;
      const txt = newMessage.value; newMessage.value='';
      messages.value.push({role:'user',content:txt}); loading.value=true;
      try {
          const r = await api.post('/chat/send', {message:txt, mode: currentMode.value});
          messages.value.push(r.data);
      }
      catch(e){ messages.value.push({role:'assistant',content:'Ошибка связи'}); } finally{loading.value=false;}
    };

    const startInterview = (topic) => {
        newMessage.value = `Проведи со мной собеседование на тему: ${topic}`;
        sendMessage();
    };

    const formatText = (t) => marked.parse(t||'',{breaks:true});

    // RESUME
    const addExperience = () => resume.experience.push({company:'',role:'',description:''});
    const removeExperience = (i) => resume.experience.splice(i,1);
    const improveText = async (field) => {
       if(!resume[field]) return message.warning('Пусто');
       aiLoading.value=true;
       try { const r = await api.post('/chat/improve', {text: resume[field]}); resume[field]=r.data.result; message.success('Готово'); }
       catch(e){} finally{aiLoading.value=false;}
    };
    const improveExp = async (i) => {
       const txt = resume.experience[i].description;
       if(!txt) return;
       try { const r = await api.post('/chat/improve', {text:txt}); resume.experience[i].description=r.data.result; message.success('Готово'); } catch(e){}
    };

    const downloadPDF = () => {
       const element = document.getElementById('resume-preview');
       if(!element) return;
       generatingPdf.value = true;
       const opt = { margin: 0, filename: `Resume.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: 'mm', format: 'a4' } };
       html2pdf().set(opt).from(element).save().then(() => { generatingPdf.value=false; message.success('Скачано'); }).catch(()=>{generatingPdf.value=false;});
    };

    const saveToProfile = async () => {
       const element = document.getElementById('resume-preview');
       if(!element) return;
       saving.value = true;
       try {
           const opt = { margin: 0, filename: `Resume_AI_${Date.now()}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: 'mm', format: 'a4' } };
           const pdfBlob = await html2pdf().set(opt).from(element).output('blob');
           const file = new File([pdfBlob], opt.filename, { type: 'application/pdf' });
           const formData = new FormData(); formData.append('file', file);
           await api.post('/resumes', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
           message.success('Сохранено в профиле');
       } catch (e) { message.error('Ошибка'); } finally { saving.value = false; }
    };

    const handleFileUpload = async (event) => {
      const file = event.target.files[0];
      if (!file) return;
      if(currentMode.value !== 'resume') { message.warning('Включите режим Резюме'); return; }
      message.info('Файл выбран');
    };

    onMounted(loadHistory);

    return {
      messages, newMessage, loading, currentMode, setMode, sliderStyle,
      sendMessage, clearHistory, formatText, handleFileUpload, startInterview,
      resume, aiLoading, addExperience, removeExperience, improveText, improveExp,
      downloadPDF, generatingPdf, saveToProfile, saving
    };
  }
};
</script>

<style scoped>
/* СТИЛИ ОСТАВЛЯЕМ БЕЗ ИЗМЕНЕНИЙ, ОНИ НЕ ВЛИЯЮТ НА ОШИБКУ */
.page-wrapper { position: relative; width: 100%; min-height: 85vh; overflow: hidden; display: flex; justify-content: center; }
.blobs-container { position: absolute; inset: 0; z-index: 0; pointer-events: none; }
.blob { position: absolute; border-radius: 50%; filter: blur(60px); opacity: 0.6; animation: float 10s infinite alternate; }
.blob-1 { width: 400px; height: 400px; background: #a855f7; top: -50px; left: -100px; }
.blob-2 { width: 350px; height: 350px; background: #3b82f6; bottom: -50px; right: -50px; animation-delay: 1s; }
.blob-3 { width: 300px; height: 300px; background: #ec4899; top: 40%; left: 40%; opacity: 0.4; animation-duration: 18s; }
@keyframes float { 0%{transform:translate(0,0)} 100%{transform:translate(20px,20px)} }

.content-container { position: relative; z-index: 1; width: 100%; max-width: 1100px; padding: 20px; display: flex; flex-direction: column; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 25px; }
.header-left { display: flex; flex-direction: column; gap: 15px; }
.header-left h1 { display: flex; align-items: center; gap: 15px; font-size: 2rem; font-weight: 800; color: #1f2937; margin: 0; }
.ai-avatar-glow { width: 45px; height: 45px; background: linear-gradient(135deg, #6366f1, #a855f7); color: white; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; box-shadow: 0 0 20px rgba(99, 102, 241, 0.5); }

/* 3-MODE SWITCHER */
.glass-switcher { position: relative; display: flex; background: rgba(255,255,255,0.3); backdrop-filter: blur(10px); border-radius: 12px; padding: 4px; border: 1px solid rgba(255,255,255,0.5); width: 400px; cursor: pointer; }
.switch-option { flex: 1; text-align: center; padding: 8px; font-weight: 600; color: #6b7280; z-index: 2; transition: 0.3s; display: flex; align-items: center; justify-content: center; gap: 8px; }
.switch-option.active { color: #4f46e5; }
.switch-slider { position: absolute; top: 4px; left: 4px; height: calc(100% - 8px); background: white; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); transition: transform 0.3s ease; z-index: 1; }

.actions { margin-top: 5px; }
.resume-actions { display: flex; gap: 10px; }
.btn-delete-glass, .btn-download-glass, .btn-save-glass { background: rgba(255,255,255,0.5); border: 1px solid rgba(0,0,0,0.1); border-radius: 12px; padding: 10px 15px; cursor: pointer; font-weight: 600; color: #4b5563; transition: 0.2s; display: flex; align-items: center; gap: 6px; }
.btn-delete-glass:hover { background: #fee2e2; color: #ef4444; }
.btn-download-glass:hover { background: #e0e7ff; color: #4f46e5; }
.btn-save-glass { background: #dcfce7; color: #16a34a; border-color: #16a34a; }
.btn-save-glass:hover { background: #22c55e; color: white; }

/* CONTAINER */
.mode-container { flex-grow: 1; position: relative; display: flex; flex-direction: column; }

/* CHAT */
.chat-glass-card { background: rgba(255, 255, 255, 0.75); backdrop-filter: blur(20px); border-radius: 24px; box-shadow: 0 20px 50px rgba(0,0,0,0.05); display: flex; flex-direction: column; height: 70vh; width: 100%; margin-top: 20px; border: 1px solid rgba(255, 255, 255, 0.9); }
.messages-area { flex: 1; padding: 25px; overflow-y: auto; display: flex; flex-direction: column; gap: 20px; }
.input-area-glass { padding: 20px; background: rgba(255,255,255,0.5); border-top: 1px solid rgba(255,255,255,0.6); display: flex; gap: 10px; align-items: flex-end; }
.textarea-wrapper { flex: 1; background: white; border-radius: 16px; padding: 2px; border: 1px solid #e5e7eb; }
textarea { width: 100%; padding: 12px 15px; border: none; outline: none; resize: none; max-height: 100px; font-family: inherit; }
.btn-send-gradient { width: 50px; height: 50px; border-radius: 16px; background: linear-gradient(135deg, #6366f1, #ec4899); color: white; border: none; cursor: pointer; font-size: 1.2rem; display: flex; align-items: center; justify-content: center; }

.message-row { display: flex; gap: 10px; max-width: 85%; }
.row-user { align-self: flex-end; flex-direction: row-reverse; }
.bubble { padding: 12px 18px; border-radius: 20px; font-size: 0.95rem; line-height: 1.6; box-shadow: 0 4px 15px rgba(0,0,0,0.03); }
.bubble-user { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; border-bottom-right-radius: 4px; }
.bubble-ai { background: white; color: #1f2937; border-bottom-left-radius: 4px; }
.avatar { width: 35px; height: 35px; background: rgba(255,255,255,0.8); border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }

/* RESUME */
.resume-builder-wrapper { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; height: 70vh; width: 100%; margin-top: 20px; }
.form-column { overflow-y: auto; padding-right: 5px; display: flex; flex-direction: column; gap: 15px; }
.preview-column { background: #525659; border-radius: 20px; padding: 20px; display: flex; justify-content: center; overflow-y: auto; }
.glass-card { background: rgba(255,255,255,0.7); backdrop-filter: blur(15px); border-radius: 16px; padding: 20px; border: 1px solid white; }
.glass-input { width: 100%; padding: 10px; border-radius: 10px; border: 1px solid #e5e7eb; outline: none; background: rgba(255,255,255,0.9); font-size: 0.9rem; }
.section-card h3 { margin: 0 0 10px 0; font-size: 1.1rem; color: #374151; display: flex; align-items: center; gap: 8px; }
.sec-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.btn-ai-small { background: linear-gradient(135deg, #8b5cf6, #6366f1); color: white; border: none; padding: 4px 10px; border-radius: 8px; cursor: pointer; font-size: 0.8rem; display: flex; align-items: center; gap: 5px; }
.btn-add { background: #10b981; color: white; width: 28px; height: 28px; border-radius: 50%; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.exp-item { background: #f9fafb; padding: 10px; border-radius: 10px; margin-bottom: 10px; border: 1px solid #e5e7eb; }
.textarea-ai { position: relative; margin-top: 5px; }
.ai-btn-icon { position: absolute; bottom: 5px; right: 5px; background: white; border: 1px solid #e5e7eb; border-radius: 50%; width: 26px; height: 26px; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
.btn-remove { font-size: 0.75rem; color: #ef4444; background: none; border: none; cursor: pointer; margin-top: 5px; }
.mb-2 { margin-bottom: 5px; }
.btn-floating-upload { position: absolute; bottom: 20px; right: 20px; width: 50px; height: 50px; border-radius: 50%; background: white; box-shadow: 0 4px 15px rgba(0,0,0,0.1); border: none; cursor: pointer; font-size: 1.2rem; color: #6366f1; z-index: 100; transition: transform 0.2s; }
.btn-floating-upload:hover { transform: scale(1.1); }

.a4-page { width: 210mm; min-height: 297mm; background: white; padding: 15mm; box-shadow: 0 5px 30px rgba(0,0,0,0.3); font-family: 'Times New Roman', serif; color: #000; font-size: 11pt; line-height: 1.5; }
.r-header { text-align: center; margin-bottom: 20px; }
.r-name { font-size: 22pt; font-weight: bold; text-transform: uppercase; margin: 0; letter-spacing: 1px; }
.r-pos { font-size: 14pt; color: #444; margin: 5px 0; }
.r-contact { font-size: 10pt; color: #333; }
.r-sec { margin-bottom: 15px; }
.r-sec h3 { font-size: 12pt; font-weight: bold; border-bottom: 2px solid #333; padding-bottom: 2px; margin-bottom: 10px; letter-spacing: 1px; text-transform: uppercase; }
.r-item { margin-bottom: 12px; }
.r-row { display: flex; justify-content: space-between; font-weight: bold; font-size: 12pt; }
.r-text { white-space: pre-wrap; text-align: justify; }

/* UTILS & ANIM */
.custom-scroll::-webkit-scrollbar { width: 5px; }
.custom-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
.empty-state { height: 100%; display: flex; align-items: center; justify-content: center; text-align: center; }
.empty-content { background: rgba(255,255,255,0.6); padding: 30px; border-radius: 20px; }
.icon-wrapper { font-size: 3rem; margin-bottom: 10px; color: #6366f1; }
.suggestion-chips { display: flex; gap: 10px; justify-content: center; margin-top: 15px; flex-wrap: wrap; }
.suggestion-chips span { background: white; padding: 5px 12px; border-radius: 15px; color: #6366f1; cursor: pointer; border: 1px solid #e0e7ff; font-size: 0.85rem; }
.suggestion-chips span:hover { background: #6366f1; color: white; transform: translateY(-2px); }

.fade-in-down { animation: fadeInDown 0.6s ease; }
@keyframes fadeInDown { from{opacity:0;transform:translateY(-20px)} to{opacity:1;transform:translateY(0)} }
.mode-switch-enter-active, .mode-switch-leave-active { transition: opacity 0.3s ease; }
.mode-switch-enter-from, .mode-switch-leave-to { opacity: 0; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.loading-pulse { display: flex; gap: 5px; padding: 20px !important; }
.typing-dot { width: 8px; height: 8px; background: #6366f1; border-radius: 50%; animation: pulse 1.4s infinite ease-in-out both; }
.typing-dot:nth-child(1) { animation-delay: -0.32s; }
.typing-dot:nth-child(2) { animation-delay: -0.16s; }
@keyframes pulse { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }
</style>