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
            <div class="ai-avatar-glow"><robot-outlined /></div>
            AI Ассистент
          </h1>

          <!-- ПЕРЕКЛЮЧАТЕЛЬ -->
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
            <div class="switch-slider" :style="sliderStyle"></div>
          </div>
        </div>

        <!-- КНОПКИ ДЕЙСТВИЙ (ПРАВЫЙ УГОЛ) -->
        <div class="actions">

          <!-- 1. Кнопка ЗВУКА (БОЛЬШАЯ И ЗАМЕТНАЯ) -->
          <transition name="fade">
            <button
               v-if="currentMode === 'interview'"
               @click="isSoundOn = !isSoundOn"
               class="btn-action-icon btn-sound"
               :class="{ 'active': isSoundOn }"
               :title="isSoundOn ? 'Выключить озвучку' : 'Включить озвучку'"
             >
               <sound-outlined v-if="isSoundOn" />
               <audio-muted-outlined v-else />
             </button>
          </transition>

          <!-- 2. Кнопка ОЧИСТКИ / СОХРАНЕНИЯ -->
          <transition name="fade" mode="out-in">
             <!-- Очистка -->
            <button
              v-if="currentMode !== 'resume'"
              @click="clearHistory"
              class="btn-action-icon btn-delete"
              title="Очистить историю"
              key="clear"
            >
              <delete-outlined />
            </button>

             <!-- Кнопки Резюме -->
            <div v-else class="resume-actions">
               <button @click="saveToProfile" class="btn-save-glass" :disabled="saving || generatingPdf">
                  <loading-outlined v-if="saving" /><save-outlined v-else /><span>Сохранить</span>
               </button>
               <button @click="downloadPDF" class="btn-download-glass" :disabled="generatingPdf || saving">
                  <loading-outlined v-if="generatingPdf" /><download-outlined v-else /><span>PDF</span>
               </button>
            </div>
          </transition>
        </div>
      </header>

      <!-- КОНТЕНТ -->
      <div class="mode-container">
        <transition name="mode-switch" mode="out-in">

          <!-- === ЧАТ (VACANCY / INTERVIEW) === -->
          <div v-if="currentMode !== 'resume'" :key="currentMode" class="chat-glass-card">
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
                    <div class="suggestion-chips" v-if="currentMode === 'vacancy'">
                      <span @click="newMessage = 'Найди работу Python Junior'">Python Junior</span>
                      <span @click="newMessage = 'Какие навыки нужны для DevOps?'">DevOps</span>
                    </div>
                    <div class="suggestion-chips" v-else>
                      <span @click="startInterview('Frontend Junior')">Frontend Junior</span>
                      <span @click="startInterview('Python Backend')">Python Backend</span>
                    </div>
                  </div>
                </div>
              </transition>

              <transition-group name="message-anim">
                <div v-for="(msg, index) in messages" :key="index" class="message-row" :class="msg.role === 'user' ? 'row-user' : 'row-ai'">
                  <div class="avatar"><user-outlined v-if="msg.role === 'user'" /><robot-outlined v-else /></div>
                  <div class="bubble" :class="msg.role === 'user' ? 'bubble-user' : 'bubble-ai'">
                    <div class="text" v-html="formatText(msg.content)"></div>
                  </div>
                </div>
              </transition-group>

              <div v-if="loading" class="message-row row-ai">
                <div class="avatar"><robot-outlined /></div>
                <div class="bubble bubble-ai loading-pulse"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>
              </div>
            </div>

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

          <!-- === РЕЗЮМЕ БИЛДЕР === -->
          <div v-else key="resume" class="resume-builder-wrapper">
             <!-- ЛЕВАЯ КОЛОНКА (STEPPER) -->
             <div class="form-column">
               <div class="steps-header">
                  <div class="step-dots">
                     <div v-for="s in 4" :key="s" class="step-dot" :class="{ active: currentStep >= s, current: currentStep === s }" @click="currentStep = s">{{ s }}</div>
                  </div>
                  <div class="step-title">{{ stepTitles[currentStep - 1] }}</div>
               </div>

               <div class="step-content custom-scroll">
                 <transition name="fade-slide" mode="out-in">
                   <!-- ШАГИ (1-4) -->
                   <div v-if="currentStep === 1" key="step1" class="step-pane">
                      <div class="glass-card">
                        <h3><user-outlined /> Основная информация</h3>
                        <div class="form-group"><label>Имя Фамилия</label><input v-model="resume.fullName" class="glass-input" placeholder="Иван Иванов" /></div>
                        <div class="form-group"><label>Желаемая должность</label><input v-model="resume.position" class="glass-input" placeholder="Frontend Developer" /></div>
                        <div class="divider"></div>
                        <h3><phone-outlined /> Контакты</h3>
                        <div class="form-row">
                            <div class="form-group"><label>Email</label><input v-model="resume.email" class="glass-input" /></div>
                            <div class="form-group"><label>Телефон</label><input v-model="resume.phone" class="glass-input" /></div>
                        </div>
                        <div class="form-group"><label>Ссылки (GitHub, LinkedIn)</label><input v-model="resume.links" class="glass-input" /></div>
                      </div>
                   </div>

                   <div v-else-if="currentStep === 2" key="step2" class="step-pane">
                      <div class="glass-card mb-20">
                        <div class="sec-head">
                            <h3><file-text-outlined /> О себе (Summary)</h3>
                            <button class="btn-ai-small" @click="improveText('summary')" :disabled="aiLoading"><robot-filled /> AI Improve</button>
                        </div>
                        <textarea v-model="resume.summary" rows="4" class="glass-input" placeholder="Кратко о себе..."></textarea>
                      </div>
                      <div class="glass-card">
                         <h3><thunderbolt-outlined /> Навыки</h3>
                         <textarea v-model="resume.skills" rows="3" class="glass-input" placeholder="JavaScript, Vue.js, Node.js..."></textarea>
                      </div>
                   </div>

                   <div v-else-if="currentStep === 3" key="step3" class="step-pane">
                      <div class="glass-card">
                        <div class="sec-head">
                            <h3><solution-outlined /> Опыт работы</h3>
                            <button class="btn-add" @click="addExperience"><plus-outlined /></button>
                        </div>
                        <div v-if="resume.experience.length === 0" class="empty-list">Добавьте опыт работы</div>
                        <div v-for="(exp, index) in resume.experience" :key="index" class="exp-item fade-in-down">
                           <div class="exp-header">
                              <span class="exp-num">#{{ index + 1 }}</span>
                              <button class="btn-remove-mini" @click="removeExperience(index)"><delete-outlined /></button>
                           </div>
                           <div class="form-row">
                              <div class="form-group"><input v-model="exp.company" placeholder="Компания" class="glass-input" /></div>
                              <div class="form-group small-w"><input v-model="exp.period" placeholder="ГГГГ-ГГГГ" class="glass-input" /></div>
                           </div>
                           <div class="form-group"><input v-model="exp.role" placeholder="Должность" class="glass-input" /></div>
                           <div class="textarea-ai">
                               <textarea v-model="exp.description" rows="3" class="glass-input" placeholder="Обязанности..."></textarea>
                               <button class="ai-btn-icon" @click="improveExp(index)"><star-outlined /></button>
                           </div>
                        </div>
                      </div>
                   </div>

                   <div v-else-if="currentStep === 4" key="step4" class="step-pane">
                      <div class="glass-card">
                        <div class="sec-head">
                            <h3><read-outlined /> Образование</h3>
                            <button class="btn-add" @click="addEducation"><plus-outlined /></button>
                        </div>
                        <div v-if="resume.education.length === 0" class="empty-list">Укажите образование</div>
                        <div v-for="(edu, index) in resume.education" :key="'edu'+index" class="exp-item fade-in-down">
                           <div class="exp-header">
                              <span class="exp-num"><read-outlined /></span>
                              <button class="btn-remove-mini" @click="removeEducation(index)"><delete-outlined /></button>
                           </div>
                           <div class="form-group"><input v-model="edu.institution" placeholder="ВУЗ / Курсы" class="glass-input" /></div>
                           <div class="form-row">
                              <div class="form-group"><input v-model="edu.degree" placeholder="Специальность" class="glass-input" /></div>
                              <div class="form-group small-w"><input v-model="edu.year" placeholder="Год" class="glass-input" /></div>
                           </div>
                        </div>
                      </div>
                   </div>
                 </transition>
               </div>

               <div class="wizard-nav">
                  <button class="btn-nav back" :disabled="currentStep === 1" @click="currentStep--">Назад</button>
                  <button class="btn-nav next" v-if="currentStep < 4" @click="currentStep++">Далее</button>
                  <button class="btn-nav finish" v-else @click="saveToProfile">Сохранить <save-outlined /></button>
               </div>
             </div>

             <!-- ПРАВАЯ КОЛОНКА (ПРЕВЬЮ) -->
             <div class="preview-column custom-scroll">
                <div class="modern-resume" id="resume-preview">
                   <div class="mr-sidebar">
                      <div class="mr-photo-placeholder"><span>{{ getInitials(resume.fullName) }}</span></div>
                      <div class="mr-section">
                         <div class="mr-label">КОНТАКТЫ</div>
                         <div class="mr-contact-item" v-if="resume.phone"><phone-outlined /> {{ resume.phone }}</div>
                         <div class="mr-contact-item" v-if="resume.email"><mail-outlined /> {{ resume.email }}</div>
                         <div class="mr-contact-item link" v-if="resume.links"><link-outlined /> {{ resume.links }}</div>
                      </div>
                      <div class="mr-section" v-if="resume.skills">
                         <div class="mr-label">НАВЫКИ</div>
                         <div class="mr-skills-list"><span v-for="skill in splitSkills(resume.skills)" :key="skill">{{ skill }}</span></div>
                      </div>
                      <div class="mr-section" v-if="resume.education.length">
                         <div class="mr-label">ОБРАЗОВАНИЕ</div>
                         <div v-for="edu in resume.education" :key="edu.institution" class="mr-edu-item">
                            <div class="mr-edu-year">{{ edu.year }}</div>
                            <div class="mr-edu-school">{{ edu.institution }}</div>
                            <div class="mr-edu-degree">{{ edu.degree }}</div>
                         </div>
                      </div>
                   </div>
                   <div class="mr-main">
                      <div class="mr-header">
                         <h1 class="mr-name">{{ resume.fullName || 'Имя Фамилия' }}</h1>
                         <h2 class="mr-position">{{ resume.position || 'Желаемая должность' }}</h2>
                      </div>
                      <div class="mr-block" v-if="resume.summary"><h3 class="mr-title">О СЕБЕ</h3><p class="mr-text">{{ resume.summary }}</p></div>
                      <div class="mr-block" v-if="resume.experience.length">
                         <h3 class="mr-title">ОПЫТ РАБОТЫ</h3>
                         <div v-for="(exp, i) in resume.experience" :key="i" class="mr-exp-item">
                            <div class="mr-exp-head"><span class="mr-company">{{ exp.company }}</span><span class="mr-period">{{ exp.period }}</span></div>
                            <div class="mr-role">{{ exp.role }}</div>
                            <p class="mr-text">{{ exp.description }}</p>
                         </div>
                      </div>
                   </div>
                </div>
             </div>

             <input type="file" ref="fileInput" accept="application/pdf" style="display: none" @change="handleFileUpload" />
             <button class="btn-floating-upload" @click="$refs.fileInput.click()" title="Загрузить PDF"><paper-clip-outlined /></button>
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
import {
  RobotOutlined, UserOutlined, DeleteOutlined, SearchOutlined,
  FileTextOutlined, SendOutlined, PlusOutlined, RobotFilled,
  DownloadOutlined, PaperClipOutlined, LoadingOutlined, SaveOutlined,
  AudioOutlined, ThunderboltOutlined, SolutionOutlined, StarOutlined,
  PhoneOutlined, MailOutlined, LinkOutlined, ReadOutlined,
  SoundOutlined, AudioMutedOutlined
} from '@ant-design/icons-vue';
import { reactive, ref, onMounted, computed, watch, onUnmounted, nextTick } from 'vue';

