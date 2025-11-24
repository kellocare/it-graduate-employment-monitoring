<template>
  <div class="neon-page">
    <!-- ФОН: Частицы -->
    <div class="particles-container">
      <div v-for="(p, i) in particles" :key="i" class="particle" :style="p.style"></div>
    </div>
    <div class="grid-overlay"></div>

    <!-- HUD: Прогресс и XP -->
    <transition name="slide-down">
      <div class="neon-progress-container glass-hud" v-if="elements.length > 1">
        <div class="hud-top-row">
           <div class="p-left">
             <div class="xp-badge">
               <thunderbolt-filled /> <span>{{ totalXP }} XP</span>
             </div>
             <span class="role-badge" v-if="targetRole">{{ targetRole }}</span>
           </div>

           <a-popconfirm
            title="Завершить трек и отправить в архив?"
            ok-text="Да" cancel-text="Нет"
            @confirm="archiveAndReset"
          >
             <button class="btn-archive"><save-filled /> Архив</button>
          </a-popconfirm>
        </div>

        <div class="progress-wrapper">
          <div class="progress-info">
             <span>Progress</span>
             <span>{{ progress }}%</span>
          </div>
          <div class="progress-track">
            <div class="progress-glow" :style="{ width: progress + '%' }">
              <div class="progress-flare"></div>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <!-- ЭКРАН ПРИВЕТСТВИЯ -->
    <transition name="zoom-fade">
      <div v-if="!loading && elements.length <= 1" class="intro-overlay">
        <div class="intro-content">
          <div class="glitch-wrapper">
             <h1 class="neon-title" data-text="Cyber Roadmap">Cyber Roadmap</h1>
          </div>
          <p class="subtitle">ИИ построит твой персональный путь в IT</p>

          <div class="input-box-glow">
             <input
               v-model="targetRole"
               @keydown.enter="generateRoadmap"
               placeholder="Введите профессию (напр. Python Senior)"
               class="neon-input"
             />
             <button @click="generateRoadmap" :disabled="loading" class="neon-btn">
               <thunderbolt-filled v-if="!loading" />
               <span v-else><loading-outlined /></span>
               {{ loading ? 'ANALYZING...' : 'INITIALIZE' }}
             </button>
          </div>

          <div class="tags-suggestion">
            <span @click="targetRole='DevOps Engineer'">#DevOps</span>
            <span @click="targetRole='Frontend Vue.js'">#Frontend</span>
            <span @click="targetRole='Data Scientist'">#DataScience</span>
          </div>
        </div>
      </div>
    </transition>

    <!-- ЛОАДЕР -->
    <transition name="fade">
      <div v-if="loading && elements.length <= 1" class="loader-overlay">
        <div class="cyber-spinner"><div class="inner-circle"></div></div>
        <div class="loader-text">GENERATING NEURAL PATH...</div>
      </div>
    </transition>

    <!-- ГРАФ (VueFlow) -->
    <div class="flow-wrapper" :class="{ 'blur-bg': loading }">
       <VueFlow
         v-model="elements"
         :default-zoom="0.8"
         :min-zoom="0.2"
         :max-zoom="2"
         @node-click="onNodeClick"
       >
          <Background pattern-color="#333" gap="40" size="1" />
          <Controls class="neon-controls" />

          <template #node-custom="{ data }">
            <div class="neon-node"
                 :class="[
                    data.done ? 'completed' : '',
                    data.isSub ? 'sub-node' : '',
                    `difficulty-${data.difficulty || 'medium'}`
                 ]">
               <div class="scan-line"></div>

               <!-- Верхняя часть узла -->
               <div class="node-header">
                  <div class="icon-box">
                    <check-circle-filled v-if="data.done" />
                    <component :is="data.isSub ? 'ApiOutlined' : 'StarFilled'" v-else />
                  </div>
                  <div class="node-meta" v-if="!data.isSub">
                     <span class="meta-tag"><clock-circle-outlined /> {{ data.time || '2h' }}</span>
                  </div>
               </div>

               <div class="node-body">
                 <div class="node-title">{{ data.label }}</div>
               </div>
            </div>
          </template>
       </VueFlow>
    </div>

    <!-- DRAWER (БОКОВАЯ ПАНЕЛЬ) -->
    <transition name="slide-right">
       <div v-if="selectedNode" class="side-drawer glass-panel">
          <div class="drawer-glow-bg"></div>
          <button class="close-btn" @click="closeDrawer"><close-outlined /></button>

          <div class="drawer-header">
             <div class="dh-top">
                <span class="difficulty-badge" :class="selectedNode.difficulty || 'medium'">
                   {{ selectedNode.difficulty || 'Medium' }}
                </span>
                <span class="xp-reward">+{{ selectedNode.xpEarned || 100 }} XP</span>
             </div>
             <h3>{{ selectedNode.label }}</h3>
          </div>

          <!-- ВКЛАДКИ -->
          <div class="drawer-tabs">
             <button :class="{ active: activeTab === 'theory' }" @click="activeTab = 'theory'">Теория</button>
             <button :class="{ active: activeTab === 'resources' }" @click="activeTab = 'resources'">Ресурсы</button>
          </div>

          <div class="drawer-content custom-scroll">

            <!-- Вкладка ТЕОРИЯ -->
            <div v-if="activeTab === 'theory'">
               <p class="drawer-desc">{{ selectedNode.desc || 'Описание отсутствует.' }}</p>

               <div class="action-area">
                  <div v-if="!selectedNode.done" class="locked-state">
                      <div class="lock-icon"><lock-filled /></div>
                      <p>Пройдите тест, чтобы открыть следующий модуль</p>
                      <button class="btn-quiz-start" @click="openQuizModal">
                          <experiment-filled /> Начать испытание
                      </button>
                  </div>
                  <div v-else class="completed-state">
                      <check-circle-filled class="done-icon" />
                      <span>Модуль пройден</span>
                  </div>
               </div>
            </div>

            <!-- Вкладка РЕСУРСЫ -->
            <div v-else class="resources-list">
               <div v-if="!selectedNode.resources || selectedNode.resources.length === 0" class="no-res">
                   <info-circle-outlined />
                   <span>ИИ не нашел точных ссылок, но вы можете поискать сами.</span>
               </div>

               <div class="res-item" v-for="(res, idx) in (selectedNode.resources || [])" :key="idx">
                  <div class="res-icon">
                      <youtube-filled v-if="res.type === 'video'" />
                      <read-outlined v-else />
                  </div>
                  <div class="res-info">
                     <div class="res-title">{{ res.title }}</div>
                     <div class="res-type">{{ res.type === 'video' ? 'Видео' : 'Статья' }}</div>
                  </div>
                  <!-- 🔥 УМНАЯ ССЫЛКА -->
                  <a :href="getSafeLink(res)" target="_blank" class="res-link">
                      <arrow-right-outlined />
                  </a>
               </div>
            </div>

          </div>
       </div>
    </transition>

    <!-- МОДАЛКА ТЕСТА -->
    <a-modal
      v-model:open="quizVisible"
      :footer="null"
      width="950px"
      centered
      wrapClassName="cyber-modal-wrapper"
      :closable="false"
      :maskClosable="false"
    >
       <div class="quiz-container">
          <div class="quiz-left">
             <div class="quiz-header">
               <div class="q-icon-box"><bulb-filled /></div>
               <h3>Задание от AI</h3>
             </div>
             <div v-if="quizLoading" class="quiz-loading-state">
                <div class="cyber-spinner small"></div>
                <span>Генерирую задачу...</span>
             </div>
             <div v-else class="quiz-content-wrapper">
                <div class="quiz-scroll-area custom-scroll">
                    <div class="question-card"><p>{{ quizData.question }}</p></div>
                    <div class="hint-box" v-if="quizData.hint">
                       <div class="hint-icon"><info-circle-outlined /></div>
                       <div class="hint-text"><strong>Подсказка:</strong> {{ quizData.hint }}</div>
                    </div>
                </div>
                <div class="quiz-fixed-bottom">
                    <label class="input-label">Ваше решение:</label>
                    <textarea v-model="userAnswer" placeholder="Напишите код..." class="cyber-textarea custom-scroll"></textarea>
                    <div class="quiz-footer">
                        <button class="btn-cancel" @click="quizVisible = false" :disabled="checkLoading">Отмена</button>
                        <button class="btn-check" @click="checkAnswer" :disabled="checkLoading || !userAnswer || quizLoading">
                           <thunderbolt-filled v-if="!checkLoading" />
                           <loading-outlined v-else />
                           {{ checkLoading ? 'Анализ...' : 'Проверить' }}
                        </button>
                    </div>
                </div>
             </div>
          </div>
          <div class="quiz-right">
             <div class="quiz-right-bg"></div>
             <div v-if="!quizResult" class="ai-placeholder fade-in">
                <div class="placeholder-icon"><robot-outlined /></div>
                <h3>Ожидание решения</h3>
                <p>Отправьте ваш ответ, чтобы ИИ-ментор провел Code Review.</p>
             </div>
             <div v-else class="ai-result-content slide-up">
                <div class="score-ring-wrapper">
                    <div class="score-ring" :class="quizResult.passed ? 'pass' : 'fail'">
                        <span class="score-num">{{ quizResult.score }}</span>
                        <span class="score-label">SCORE</span>
                    </div>
                </div>
                <div class="feedback-scroll custom-scroll">
                    <div class="feedback-markdown" v-html="formatMarkdown(quizResult.feedback)"></div>
                </div>
                <div class="result-actions">
                    <button v-if="quizResult.passed" class="btn-finish" @click="completeNode">
                       <check-circle-filled /> Забрать награду
                    </button>
                    <button v-else class="btn-retry" @click="userAnswer = ''; quizResult = null;">
                       <reload-outlined /> Попробовать снова
                    </button>
                </div>
             </div>
          </div>
       </div>
    </a-modal>

  </div>