export default {
  components: {
    RobotOutlined, UserOutlined, DeleteOutlined, SearchOutlined,
    FileTextOutlined, SendOutlined, PlusOutlined, RobotFilled,
    DownloadOutlined, PaperClipOutlined, LoadingOutlined, SaveOutlined,
    AudioOutlined, ThunderboltOutlined, SolutionOutlined, StarOutlined,
    PhoneOutlined, MailOutlined, LinkOutlined, ReadOutlined,
    SoundOutlined, AudioMutedOutlined
  },
  setup() {
    const messages = ref([]);
    const newMessage = ref('');
    const loading = ref(false);
    const currentMode = ref('vacancy');
    const generatingPdf = ref(false);
    const saving = ref(false);
    const aiLoading = ref(false);
    const isSoundOn = ref(false);
    const msgContainer = ref(null);

    const currentStep = ref(1);
    const stepTitles = ['Личная информация', 'О себе и Навыки', 'Опыт работы', 'Образование'];

    const resume = reactive({
      fullName: '', position: '', email: '', phone: '', links: '',
      summary: '', skills: '',
      experience: [{ company: '', role: '', period: '', description: '' }],
      education: [{ institution: '', degree: '', year: '' }]
    });

    const sliderStyle = computed(() => {
       if (currentMode.value === 'vacancy') return { transform: 'translateX(0)', width: '33.33%' };
       if (currentMode.value === 'resume') return { transform: 'translateX(100%)', width: '33.33%' };
       return { transform: 'translateX(200%)', width: '33.33%' };
    });

    const scrollToBottom = () => {
        nextTick(() => {
            if(msgContainer.value) msgContainer.value.scrollTop = msgContainer.value.scrollHeight;
        });
    };

    const loadHistory = async (modeToLoad) => {
        if(modeToLoad === 'resume') return;
        loading.value = true;
        try {
            const r = await api.get('/chat/history', { params: { mode: modeToLoad } });
            messages.value = r.data;
            scrollToBottom();
        } catch(e){} finally{loading.value=false;}
    };

    const setMode = (mode) => {
        if (currentMode.value === mode) return;
        currentMode.value = mode;
        messages.value = [];
        if(mode !== 'resume') loadHistory(mode);
    };

    const clearHistory = () => {
        const modeName = currentMode.value === 'vacancy' ? 'Поиск' : 'Интервью';
        Modal.confirm({
            title: `Очистить чат "${modeName}"?`, okText:'Да', okType:'danger',
            onOk: async () => { try { await api.delete('/chat/clear', { params: { mode: currentMode.value } }); messages.value = []; } catch (e) { message.error("Ошибка"); } }
        });
    };

    const sendMessage = async () => {
      if(!newMessage.value.trim()) return;
      const txt = newMessage.value; newMessage.value='';
      messages.value.push({role:'user',content:txt});
      scrollToBottom();
      loading.value=true;
      try {
          const r = await api.post('/chat/send', {message:txt, mode: currentMode.value});
          messages.value.push(r.data);
          scrollToBottom();
      }
      catch(e){ messages.value.push({role:'assistant',content:'Ошибка связи'}); } finally{loading.value=false;}
    };

    const startInterview = (topic) => { newMessage.value = `Проведи со мной собеседование на тему: ${topic}`; sendMessage(); };
    const formatText = (t) => marked.parse(t||'',{breaks:true});

    const cleanTextForSpeech = (text) => text.replace(/[*#`_]/g, '').replace(/\[(.*?)\]\(.*?\)/g, '$1').replace(/<[^>]*>/g, '');
    const speak = (text) => {
        if (!isSoundOn.value) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(cleanTextForSpeech(text));
        utterance.lang = 'ru-RU'; utterance.rate = 1.1;
        const voices = window.speechSynthesis.getVoices();
        const ruVoice = voices.find(v => v.lang.includes('ru'));
        if (ruVoice) utterance.voice = ruVoice;
        window.speechSynthesis.speak(utterance);
    };

    watch(messages, (newVal) => {
        if (newVal.length === 0) return;
        const lastMsg = newVal[newVal.length - 1];
        if (currentMode.value === 'interview' && isSoundOn.value && lastMsg.role === 'assistant') {
            speak(lastMsg.content);
        }
    }, { deep: true });

    onUnmounted(() => window.speechSynthesis.cancel());

    const addExperience = () => resume.experience.push({company:'',role:'',period:'',description:''});
    const removeExperience = (i) => resume.experience.splice(i,1);
    const addEducation = () => resume.education.push({institution:'',degree:'',year:''});
    const removeEducation = (i) => resume.education.splice(i,1);

    const improveText = async (field) => {
       if(!resume[field]) return message.warning('Пусто');
       aiLoading.value=true;
       try { const r = await api.post('/chat/improve', {text: resume[field]}); resume[field]=r.data.result; message.success('Готово'); }
       catch(e){} finally{aiLoading.value=false;}
    };
    const improveExp = async (i) => {
       const txt = resume.experience[i].description;
       if(!txt) return;
       aiLoading.value=true;
       try { const r = await api.post('/chat/improve', {text:txt}); resume.experience[i].description=r.data.result; message.success('Готово'); }
       catch(e){} finally{aiLoading.value=false;}
    };

    const splitSkills = (str) => str ? str.split(',').map(s => s.trim()).filter(s => s) : [];
    const getInitials = (name) => { if(!name) return 'UR'; const p = name.split(' '); return (p[0][0] + (p[1] ? p[1][0] : '')).toUpperCase(); };

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
           message.success('Сохранено');
       } catch (e) { message.error('Ошибка'); } finally { saving.value = false; }
    };

    const handleFileUpload = async (event) => {
      const file = event.target.files[0];
      if (!file) return;
      if(currentMode.value !== 'resume') { message.warning('Включите режим Резюме'); return; }
      message.info('Файл загружен');
    };

    onMounted(() => loadHistory('vacancy'));

    return {
      messages, newMessage, loading, currentMode, setMode, sliderStyle,
      sendMessage, clearHistory, formatText, handleFileUpload, startInterview, msgContainer,
      resume, aiLoading, addExperience, removeExperience, addEducation, removeEducation,
      improveText, improveExp, downloadPDF, generatingPdf, saveToProfile, saving,
      splitSkills, getInitials, isSoundOn,
      currentStep, stepTitles
    };
  }
};
</script>

<style scoped>
/* ОБЩИЕ */
.page-wrapper { position: relative; width: 100%; min-height: 85vh; overflow: hidden; display: flex; justify-content: center; font-family: 'Segoe UI', sans-serif; }
.blobs-container { position: absolute; inset: 0; z-index: 0; pointer-events: none; }
.blob { position: absolute; border-radius: 50%; filter: blur(60px); opacity: 0.6; animation: float 10s infinite alternate; }
.blob-1 { width: 400px; height: 400px; background: #a855f7; top: -50px; left: -100px; }
.blob-2 { width: 350px; height: 350px; background: #3b82f6; bottom: -50px; right: -50px; animation-delay: 1s; }
.blob-3 { width: 300px; height: 300px; background: #ec4899; top: 40%; left: 40%; opacity: 0.4; animation-duration: 18s; }
@keyframes float { 0%{transform:translate(0,0)} 100%{transform:translate(20px,20px)} }

.content-container { position: relative; z-index: 1; width: 100%; max-width: 1200px; padding: 20px; display: flex; flex-direction: column; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 25px; }
.header-left { display: flex; flex-direction: column; gap: 15px; }
.header-left h1 { display: flex; align-items: center; gap: 15px; font-size: 2rem; font-weight: 800; color: #1f2937; margin: 0; }
.ai-avatar-glow { width: 45px; height: 45px; background: linear-gradient(135deg, #6366f1, #a855f7); color: white; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; box-shadow: 0 0 20px rgba(99, 102, 241, 0.5); }

.glass-switcher { position: relative; display: flex; background: rgba(255,255,255,0.3); backdrop-filter: blur(10px); border-radius: 12px; padding: 4px; border: 1px solid rgba(255,255,255,0.5); width: 400px; cursor: pointer; }
.switch-option { flex: 1; text-align: center; padding: 8px; font-weight: 600; color: #6b7280; z-index: 2; transition: 0.3s; display: flex; align-items: center; justify-content: center; gap: 8px; }
.switch-option.active { color: #4f46e5; }
.switch-slider { position: absolute; top: 4px; left: 4px; height: calc(100% - 8px); background: white; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); transition: transform 0.3s ease; z-index: 1; }

.actions { margin-top: 5px; display: flex; gap: 12px; align-items: center; }
.resume-actions { display: flex; gap: 10px; }

/* 🔥 НОВЫЕ СТИЛИ КНОПОК (Одинаковый размер) */
.btn-action-icon {
    width: 46px; height: 46px;
    border-radius: 14px;
    display: flex; align-items: center; justify-content: center;
    font-size: 1.3rem;
    cursor: pointer;
    transition: 0.2s;
    border: 1px solid rgba(0,0,0,0.1);
    background: rgba(255, 255, 255, 0.5);
    color: #6b7280;
}
.btn-action-icon:hover { background: white; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }

/* Кнопка Звук */
.btn-sound:hover { color: #6366f1; }
.btn-sound.active { background: #6366f1; color: white; border-color: #6366f1; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4); }

/* Кнопка Корзина */
.btn-delete:hover { background: #fee2e2; color: #ef4444; border-color: #fecaca; }

/* Кнопки резюме */
.btn-download-glass, .btn-save-glass { background: rgba(255,255,255,0.5); border: 1px solid rgba(0,0,0,0.1); border-radius: 12px; padding: 10px 15px; cursor: pointer; font-weight: 600; color: #4b5563; transition: 0.2s; display: flex; align-items: center; gap: 6px; height: 46px; }
.btn-download-glass:hover { background: #e0e7ff; color: #4f46e5; }
.btn-save-glass { background: #dcfce7; color: #16a34a; border-color: #16a34a; }
.btn-save-glass:hover { background: #22c55e; color: white; }

.mode-container { flex-grow: 1; position: relative; display: flex; flex-direction: column; }

/* RESUME BUILDER */
.resume-builder-wrapper { display: grid; grid-template-columns: 450px 1fr; gap: 25px; height: 75vh; width: 100%; margin-top: 10px; }
.form-column { display: flex; flex-direction: column; gap: 15px; height: 100%; background: rgba(255,255,255,0.4); backdrop-filter: blur(10px); border-radius: 16px; padding: 15px; border: 1px solid white; }
.preview-column { background: #e5e7eb; border-radius: 16px; padding: 20px; display: flex; justify-content: center; align-items: flex-start; overflow-y: auto; height: 100%; border: 1px solid #d1d5db; }

.steps-header { display: flex; flex-direction: column; align-items: center; gap: 10px; margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid rgba(0,0,0,0.05); }
.step-dots { display: flex; gap: 10px; }
.step-dot { width: 30px; height: 30px; border-radius: 50%; background: rgba(0,0,0,0.1); color: #6b7280; display: flex; align-items: center; justify-content: center; font-weight: 700; cursor: pointer; transition: 0.3s; font-size: 0.9rem; }
.step-dot.active { background: #e0e7ff; color: #4f46e5; }
.step-dot.current { background: #4f46e5; color: white; transform: scale(1.1); box-shadow: 0 4px 10px rgba(79, 70, 229, 0.3); }
.step-title { font-weight: 700; color: #374151; font-size: 1rem; }
.step-content { flex: 1; overflow-y: auto; padding-right: 5px; }
.step-pane { animation: fadeIn 0.3s ease; }
.wizard-nav { display: flex; justify-content: space-between; margin-top: 15px; border-top: 1px solid rgba(0,0,0,0.05); padding-top: 15px; }
.btn-nav { padding: 10px 20px; border-radius: 10px; border: none; font-weight: 700; cursor: pointer; transition: 0.2s; }
.btn-nav.back { background: transparent; color: #6b7280; }
.btn-nav.back:hover:not(:disabled) { background: rgba(0,0,0,0.05); }
.btn-nav.back:disabled { opacity: 0.3; cursor: default; }
.btn-nav.next { background: #4f46e5; color: white; }
.btn-nav.next:hover { background: #4338ca; transform: translateX(2px); }
.btn-nav.finish { background: #10b981; color: white; display: flex; align-items: center; gap: 5px; }
.btn-nav.finish:hover { background: #059669; }

.glass-card { background: white; border-radius: 12px; padding: 20px; border: 1px solid #e5e7eb; box-shadow: 0 4px 15px rgba(0,0,0,0.02); }
.form-group { margin-bottom: 12px; flex: 1; }
.form-group label { display: block; font-size: 0.8rem; color: #6b7280; margin-bottom: 5px; font-weight: 600; }
.glass-input { width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid #e5e7eb; outline: none; font-size: 0.95rem; transition: 0.2s; background: #f9fafb; }
.glass-input:focus { border-color: #6366f1; background: white; box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1); }
.form-row { display: flex; gap: 10px; }
.small-w { width: 100px; }
.divider { height: 1px; background: #e5e7eb; margin: 15px 0; }
.hint { font-size: 0.8rem; color: #9ca3af; margin-bottom: 8px; margin-top: -5px; }
.empty-list { text-align: center; color: #9ca3af; padding: 20px; border: 1px dashed #d1d5db; border-radius: 10px; font-size: 0.9rem; }
.exp-item { background: #f9fafb; padding: 15px; border-radius: 10px; margin-bottom: 10px; border: 1px solid #e5e7eb; position: relative; }
.exp-header { display: flex; justify-content: space-between; margin-bottom: 10px; color: #6b7280; font-size: 0.8rem; font-weight: 700; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; }
.btn-remove-mini { background: none; border: none; color: #ef4444; cursor: pointer; font-size: 1rem; opacity: 0.5; }
.btn-remove-mini:hover { opacity: 1; }
.sec-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.sec-head h3 { margin: 0; font-size: 1rem; color: #374151; display: flex; align-items: center; gap: 8px; }
.btn-add { background: #10b981; color: white; width: 24px; height: 24px; border-radius: 50%; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
.btn-add:hover { transform: scale(1.1); box-shadow: 0 2px 8px rgba(16, 185, 129, 0.4); }
.btn-ai-small { background: #e0e7ff; color: #4f46e5; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.75rem; font-weight: 600; display: flex; align-items: center; gap: 5px; transition: 0.2s; }
.btn-ai-small:hover { background: #4f46e5; color: white; }
.textarea-ai { position: relative; margin-top: 8px; }
.ai-btn-icon { position: absolute; bottom: 8px; right: 8px; background: white; border: 1px solid #e5e7eb; border-radius: 50%; width: 28px; height: 28px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #f59e0b; box-shadow: 0 2px 5px rgba(0,0,0,0.05); transition: 0.2s; }
.ai-btn-icon:hover { transform: scale(1.1); color: #d97706; }

/* MODERN RESUME */
.modern-resume { width: 210mm; min-height: 297mm; background: white; box-shadow: 0 10px 30px rgba(0,0,0,0.1); display: flex; overflow: hidden; color: #334155; font-family: 'Inter', sans-serif; }
.mr-sidebar { width: 75mm; background: #f1f5f9; padding: 25px; display: flex; flex-direction: column; gap: 25px; border-right: 1px solid #e2e8f0; }
.mr-photo-placeholder { width: 80px; height: 80px; background: #cbd5e1; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: 700; color: white; align-self: center; margin-bottom: 10px; }
.mr-section { margin-bottom: 5px; }
.mr-label { font-size: 0.8rem; font-weight: 800; letter-spacing: 1px; color: #64748b; border-bottom: 2px solid #cbd5e1; padding-bottom: 5px; margin-bottom: 10px; }
.mr-contact-item { display: flex; align-items: center; gap: 8px; font-size: 0.85rem; margin-bottom: 8px; color: #475569; word-break: break-all; }
.mr-contact-item svg { color: #6366f1; font-size: 1rem; }
.mr-skills-list { display: flex; flex-wrap: wrap; gap: 6px; }
.mr-skills-list span { background: white; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; color: #475569; border: 1px solid #e2e8f0; }
.mr-edu-item { margin-bottom: 15px; }
.mr-edu-year { font-size: 0.8rem; color: #94a3b8; font-weight: 600; }
.mr-edu-school { font-weight: 700; font-size: 0.9rem; }
.mr-edu-degree { font-size: 0.85rem; color: #64748b; }
.mr-main { flex: 1; padding: 35px; display: flex; flex-direction: column; gap: 25px; }
.mr-header { border-bottom: 2px solid #334155; padding-bottom: 20px; }
.mr-name { font-size: 2.2rem; font-weight: 900; text-transform: uppercase; color: #1e293b; line-height: 1; margin: 0; }
.mr-position { font-size: 1.1rem; font-weight: 500; color: #6366f1; margin: 5px 0 0 0; text-transform: uppercase; letter-spacing: 1px; }
.mr-title { font-size: 1rem; font-weight: 800; color: #334155; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px; display: flex; align-items: center; gap: 10px; }
.mr-title::after { content: ""; flex: 1; height: 1px; background: #e2e8f0; }
.mr-text { font-size: 0.9rem; line-height: 1.6; color: #475569; white-space: pre-wrap; margin: 0; }
.mr-exp-item { margin-bottom: 20px; }
.mr-exp-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 2px; }
.mr-company { font-weight: 800; font-size: 1rem; color: #1e293b; }
.mr-period { font-size: 0.85rem; color: #94a3b8; font-weight: 600; }
.mr-role { font-size: 0.9rem; font-weight: 600; color: #6366f1; margin-bottom: 6px; font-style: italic; }

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
.btn-floating-upload { position: absolute; bottom: 20px; right: 20px; width: 50px; height: 50px; border-radius: 50%; background: white; box-shadow: 0 4px 15px rgba(0,0,0,0.1); border: none; cursor: pointer; font-size: 1.2rem; color: #6366f1; z-index: 100; transition: transform 0.2s; }
.btn-floating-upload:hover { transform: scale(1.1); }
.empty-state { height: 100%; display: flex; align-items: center; justify-content: center; text-align: center; }
.empty-content { background: rgba(255,255,255,0.6); padding: 30px; border-radius: 20px; }
.icon-wrapper { font-size: 3rem; margin-bottom: 10px; color: #6366f1; }
.suggestion-chips { display: flex; gap: 10px; justify-content: center; margin-top: 15px; flex-wrap: wrap; }
.suggestion-chips span { background: white; padding: 5px 12px; border-radius: 15px; color: #6366f1; cursor: pointer; border: 1px solid #e0e7ff; font-size: 0.85rem; }
.fade-in-down { animation: fadeInDown 0.6s ease; }
@keyframes fadeInDown { from{opacity:0;transform:translateY(-20px)} to{opacity:1;transform:translateY(0)} }
@keyframes fadeIn { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:translateY(0)} }
.fade-slide-enter-active, .fade-slide-leave-active { transition: all 0.3s ease; }
.fade-slide-enter-from { opacity: 0; transform: translateX(20px); }
.fade-slide-leave-to { opacity: 0; transform: translateX(-20px); }
.loading-pulse { display: flex; gap: 5px; padding: 20px !important; }
.typing-dot { width: 8px; height: 8px; background: #6366f1; border-radius: 50%; animation: pulse 1.4s infinite ease-in-out both; }
.typing-dot:nth-child(1) { animation-delay: -0.32s; }
.typing-dot:nth-child(2) { animation-delay: -0.16s; }
@keyframes pulse { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }

/* CODE BLOCKS */
:deep(.text pre) { background: #1e293b; color: #e2e8f0; padding: 10px; border-radius: 8px; overflow-x: auto; margin: 8px 0; border: 1px solid #475569; font-family: 'Consolas', monospace; font-size: 0.9rem; }
:deep(.text code) { background: rgba(0,0,0,0.1); padding: 2px 5px; border-radius: 4px; font-family: monospace; font-weight: 600; }
:deep(.text pre code) { background: transparent; padding: 0; color: inherit; }
.bubble-user :deep(.text pre) { background: rgba(0,0,0,0.2); border-color: rgba(255,255,255,0.2); color: white; }
</style>