</template>

<script>
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { VueFlow, useVueFlow } from '@vue-flow/core';
import { Background } from '@vue-flow/background';
import { Controls } from '@vue-flow/controls';
import api from '../axios';
import { marked } from 'marked';
import { message } from 'ant-design-vue';
import {
  ThunderboltFilled, RocketFilled, StarFilled, CheckCircleFilled,
  CloseOutlined, ApiOutlined, SaveFilled, LoadingOutlined, CheckOutlined,
  ExperimentFilled, BulbFilled, InfoCircleOutlined, RobotOutlined,
  LockFilled, ReloadOutlined, ClockCircleOutlined, YoutubeFilled, ReadOutlined, ArrowRightOutlined
} from '@ant-design/icons-vue';

import '@vue-flow/core/dist/style.css';
import '@vue-flow/core/dist/theme-default.css';
import '@vue-flow/controls/dist/style.css';

export default {
  components: {
    VueFlow, Background, Controls,
    ThunderboltFilled, RocketFilled, StarFilled, CheckCircleFilled,
    CloseOutlined, ApiOutlined, SaveFilled, LoadingOutlined, CheckOutlined,
    ExperimentFilled, BulbFilled, InfoCircleOutlined, RobotOutlined,
    LockFilled, ReloadOutlined, ClockCircleOutlined, YoutubeFilled, ReadOutlined, ArrowRightOutlined
  },
  setup() {
    const { setCenter, fitView } = useVueFlow();
    const targetRole = ref('');
    const loading = ref(true);
    const saving = ref(false);
    const selectedNode = ref(null);
    const elements = ref([]);
    const particles = ref([]);
    const totalXP = ref(0);
    const activeTab = ref('theory');

    // QUIZ Vars
    const quizVisible = ref(false);
    const quizLoading = ref(false);
    const checkLoading = ref(false);
    const quizData = ref({});
    const userAnswer = ref('');
    const quizResult = ref(null);

    // Particles Init
    onMounted(() => {
      for (let i = 0; i < 40; i++) {
        particles.value.push({
            style: {
                left: `${Math.random()*100}%`,
                width: `${Math.random()*3+1}px`,
                height: `${Math.random()*3+1}px`,
                animationDuration: `${Math.random()*20+10}s`,
                animationDelay: `${Math.random()*5}s`,
                opacity: Math.random()*0.5+0.1
            }
        });
      }
    });

    // Load Roadmap
    onMounted(async () => {
       try {
         const r = await api.get('/chat/roadmap');
         if (r.data) {
             if (r.data.nodes) { elements.value = r.data.nodes; targetRole.value = r.data.role || ''; }
             else if (Array.isArray(r.data) && r.data.length > 0) { elements.value = r.data; }

             // Считаем XP
             totalXP.value = elements.value.reduce((acc, el) => acc + (el.data?.done ? (el.data.xpEarned || 100) : 0), 0);

             nextTick(() => setTimeout(() => fitView({ padding: 0.2 }), 100));
         }
       } catch (e) {} finally { loading.value = false; }
    });

    // AutoSave
    let saveTimeout = null;
    watch(elements, (newVal) => {
        if (loading.value || newVal.length <= 1) return;
        clearTimeout(saveTimeout);
        saving.value = true;
        saveTimeout = setTimeout(async () => {
            try { await api.post('/chat/roadmap/save', { roadmapData: newVal, role: targetRole.value }); }
            catch(e) {} finally { saving.value = false; }
        }, 1500);
    }, { deep: true });

    const progress = computed(() => {
       const nodes = elements.value.filter(el => el.type === 'custom');
       if (!nodes.length) return 0;
       const doneCount = nodes.reduce((acc, n) => acc + (n.data.done ? 1 : 0), 0);
       return Math.round((doneCount / nodes.length) * 100);
    });

    const archiveAndReset = async () => {
        if (elements.value.length <= 1) return;
        try { await api.post('/chat/roadmap/archive', { roleTitle: targetRole.value || "My Roadmap", finalProgress: progress.value }); message.success('Archived'); elements.value = []; targetRole.value = ''; totalXP.value = 0; } catch (e) { message.error('Error'); }
    };

    const generateRoadmap = async () => {
      if(!targetRole.value.trim()) return message.warning('Введите роль!');
      loading.value = true;
      elements.value = [];
      totalXP.value = 0;
      try {
        const res = await api.post('/chat/roadmap', { role: targetRole.value });
        const steps = res.data;
        const newElements = [];
        let xBase = 0;

        steps.forEach((step, idx) => {
            const mainId = `main-${idx}`;
            newElements.push({
                id: mainId, type: 'custom', position: { x: xBase, y: 0 },
                data: { ...step, done: false, isSub: false }
            });

            if (idx > 0) {
                newElements.push({ id: `e-main-${idx-1}-${idx}`, source: `main-${idx-1}`, target: mainId, animated: true, style: { stroke: '#00f2ff', strokeWidth: 3, strokeDasharray: 5 } });
            }

            if (step.subtopics) {
                step.subtopics.forEach((sub, subIdx) => {
                    const subId = `sub-${idx}-${subIdx}`;
                    const isTop = subIdx % 2 === 0;
                    const level = Math.floor(subIdx / 2) + 1;
                    const yOffset = isTop ? -(level * 350) : (level * 350);
                    const xOffset = (subIdx % 2 === 0 ? -80 : 80) + (level * 40);

                    newElements.push({
                        id: subId, type: 'custom', position: { x: xBase + xOffset, y: yOffset },
                        data: { ...sub, done: false, isSub: true }
                    });
                    newElements.push({ id: `e-${mainId}-${subId}`, source: mainId, target: subId, style: { stroke: '#bd00ff', strokeWidth: 1 } });
                });
            }
            xBase += 900;
        });
        elements.value = newElements;
        await api.post('/chat/roadmap/save', { roadmapData: newElements, role: targetRole.value });
        nextTick(() => setTimeout(() => fitView({ padding: 0.2 }), 100));
      } catch (e) { message.error("AI Error"); } finally { loading.value = false; }
    };

    const onNodeClick = (event) => {
        selectedNode.value = event.node.data;
        activeTab.value = 'theory';
        setCenter(event.node.position.x, event.node.position.y, { zoom: 1.2, duration: 800 });
    };
    const closeDrawer = () => { selectedNode.value = null; fitView({ padding: 0.2, duration: 800 }); };

    // QUIZ Logic
    const openQuizModal = async () => {
        if (!selectedNode.value) return;
        quizVisible.value = true;
        quizLoading.value = true;
        userAnswer.value = '';
        quizResult.value = null;
        try {
            const res = await api.post('/chat/roadmap/quiz', { topic: selectedNode.value.label, description: selectedNode.value.desc });
            quizData.value = res.data;
        } catch (e) { message.error("Failed to load quiz"); quizVisible.value = false; } finally { quizLoading.value = false; }
    };

    const checkAnswer = async () => {
        if (!userAnswer.value) return;
        checkLoading.value = true;
        try {
            const res = await api.post('/chat/roadmap/check', { topic: selectedNode.value.label, question: quizData.value.question, answer: userAnswer.value });
            quizResult.value = res.data;
        } catch (e) { message.error("Error checking"); } finally { checkLoading.value = false; }
    };

    const completeNode = () => {
        if (selectedNode.value) {
            selectedNode.value.done = true;
            const earned = selectedNode.value.xpEarned || 100;
            totalXP.value += earned;
            message.success(`Модуль пройден! +${earned} XP`);
            quizVisible.value = false;
        }
    };

    // 🔥 ФУНКЦИЯ "УМНОЙ ССЫЛКИ"
    const getSafeLink = (res) => {
        if (res.link && res.link.startsWith('http')) return res.link;
        // Генерируем поиск в Google если ссылки нет или она битая
        return `https://www.google.com/search?q=${encodeURIComponent(res.title + ' tutorial ' + targetRole.value)}`;
    };

    const formatMarkdown = (text) => marked.parse(text || '');

    return {
      targetRole, loading, elements, generateRoadmap,
      onNodeClick, selectedNode, closeDrawer, progress, saving, archiveAndReset, particles,
      quizVisible, quizLoading, quizData, userAnswer, checkAnswer, checkLoading, quizResult, completeNode, openQuizModal, formatMarkdown,
      totalXP, activeTab, getSafeLink
    };
  }
}
</script>

<style>
/* Глобальные стили для модалки */
.cyber-modal-wrapper .ant-modal-content { background: transparent !important; box-shadow: none !important; padding: 0 !important; border: none !important; }
.cyber-modal-wrapper .ant-modal-body { background: transparent !important; padding: 0 !important; }
</style>

<style scoped>
/* HUD & BADGES */
.neon-progress-container { width: 550px; padding: 15px 25px; gap: 10px; }
.hud-top-row { display: flex; justify-content: space-between; align-items: center; }
.xp-badge { display: flex; align-items: center; gap: 6px; background: rgba(255, 215, 0, 0.1); border: 1px solid rgba(255, 215, 0, 0.5); color: #ffd700; padding: 4px 10px; border-radius: 8px; font-weight: 800; font-size: 0.9rem; text-shadow: 0 0 10px rgba(255, 215, 0, 0.4); }
.progress-wrapper { display: flex; flex-direction: column; gap: 4px; }
.progress-info { display: flex; justify-content: space-between; font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; }

/* --- NODE STYLES (CRITICAL FIX FOR COLORS) --- */
.neon-node {
    position: relative;
    background: rgba(15, 23, 42, 0.95);
    border: 2px solid #00f2ff; /* Default */
    border-radius: 12px;
    padding: 0;
    width: 240px;
    box-shadow: 0 0 15px rgba(0, 242, 255, 0.15);
    transition: all 0.3s ease;
    display: flex; flex-direction: column; overflow: hidden;
}

/* 🔥 IMPORTANT COLORS FOR DIFFICULTY 🔥 */
.neon-node.difficulty-easy { border-color: #10b981 !important; box-shadow: 0 0 20px rgba(16, 185, 129, 0.3) !important; }
.neon-node.difficulty-easy .icon-box { color: #10b981; }

.neon-node.difficulty-medium { border-color: #f59e0b !important; box-shadow: 0 0 20px rgba(245, 158, 11, 0.3) !important; }
.neon-node.difficulty-medium .icon-box { color: #f59e0b; }

.neon-node.difficulty-hard { border-color: #ef4444 !important; box-shadow: 0 0 20px rgba(239, 68, 68, 0.3) !important; }
.neon-node.difficulty-hard .icon-box { color: #ef4444; }

.neon-node.completed { border-color: #10b981 !important; background: rgba(16, 185, 129, 0.1); box-shadow: 0 0 25px rgba(16, 185, 129, 0.5) !important; }

/* Node Internals */
.node-header { padding: 12px; display: flex; justify-content: space-between; align-items: flex-start; background: rgba(255,255,255,0.03); border-bottom: 1px solid rgba(255,255,255,0.05); }
.node-body { padding: 12px; }
.node-meta { font-size: 0.7rem; color: #94a3b8; background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px; }
.node-title { font-weight: 700; font-size: 0.95rem; line-height: 1.3; text-shadow: 0 0 5px rgba(0,0,0,0.5); }
.icon-box { font-size: 1.4rem; color: #00f2ff; filter: drop-shadow(0 0 5px currentColor); }

/* --- DRAWER --- */
.dh-top { display: flex; justify-content: space-between; margin-bottom: 8px; }
.difficulty-badge { font-size: 0.7rem; text-transform: uppercase; font-weight: 800; padding: 2px 8px; border-radius: 4px; letter-spacing: 1px; }
.difficulty-badge.easy { color: #10b981; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); }
.difficulty-badge.medium { color: #f59e0b; background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); }
.difficulty-badge.hard { color: #ef4444; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); }
.xp-reward { color: #ffd700; font-weight: 800; font-size: 0.8rem; text-shadow: 0 0 5px rgba(255, 215, 0, 0.5); }

/* TABS */
.drawer-tabs { display: flex; border-bottom: 1px solid #334155; margin-bottom: 20px; }
.drawer-tabs button { flex: 1; background: transparent; border: none; padding: 10px; color: #64748b; font-weight: 600; cursor: pointer; border-bottom: 2px solid transparent; transition: 0.3s; }
.drawer-tabs button.active { color: white; border-bottom-color: #00f2ff; text-shadow: 0 0 10px rgba(0, 242, 255, 0.5); }
.drawer-tabs button:hover:not(.active) { color: #94a3b8; }

/* RESOURCES LIST */
.resources-list { display: flex; flex-direction: column; gap: 10px; }
.no-res { padding: 20px; text-align: center; color: #94a3b8; background: rgba(255,255,255,0.03); border-radius: 10px; display: flex; flex-direction: column; align-items: center; gap: 10px; }
.res-item { display: flex; align-items: center; gap: 12px; background: rgba(255,255,255,0.03); padding: 12px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.05); transition: 0.2s; position: relative; overflow: hidden; }
.res-item:hover { background: rgba(255,255,255,0.07); transform: translateX(5px); border-color: rgba(255,255,255,0.1); }
.res-icon { font-size: 1.5rem; color: #cbd5e1; }
.res-info { flex: 1; min-width: 0; }
.res-title { font-weight: 600; color: #e2e8f0; font-size: 0.95rem; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.res-type { font-size: 0.75rem; color: #64748b; }
.res-link { color: #00f2ff; font-size: 1.1rem; opacity: 0; transition: 0.2s; cursor: pointer; display: flex; align-items: center; }
.res-item:hover .res-link { opacity: 1; transform: translateX(-5px); }

/* --- OTHER STYLES (BACKGROUND, LOADER, ETC) --- */
.neon-page { position: relative; width: 100%; height: 100vh; background: #0f172a; color: white; overflow: hidden; font-family: 'Segoe UI', sans-serif; }
.particles-container { position: absolute; inset: 0; overflow: hidden; z-index: 0; pointer-events: none; }
.particle { position: absolute; bottom: -10px; background: white; border-radius: 50%; animation: floatUp linear infinite; box-shadow: 0 0 5px white; }
@keyframes floatUp { to { transform: translateY(-110vh); } }
.grid-overlay { position: absolute; inset: 0; background-image: linear-gradient(rgba(0, 242, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 242, 255, 0.05) 1px, transparent 1px); background-size: 40px 40px; pointer-events: none; z-index: 0; }
.flow-wrapper { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 1; }
.glass-hud { background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(15px); border: 1px solid rgba(0, 242, 255, 0.3); box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
.neon-progress-container { position: fixed; top: 20px; left: 50%; transform: translateX(-50%); z-index: 100; border-radius: 16px; }
.p-left { display: flex; align-items: center; gap: 12px; font-weight: 700; }
.role-badge { background: rgba(0, 242, 255, 0.15); padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; letter-spacing: 1px; border: 1px solid rgba(0, 242, 255, 0.4); max-width: 180px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.btn-archive { background: rgba(245, 158, 11, 0.1); border: 1px solid #f59e0b; color: #f59e0b; padding: 6px 16px; border-radius: 8px; cursor: pointer; font-size: 0.8rem; font-weight: 600; display: flex; align-items: center; gap: 6px; transition: 0.3s; }
.btn-archive:hover { background: #f59e0b; color: black; box-shadow: 0 0 15px #f59e0b; }
.progress-track { height: 6px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden; position: relative; }
.progress-glow { height: 100%; background: linear-gradient(90deg, #00f2ff, #bd00ff); box-shadow: 0 0 15px #00f2ff; transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1); position: relative; }
.progress-flare { position: absolute; right: 0; top: 0; height: 100%; width: 5px; background: white; box-shadow: 0 0 10px white; }
.intro-overlay { position: absolute; inset: 0; display: flex; justify-content: center; align-items: center; z-index: 50; background: rgba(15, 23, 42, 0.9); backdrop-filter: blur(8px); }
.intro-content { text-align: center; display: flex; flex-direction: column; align-items: center; }
.neon-title { font-size: 4.5rem; font-weight: 900; color: white; text-transform: uppercase; text-shadow: 0 0 10px rgba(0, 242, 255, 0.8), 0 0 20px rgba(0, 242, 255, 0.4); margin: 0; letter-spacing: 4px; }
.subtitle { color: #94a3b8; font-size: 1.1rem; margin-bottom: 40px; letter-spacing: 1px; }
.input-box-glow { display: flex; position: relative; width: 550px; box-shadow: 0 0 30px rgba(189, 0, 255, 0.2); border-radius: 14px; }
.neon-input { flex: 1; background: rgba(0, 0, 0, 0.6); border: 1px solid #bd00ff; border-right: none; color: white; padding: 18px 25px; border-top-left-radius: 14px; border-bottom-left-radius: 14px; font-size: 1.1rem; outline: none; transition: 0.3s; }
.neon-input:focus { background: rgba(0,0,0,0.8); box-shadow: inset 0 0 20px rgba(189, 0, 255, 0.2); }
.neon-btn { background: linear-gradient(135deg, #00f2ff, #00a8ff); color: black; border: none; padding: 0 40px; font-weight: 800; font-size: 1rem; cursor: pointer; border-top-right-radius: 14px; border-bottom-right-radius: 14px; transition: 0.3s; letter-spacing: 1px; }
.neon-btn:hover { filter: brightness(1.2); box-shadow: 0 0 20px #00f2ff; }
.neon-btn:disabled { filter: grayscale(1); cursor: not-allowed; }
.tags-suggestion { margin-top: 20px; display: flex; gap: 10px; }
.tags-suggestion span { color: #94a3b8; font-size: 0.9rem; cursor: pointer; transition: 0.2s; border-bottom: 1px dashed transparent; }
.tags-suggestion span:hover { color: #00f2ff; border-bottom-color: #00f2ff; text-shadow: 0 0 8px #00f2ff; }
.loader-overlay { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: center; align-items: center; z-index: 60; background: #0f172a; }
.cyber-spinner { width: 80px; height: 80px; border: 4px solid transparent; border-top: 4px solid #00f2ff; border-right: 4px solid #bd00ff; border-radius: 50%; animation: spin 1s linear infinite; position: relative; box-shadow: 0 0 15px rgba(0, 242, 255, 0.5); }
.inner-circle { position: absolute; inset: 10px; border: 2px solid transparent; border-bottom: 2px solid white; border-radius: 50%; animation: spin 2s linear infinite reverse; }
@keyframes spin { 100% { transform: rotate(360deg); } }
.loader-text { margin-top: 20px; color: #00f2ff; letter-spacing: 2px; font-size: 0.9rem; animation: pulse 1.5s infinite; }
.scan-line { position: absolute; top: 0; left: 0; width: 100%; height: 2px; background: rgba(255,255,255,0.5); opacity: 0; transition: 0.3s; box-shadow: 0 0 10px white; }
.neon-node:hover .scan-line { opacity: 1; animation: scan 1.5s linear infinite; }
@keyframes scan { 0% { top: 0; } 100% { top: 100%; } }
.side-drawer { position: absolute; top: 0; right: 0; bottom: 0; width: 420px; background: rgba(15, 23, 42, 0.95); border-left: 1px solid rgba(255, 255, 255, 0.1); padding: 40px; z-index: 200; display: flex; flex-direction: column; box-shadow: -20px 0 50px rgba(0,0,0,0.8); backdrop-filter: blur(20px); }
.drawer-glow-bg { position: absolute; top: 0; right: 0; width: 100%; height: 300px; background: radial-gradient(circle at top right, rgba(0, 242, 255, 0.15), transparent 70%); pointer-events: none; }
.close-btn { position: absolute; top: 20px; right: 20px; background: none; border: none; color: #94a3b8; font-size: 1.5rem; cursor: pointer; transition: 0.2s; }
.close-btn:hover { color: white; transform: rotate(90deg); }
.drawer-header { margin-bottom: 20px; }
.drawer-header h3 { font-size: 1.8rem; color: white; margin: 0 0 10px 0; text-shadow: 0 0 10px rgba(0, 242, 255, 0.5); }
.desc-container { flex: 1; overflow-y: auto; margin-bottom: 20px; padding-right: 10px; }
.drawer-desc { line-height: 1.8; color: #cbd5e1; font-size: 1rem; white-space: pre-wrap; }
.action-area { margin-top: auto; padding-top: 20px; border-top: 1px solid #333; }
.locked-state { text-align: center; color: #64748b; padding: 20px; border: 1px dashed #334155; border-radius: 12px; background: rgba(0,0,0,0.2); }
.lock-icon { font-size: 2rem; margin-bottom: 10px; color: #475569; }
.btn-quiz-start { margin-top: 15px; width: 100%; background: linear-gradient(135deg, #8b5cf6, #6366f1); color: white; border: none; padding: 12px; border-radius: 10px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 15px rgba(139, 92, 246, 0.3); transition: 0.3s; }
.btn-quiz-start:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(139, 92, 246, 0.5); }
.completed-state { display: flex; align-items: center; justify-content: center; gap: 10px; background: rgba(16, 185, 129, 0.1); color: #10b981; padding: 15px; border-radius: 12px; border: 1px solid rgba(16, 185, 129, 0.3); font-weight: 700; }
.done-icon { font-size: 1.2rem; }
.slide-down-enter-active, .slide-down-leave-active { transition: transform 0.5s cubic-bezier(0.19, 1, 0.22, 1); }
.slide-down-enter-from, .slide-down-leave-to { transform: translate(-50%, -150%); }
.zoom-fade-enter-active, .zoom-fade-leave-active { transition: all 0.6s cubic-bezier(0.19, 1, 0.22, 1); }
.zoom-fade-enter-from, .zoom-fade-leave-to { opacity: 0; transform: scale(0.9); }
.slide-right-enter-active, .slide-right-leave-active { transition: transform 0.4s cubic-bezier(0.19, 1, 0.22, 1); }
.slide-right-enter-from, .slide-right-leave-to { transform: translateX(100%); }
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.custom-scroll::-webkit-scrollbar { width: 4px; }
.custom-scroll::-webkit-scrollbar-thumb { background: #475569; border-radius: 2px; }

/* QUIZ */
.quiz-container { display: flex; height: 600px; background: #0f172a; color: white; overflow: hidden; border-radius: 24px; border: 1px solid #334155; box-shadow: 0 25px 60px rgba(0, 0, 0, 0.9); font-family: 'Segoe UI', sans-serif; }
.quiz-left { flex: 1.3; padding: 30px; display: flex; flex-direction: column; background: radial-gradient(circle at top left, #1e293b 0%, #0f172a 100%); border-right: 1px solid #334155; position: relative; }
.quiz-header { display: flex; align-items: center; gap: 15px; margin-bottom: 20px; color: #00f2ff; flex-shrink: 0; }
.q-icon-box { width: 42px; height: 42px; background: rgba(0, 242, 255, 0.1); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.6rem; box-shadow: 0 0 15px rgba(0, 242, 255, 0.2); }
.quiz-header h3 { font-size: 1.5rem; margin: 0; font-weight: 800; letter-spacing: 1px; }
.quiz-loading-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #94a3b8; gap: 15px; }
.cyber-spinner.small { width: 40px; height: 40px; border-width: 3px; }
.quiz-content-wrapper { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.quiz-scroll-area { flex: 1; overflow-y: auto; padding-right: 8px; margin-bottom: 15px; }
.question-card { background: rgba(255, 255, 255, 0.03); padding: 20px; border-radius: 12px; border-left: 4px solid #00f2ff; margin-bottom: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); }
.question-card p { font-size: 1.05rem; line-height: 1.6; margin: 0; color: #e2e8f0; }
.hint-box { display: flex; gap: 12px; background: rgba(245, 158, 11, 0.1); padding: 12px; border-radius: 8px; border: 1px solid rgba(245, 158, 11, 0.2); }
.hint-icon { color: #f59e0b; font-size: 1.2rem; }
.hint-text { color: #fbbf24; font-size: 0.95rem; line-height: 1.4; }
.quiz-fixed-bottom { margin-top: auto; display: flex; flex-direction: column; flex-shrink: 0; }
.input-label { font-size: 0.9rem; color: #94a3b8; margin-bottom: 8px; font-weight: 600; }
.cyber-textarea { width: 100%; background: #0b1120; border: 1px solid #334155; color: #e2e8f0; padding: 15px; border-radius: 12px; resize: none; outline: none; font-family: 'Consolas', monospace; font-size: 0.95rem; line-height: 1.5; transition: 0.3s; height: 120px; }
.cyber-textarea:focus { border-color: #00f2ff; box-shadow: 0 0 15px rgba(0, 242, 255, 0.15); }
.quiz-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 15px; }
.btn-cancel { background: transparent; color: #64748b; border: none; cursor: pointer; font-weight: 600; transition: 0.2s; font-size: 0.9rem; }
.btn-cancel:hover { color: #94a3b8; text-decoration: underline; }
.btn-check { background: linear-gradient(135deg, #00f2ff, #006aff); color: white; border: none; padding: 10px 25px; border-radius: 10px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 10px; transition: 0.3s; box-shadow: 0 4px 20px rgba(0, 106, 255, 0.3); }
.btn-check:hover { transform: translateY(-2px); box-shadow: 0 6px 25px rgba(0, 106, 255, 0.5); }
.btn-check:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
.quiz-right { flex: 1; position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 30px; overflow: hidden; }
.quiz-right-bg { position: absolute; inset: 0; background: #111827; z-index: 0; background-image: radial-gradient(#1e293b 1px, transparent 1px); background-size: 20px 20px; }
.ai-placeholder { text-align: center; color: #475569; z-index: 1; position: relative; max-width: 250px; }
.placeholder-icon { font-size: 4rem; margin-bottom: 15px; opacity: 0.5; animation: float 6s infinite ease-in-out; }
.ai-placeholder h3 { font-size: 1.3rem; color: #64748b; margin: 0 0 10px; }
.ai-placeholder p { font-size: 0.95rem; line-height: 1.5; }
.ai-result-content { z-index: 1; width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; }
.score-ring-wrapper { margin-bottom: 20px; margin-top: 5px; flex-shrink: 0; }
.score-ring { width: 110px; height: 110px; border-radius: 50%; border: 8px solid #334155; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #0f172a; box-shadow: 0 0 30px rgba(0,0,0,0.5); }
.score-ring.pass { border-color: #10b981; box-shadow: 0 0 30px rgba(16, 185, 129, 0.4); }
.score-ring.fail { border-color: #ef4444; box-shadow: 0 0 30px rgba(239, 68, 68, 0.4); }
.score-num { font-size: 2.2rem; font-weight: 900; color: white; line-height: 1; }
.score-label { font-size: 0.65rem; font-weight: 700; color: #94a3b8; letter-spacing: 2px; margin-top: 5px; }
.feedback-scroll { flex: 1; width: 100%; padding-right: 5px; overflow-y: auto; margin-bottom: 20px; }
.feedback-markdown { font-size: 0.95rem; line-height: 1.7; color: #cbd5e1; text-align: left; }
.feedback-markdown strong { color: #00f2ff; }
.result-actions { width: 100%; margin-top: auto; flex-shrink: 0; }
.btn-finish { width: 100%; background: #10b981; color: white; border: none; padding: 12px; border-radius: 10px; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: 0.3s; }
.btn-finish:hover { box-shadow: 0 0 20px rgba(16, 185, 129, 0.4); transform: translateY(-2px); }
.btn-retry { width: 100%; background: #334155; color: white; border: none; padding: 12px; border-radius: 10px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: 0.3s; }
.btn-retry:hover { background: #475569; }
</style>