<template>
  <div class="neon-page">
    <!-- ФОН -->
    <div class="particles-container">
      <div v-for="(p, i) in particles" :key="i" class="particle" :style="p.style"></div>
    </div>
    <div class="grid-overlay"></div>

    <!-- КНОПКА МЕНЮ ТРЕКОВ (СЛЕВА) -->
    <!-- Исправлено: сдвинута правее, чтобы не быть под Навбаром -->
    <div class="tracks-menu-btn glass-btn" @click="tracksDrawerOpen = true">
       <bars-outlined />
       <span class="btn-label">Мои Треки</span>
    </div>

    <!-- HUD: ПРОГРЕСС (СВЕРХУ) -->
    <transition name="slide-down">
      <div class="neon-progress-container glass-hud" v-if="elements.length > 0 && !isCreatingNew">
        <div class="hud-top-row">
           <div class="p-left">
             <div class="xp-badge">
               <thunderbolt-filled /> <span>{{ totalXP }} XP</span>
             </div>
             <div class="role-container" v-if="targetRole">
                <span class="role-label">Цель:</span>
                <span class="role-badge">{{ targetRole }}</span>
             </div>
           </div>

           <a-popconfirm
            title="Удалить этот трек?"
            ok-text="Да" cancel-text="Нет"
            @confirm="archiveCurrentTrack"
          >
             <button class="btn-archive" title="В архив"><delete-outlined /></button>
          </a-popconfirm>
        </div>

        <div class="progress-wrapper">
          <div class="progress-info">
             <span>Прогресс</span>
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

    <!-- ЭКРАН СОЗДАНИЯ -->
    <transition name="zoom-fade">
      <div v-if="isCreatingNew || (!loading && elements.length === 0)" class="intro-overlay">
        <button v-if="roadmapList.length > 0" class="close-intro-btn" @click="cancelCreation">
           <close-outlined />
        </button>

        <div class="intro-content">
          <div class="glitch-wrapper">
             <h1 class="neon-title" data-text="Neural Path">Neural Path</h1>
          </div>
          <p class="subtitle">Создайте новый карьерный трек с помощью ИИ</p>

          <div class="input-box-glow">
             <input
               v-model="newRoleInput"
               @keydown.enter="generateRoadmap"
               placeholder="Кем хотите стать? (напр. DevOps)"
               class="neon-input"
             />
             <button @click="generateRoadmap" :disabled="loading" class="neon-btn">
               <thunderbolt-filled v-if="!loading" />
               <span v-else><loading-outlined /></span>
               {{ loading ? 'AI PROCESSING' : 'START' }}
             </button>
          </div>

          <div class="tags-suggestion">
            <span @click="newRoleInput='Java Backend'">#Java</span>
            <span @click="newRoleInput='Fullstack JS'">#Fullstack</span>
            <span @click="newRoleInput='QA Automation'">#QA</span>
          </div>
        </div>
      </div>
    </transition>

    <!-- ГРАФ (VUE FLOW) -->
    <div class="flow-wrapper" :class="{ 'blur-bg': isCreatingNew || loading }">
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

    <!-- SIDEBAR: СПИСОК ТРЕКОВ -->
    <!-- Исправлен z-index и класс обертки -->
    <a-drawer
      v-model:open="tracksDrawerOpen"
      placement="left"
      :closable="true"
      width="340"
      :headerStyle="{ background: '#0f172a', borderBottom: '1px solid #334155', color: 'white' }"
      :bodyStyle="{ background: '#0f172a', padding: '0' }"
      class="custom-drawer"
      :zIndex="2000"
    >
       <template #title>
          <span style="color: white; font-weight: 700;">Мои Роадмапы</span>
       </template>

       <div class="drawer-inner">
          <div class="td-list custom-scroll">
              <div v-if="roadmapList.length === 0" class="empty-tracks">Нет активных треков</div>

              <div
                v-for="track in roadmapList"
                :key="track.id"
                class="track-item"
                :class="{ active: track.id === activeRoadmapId }"
                @click="switchTrack(track)"
              >
                <div class="ti-icon">
                    <compass-outlined />
                </div>
                <div class="ti-info">
                    <div class="ti-role">{{ track.role }}</div>
                    <div class="ti-progress-bg">
                      <div class="ti-bar" :style="{ width: getTrackProgress(track) + '%' }"></div>
                    </div>
                    <div class="ti-percent">{{ getTrackProgress(track) }}%</div>
                </div>
              </div>
          </div>
          <div class="td-footer">
              <button class="btn-add-track" @click="startNewTrack">
                <plus-outlined /> Новый трек
              </button>
          </div>
       </div>
    </a-drawer>

    <!-- DRAWER: ДЕТАЛИ УЗЛА (ПРАВЫЙ) -->
    <!-- Исправлены отступы и перекрытие -->
    <transition name="slide-right">
       <div v-if="selectedNode" class="side-drawer glass-panel">
          <div class="drawer-glow-bg"></div>
          <button class="close-btn" @click="closeDrawer"><close-outlined /></button>

          <div class="drawer-content-wrapper custom-scroll">
              <div class="drawer-header">
                <div class="dh-top">
                    <span class="difficulty-badge" :class="selectedNode.difficulty || 'medium'">
                      {{ selectedNode.difficulty || 'Medium' }}
                    </span>
                    <span class="xp-reward">+{{ selectedNode.xpEarned || 100 }} XP</span>
                </div>
                <h3>{{ selectedNode.label }}</h3>
              </div>

              <div class="drawer-tabs">
                <button :class="{ active: activeTab === 'theory' }" @click="activeTab = 'theory'">Теория</button>
                <button :class="{ active: activeTab === 'resources' }" @click="activeTab = 'resources'">Ресурсы</button>
              </div>

              <div class="tab-content">
                <!-- ТЕОРИЯ -->
                <div v-if="activeTab === 'theory'">
                  <p class="drawer-desc">{{ selectedNode.desc || 'Описание отсутствует.' }}</p>
                  <div class="action-area">
                      <div v-if="!selectedNode.done" class="locked-state">
                          <div class="lock-icon"><lock-filled /></div>
                          <p>Пройдите тест, чтобы завершить модуль</p>
                          <button class="btn-quiz-start" @click="openQuizModal">
                              <experiment-filled /> Начать тест
                          </button>
                      </div>
                      <div v-else class="completed-state">
                          <check-circle-filled class="done-icon" />
                          <span>Модуль пройден</span>
                      </div>
                  </div>
                </div>
                <!-- РЕСУРСЫ -->
                <div v-else class="resources-list">
                  <div v-if="!selectedNode.resources || !selectedNode.resources.length" class="no-res">
                      <info-circle-outlined /><span>ИИ не нашел точных ссылок.</span>
                  </div>
                  <div class="res-item" v-for="(res, idx) in (selectedNode.resources || [])" :key="idx">
                      <div class="res-icon"><read-outlined /></div>
                      <div class="res-info">
                        <div class="res-title">{{ res.title }}</div>
                        <div class="res-type">Материал</div>
                      </div>
                      <a :href="getSafeLink(res)" target="_blank" class="res-link"><arrow-right-outlined /></a>
                  </div>
                </div>
              </div>
          </div>
       </div>
    </transition>

    <!-- QUIZ MODAL (Оставлено без изменений, только стиль подправлен) -->
    <a-modal v-model:open="quizVisible" :footer="null" width="950px" centered wrapClassName="cyber-modal-wrapper" :closable="false" :maskClosable="false">
       <div class="quiz-container">
          <div class="quiz-left">
             <div class="quiz-header"><div class="q-icon-box"><bulb-filled /></div><h3>Задание от AI</h3></div>
             <div v-if="quizLoading" class="quiz-loading-state"><div class="cyber-spinner small"></div><span>Генерирую задачу...</span></div>
             <div v-else class="quiz-content-wrapper"><div class="quiz-scroll-area custom-scroll"><div class="question-card"><p>{{ quizData.question }}</p></div><div class="hint-box" v-if="quizData.hint"><div class="hint-text"><strong>Подсказка:</strong> {{ quizData.hint }}</div></div></div><div class="quiz-fixed-bottom"><label class="input-label">Ваше решение:</label><textarea v-model="userAnswer" placeholder="Напишите код..." class="cyber-textarea custom-scroll"></textarea><div class="quiz-footer"><button class="btn-cancel" @click="quizVisible = false" :disabled="checkLoading">Отмена</button><button class="btn-check" @click="checkAnswer" :disabled="checkLoading || !userAnswer || quizLoading"><thunderbolt-filled v-if="!checkLoading" /><loading-outlined v-else />{{ checkLoading ? 'Анализ...' : 'Проверить' }}</button></div></div></div>
          </div>
          <div class="quiz-right">
             <div class="quiz-right-bg"></div>
             <div v-if="!quizResult" class="ai-placeholder fade-in"><div class="placeholder-icon"><robot-outlined /></div><h3>Ожидание решения</h3><p>Отправьте ваш ответ для проверки.</p></div>
             <div v-else class="ai-result-content slide-up"><div class="score-ring-wrapper"><div class="score-ring" :class="quizResult.passed ? 'pass' : 'fail'"><span class="score-num">{{ quizResult.score }}</span><span class="score-label">SCORE</span></div></div><div class="feedback-scroll custom-scroll"><div class="feedback-markdown" v-html="formatMarkdown(quizResult.feedback)"></div></div><div class="result-actions"><button v-if="quizResult.passed" class="btn-finish" @click="completeNode"><check-circle-filled /> Забрать награду</button><button v-else class="btn-retry" @click="userAnswer = ''; quizResult = null;"><reload-outlined /> Попробовать снова</button></div></div>
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
  LockFilled, ReloadOutlined, ClockCircleOutlined, YoutubeFilled, ReadOutlined, ArrowRightOutlined,
  BarsOutlined, CompassOutlined, PlusOutlined, DeleteOutlined
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
    LockFilled, ReloadOutlined, ClockCircleOutlined, YoutubeFilled, ReadOutlined, ArrowRightOutlined,
    BarsOutlined, CompassOutlined, PlusOutlined, DeleteOutlined
  },
  setup() {
    const { setCenter, fitView } = useVueFlow();

    const roadmapList = ref([]);
    const activeRoadmapId = ref(null);
    const isCreatingNew = ref(false);
    const tracksDrawerOpen = ref(false);

    const targetRole = ref('');
    const newRoleInput = ref('');
    const loading = ref(true);
    const saving = ref(false);
    const selectedNode = ref(null);
    const elements = ref([]);
    const particles = ref([]);
    const totalXP = ref(0);
    const activeTab = ref('theory');

    const quizVisible = ref(false);
    const quizLoading = ref(false);
    const checkLoading = ref(false);
    const quizData = ref({});
    const userAnswer = ref('');
    const quizResult = ref(null);

    onMounted(() => {
      for (let i = 0; i < 40; i++) {
        particles.value.push({
            style: { left: `${Math.random()*100}%`, width: `${Math.random()*3+1}px`, height: `${Math.random()*3+1}px`, animationDuration: `${Math.random()*20+10}s`, animationDelay: `${Math.random()*5}s`, opacity: Math.random()*0.5+0.1 }
        });
      }
      loadAllRoadmaps();
    });

    const loadAllRoadmaps = async () => {
       loading.value = true;
       try {
         const r = await api.get('/chat/roadmap');
         if (r.data && r.data.list) {
             roadmapList.value = r.data.list;
             if (r.data.list.length > 0) {
                 const activeId = r.data.activeId || r.data.list[0].id;
                 const activeTrack = r.data.list.find(t => t.id === activeId) || r.data.list[0];
                 setActiveTrackData(activeTrack);
             } else {
                 elements.value = []; isCreatingNew.value = true;
             }
         }
       } catch (e) { console.error(e); } finally { loading.value = false; }
    };

    const setActiveTrackData = (track) => {
        activeRoadmapId.value = track.id;
        targetRole.value = track.role;
        elements.value = track.nodes || [];
        isCreatingNew.value = false;
        totalXP.value = elements.value.reduce((acc, el) => acc + (el.data?.done ? (el.data.xpEarned || 100) : 0), 0);
        nextTick(() => setTimeout(() => fitView({ padding: 0.2 }), 100));
    };

    const switchTrack = (track) => {
        if (track.id === activeRoadmapId.value) return;
        saveCurrentState();
        setActiveTrackData(track);
        tracksDrawerOpen.value = false;
        api.post('/chat/roadmap/save', { activeId: track.id });
    };

    const startNewTrack = () => { isCreatingNew.value = true; tracksDrawerOpen.value = false; newRoleInput.value = ''; };
    const cancelCreation = () => { if (roadmapList.value.length > 0) { isCreatingNew.value = false; const current = roadmapList.value.find(t => t.id === activeRoadmapId.value); if(current) setActiveTrackData(current); } };

    const generateRoadmap = async () => {
      if(!newRoleInput.value.trim()) return message.warning('Введите роль!');
      loading.value = true;
      try {
        const res = await api.post('/chat/roadmap', { role: newRoleInput.value });
        const newElements = transformStepsToGraph(res.data);
        await api.post('/chat/roadmap/save', { roadmapId: null, role: newRoleInput.value, nodes: newElements });
        await loadAllRoadmaps();
      } catch (e) { message.error("AI Error"); } finally { loading.value = false; }
    };

    const transformStepsToGraph = (steps) => {
        const newElements = []; let xBase = 0;
        steps.forEach((step, idx) => {
            const mainId = `main-${idx}`;
            newElements.push({ id: mainId, type: 'custom', position: { x: xBase, y: 0 }, data: { ...step, done: false, isSub: false } });
            if (idx > 0) newElements.push({ id: `e-main-${idx-1}-${idx}`, source: `main-${idx-1}`, target: mainId, animated: true, style: { stroke: '#00f2ff', strokeWidth: 3, strokeDasharray: 5 } });
            if (step.subtopics) {
                step.subtopics.forEach((sub, subIdx) => {
                    const subId = `sub-${idx}-${subIdx}`;
                    const level = Math.floor(subIdx / 2) + 1;
                    const yOffset = subIdx % 2 === 0 ? -(level * 350) : (level * 350);
                    const xOffset = (subIdx % 2 === 0 ? -80 : 80) + (level * 40);
                    newElements.push({ id: subId, type: 'custom', position: { x: xBase + xOffset, y: yOffset }, data: { ...sub, done: false, isSub: true } });
                    newElements.push({ id: `e-${mainId}-${subId}`, source: mainId, target: subId, style: { stroke: '#bd00ff', strokeWidth: 1 } });
                });
            }
            xBase += 900;
        });
        return newElements;
    };

    let saveTimeout = null;
    watch(elements, (newVal) => {
        if (loading.value || isCreatingNew.value || elements.value.length === 0) return;
        clearTimeout(saveTimeout);
        saving.value = true;
        saveTimeout = setTimeout(() => saveCurrentState(), 1500);
    }, { deep: true });

    const saveCurrentState = async () => {
        if (!activeRoadmapId.value) return;
        try { await api.post('/chat/roadmap/save', { roadmapId: activeRoadmapId.value, nodes: elements.value, role: targetRole.value }); } catch(e) {} finally { saving.value = false; }
    };

    const archiveCurrentTrack = async () => {
        if (!activeRoadmapId.value) return;
        try {
            await api.post('/chat/roadmap/archive', { roadmapId: activeRoadmapId.value });
            message.success('Трек удален');
            await loadAllRoadmaps();
        } catch (e) { message.error('Error'); }
    };

    const getTrackProgress = (track) => {
        if (!track.nodes) return 0;
        const nodes = track.nodes.filter(el => el.type === 'custom');
        if (!nodes.length) return 0;
        const done = nodes.reduce((acc, n) => acc + (n.data?.done ? 1 : 0), 0);
        return Math.round((done / nodes.length) * 100);
    };

    const progress = computed(() => getTrackProgress({ nodes: elements.value }));
    const onNodeClick = (event) => { selectedNode.value = event.node.data; activeTab.value = 'theory'; setCenter(event.node.position.x, event.node.position.y, { zoom: 1.2, duration: 800 }); };
    const closeDrawer = () => { selectedNode.value = null; fitView({ padding: 0.2, duration: 800 }); };
    const getSafeLink = (res) => res.link && res.link.startsWith('http') ? res.link : `https://www.google.com/search?q=${encodeURIComponent(res.title + ' tutorial ' + targetRole.value)}`;
    const openQuizModal = async () => { if (!selectedNode.value) return; quizVisible.value = true; quizLoading.value = true; userAnswer.value = ''; quizResult.value = null; try { const res = await api.post('/chat/roadmap/quiz', { topic: selectedNode.value.label, description: selectedNode.value.desc }); quizData.value = res.data; } catch (e) { quizVisible.value = false; } finally { quizLoading.value = false; } };
    const checkAnswer = async () => { checkLoading.value = true; try { const res = await api.post('/chat/roadmap/check', { topic: selectedNode.value.label, question: quizData.value.question, answer: userAnswer.value }); quizResult.value = res.data; } catch (e) {} finally { checkLoading.value = false; } };
    const completeNode = () => { if (selectedNode.value) { selectedNode.value.done = true; totalXP.value += (selectedNode.value.xpEarned || 100); message.success('Модуль пройден!'); quizVisible.value = false; } };
    const formatMarkdown = (text) => marked.parse(text || '');

    return {
      roadmapList, activeRoadmapId, isCreatingNew, tracksDrawerOpen, switchTrack, startNewTrack, cancelCreation, getTrackProgress, archiveCurrentTrack,
      targetRole, newRoleInput, loading, elements, generateRoadmap,
      onNodeClick, selectedNode, closeDrawer, progress, saving, particles,
      quizVisible, quizLoading, quizData, userAnswer, checkAnswer, checkLoading, quizResult, completeNode, openQuizModal, formatMarkdown,
      totalXP, activeTab, getSafeLink
    };
  }
}
</script>

<style scoped>
/* --- КНОПКА "МОИ ТРЕКИ" (ИСПРАВЛЕНО) --- */
.tracks-menu-btn {
    position: fixed;
    top: 20px;
    left: 100px; /* 🔥 СДВИГ, ЧТОБЫ НЕ НАЕЗЖАТЬ НА НАВБАР */
    z-index: 90; /* Ниже HUD, но выше фона */
    background: rgba(15, 23, 42, 0.7);
    border: 1px solid rgba(0, 242, 255, 0.3);
    padding: 10px 15px;
    border-radius: 12px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 10px;
    color: #00f2ff;
    backdrop-filter: blur(10px);
    transition: 0.3s;
}
.tracks-menu-btn:hover { background: rgba(0, 242, 255, 0.1); box-shadow: 0 0 15px rgba(0, 242, 255, 0.3); }
.btn-label { font-weight: 700; letter-spacing: 0.5px; font-size: 0.9rem; }

/* --- HUD (ВЕРХНИЙ БАР) --- */
.neon-progress-container {
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-40%); /* 🔥 ЦЕНТРИРОВАНИЕ С ПОПРАВКОЙ НА МЕНЮ */
    z-index: 100;
    border-radius: 16px;
    width: 600px;
    padding: 15px 25px;
    gap: 10px;
}
.glass-hud { background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(15px); border: 1px solid rgba(0, 242, 255, 0.3); box-shadow: 0 10px 30px rgba(0,0,0,0.5); }

.hud-top-row { display: flex; justify-content: space-between; align-items: center; width: 100%; }
.p-left { display: flex; align-items: center; gap: 15px; }
.xp-badge { display: flex; align-items: center; gap: 6px; background: rgba(255, 215, 0, 0.1); border: 1px solid rgba(255, 215, 0, 0.5); color: #ffd700; padding: 4px 10px; border-radius: 8px; font-weight: 800; font-size: 0.9rem; }
.role-container { display: flex; align-items: center; gap: 6px; }
.role-label { color: #94a3b8; font-size: 0.8rem; }
.role-badge { color: white; font-weight: 700; font-size: 0.9rem; }

.btn-archive { background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444; color: #ef4444; width: 32px; height: 32px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.3s; }
.btn-archive:hover { background: #ef4444; color: white; }

.progress-wrapper { display: flex; flex-direction: column; gap: 4px; margin-top: 5px; }
.progress-info { display: flex; justify-content: space-between; font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; }
.progress-track { height: 6px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden; position: relative; }
.progress-glow { height: 100%; background: linear-gradient(90deg, #00f2ff, #bd00ff); box-shadow: 0 0 15px #00f2ff; transition: width 0.6s; }

/* --- RIGHT DRAWER (ДЕТАЛИ) --- */
.side-drawer {
    position: fixed; /* Fixed, чтобы не уезжал */
    top: 0;
    right: 0;
    bottom: 0;
    width: 450px;
    background: rgba(15, 23, 42, 0.98);
    border-left: 1px solid rgba(255, 255, 255, 0.1);
    z-index: 300; /* 🔥 ПОВЕРХ ВСЕГО */
    display: flex;
    flex-direction: column;
    box-shadow: -20px 0 50px rgba(0,0,0,0.8);
    backdrop-filter: blur(20px);
}
.drawer-content-wrapper { padding: 30px; flex: 1; overflow-y: auto; padding-top: 60px; }
.drawer-glow-bg { position: absolute; top: 0; right: 0; width: 100%; height: 300px; background: radial-gradient(circle at top right, rgba(0, 242, 255, 0.15), transparent 70%); pointer-events: none; }
.close-btn { position: absolute; top: 20px; right: 20px; background: none; border: none; color: #94a3b8; font-size: 1.5rem; cursor: pointer; z-index: 310; }
.close-btn:hover { color: white; transform: rotate(90deg); }

.drawer-header { margin-bottom: 20px; }
.drawer-header h3 { font-size: 1.8rem; color: white; margin: 10px 0; text-shadow: 0 0 10px rgba(0, 242, 255, 0.5); }
.dh-top { display: flex; justify-content: space-between; margin-bottom: 8px; }
.difficulty-badge { font-size: 0.7rem; text-transform: uppercase; font-weight: 800; padding: 2px 8px; border-radius: 4px; letter-spacing: 1px; }
.difficulty-badge.easy { color: #10b981; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); }
.difficulty-badge.medium { color: #f59e0b; background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); }
.difficulty-badge.hard { color: #ef4444; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); }
.xp-reward { color: #ffd700; font-weight: 800; font-size: 0.8rem; text-shadow: 0 0 5px rgba(255, 215, 0, 0.5); }

.drawer-tabs { display: flex; border-bottom: 1px solid #334155; margin-bottom: 20px; }
.drawer-tabs button { flex: 1; background: transparent; border: none; padding: 10px; color: #64748b; font-weight: 600; cursor: pointer; border-bottom: 2px solid transparent; }
.drawer-tabs button.active { color: white; border-bottom-color: #00f2ff; text-shadow: 0 0 10px rgba(0, 242, 255, 0.5); }
.drawer-desc { line-height: 1.8; color: #cbd5e1; font-size: 1rem; white-space: pre-wrap; margin-bottom: 20px; }
.action-area { margin-top: 20px; border-top: 1px solid #333; padding-top: 20px; }
.locked-state { text-align: center; color: #64748b; padding: 20px; border: 1px dashed #334155; border-radius: 12px; background: rgba(0,0,0,0.2); }
.lock-icon { font-size: 2rem; margin-bottom: 10px; color: #475569; }
.btn-quiz-start { margin-top: 15px; width: 100%; background: linear-gradient(135deg, #8b5cf6, #6366f1); color: white; border: none; padding: 12px; border-radius: 10px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 15px rgba(139, 92, 246, 0.3); transition: 0.3s; }
.btn-quiz-start:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(139, 92, 246, 0.5); }
.completed-state { display: flex; align-items: center; justify-content: center; gap: 10px; background: rgba(16, 185, 129, 0.1); color: #10b981; padding: 15px; border-radius: 12px; border: 1px solid rgba(16, 185, 129, 0.3); font-weight: 700; }

.resources-list { display: flex; flex-direction: column; gap: 10px; }
.no-res { padding: 20px; text-align: center; color: #94a3b8; background: rgba(255,255,255,0.03); border-radius: 10px; display: flex; flex-direction: column; align-items: center; gap: 10px; }
.res-item { display: flex; align-items: center; gap: 12px; background: rgba(255,255,255,0.03); padding: 12px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.05); transition: 0.2s; }
.res-item:hover { background: rgba(255,255,255,0.07); transform: translateX(5px); border-color: rgba(255,255,255,0.1); }
.res-icon { font-size: 1.5rem; color: #cbd5e1; }
.res-info { flex: 1; min-width: 0; }
.res-title { font-weight: 600; color: #e2e8f0; font-size: 0.95rem; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.res-type { font-size: 0.75rem; color: #64748b; }
.res-link { color: #00f2ff; font-size: 1.1rem; margin-left: auto; }

/* --- LEFT DRAWER (TRACKS) --- */
.drawer-inner { display: flex; flex-direction: column; height: 100%; }
.td-list { flex: 1; overflow-y: auto; padding: 15px; }
.empty-tracks { text-align: center; color: #64748b; margin-top: 40px; font-style: italic; }
.track-item { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 10px; cursor: pointer; transition: 0.2s; margin-bottom: 8px; border: 1px solid transparent; background: rgba(255,255,255,0.03); }
.track-item:hover { background: rgba(255,255,255,0.08); }
.track-item.active { background: rgba(0, 242, 255, 0.15); border-color: rgba(0, 242, 255, 0.4); }
.ti-icon { font-size: 1.5rem; color: #00f2ff; }
.ti-info { flex: 1; }
.ti-role { font-weight: 700; font-size: 0.9rem; margin-bottom: 4px; color: white; }
.ti-progress-bg { height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; overflow: hidden; width: 100%; }
.ti-bar { height: 100%; background: #00f2ff; }
.ti-percent { font-size: 0.7rem; color: #94a3b8; text-align: right; margin-top: 2px; }
.td-footer { padding: 20px; border-top: 1px solid rgba(255,255,255,0.1); }
.btn-add-track { width: 100%; background: #00f2ff; color: black; border: none; padding: 12px; border-radius: 10px; font-weight: 700; cursor: pointer; display: flex; justify-content: center; align-items: center; gap: 8px; transition: 0.2s; }
.btn-add-track:hover { box-shadow: 0 0 20px rgba(0, 242, 255, 0.5); }

/* --- OTHER --- */
.neon-page { position: relative; width: 100%; height: 100vh; background: #0f172a; color: white; overflow: hidden; font-family: 'Segoe UI', sans-serif; }
.particles-container { position: absolute; inset: 0; overflow: hidden; z-index: 0; pointer-events: none; }
.particle { position: absolute; bottom: -10px; background: white; border-radius: 50%; animation: floatUp linear infinite; box-shadow: 0 0 5px white; }
@keyframes floatUp { to { transform: translateY(-110vh); } }
.grid-overlay { position: absolute; inset: 0; background-image: linear-gradient(rgba(0, 242, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 242, 255, 0.05) 1px, transparent 1px); background-size: 40px 40px; pointer-events: none; z-index: 0; }
.flow-wrapper { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 1; transition: filter 0.5s; }
.blur-bg { filter: blur(10px); pointer-events: none; }
.intro-overlay { position: absolute; inset: 0; display: flex; justify-content: center; align-items: center; z-index: 50; background: rgba(15, 23, 42, 0.9); backdrop-filter: blur(8px); }
.close-intro-btn { position: absolute; top: 30px; right: 30px; background: none; border: 2px solid rgba(255,255,255,0.2); color: white; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; font-size: 1.2rem; display: flex; align-items: center; justify-content: center; transition: 0.3s; }
.close-intro-btn:hover { border-color: #00f2ff; color: #00f2ff; transform: rotate(90deg); }
.intro-content { text-align: center; display: flex; flex-direction: column; align-items: center; }
.neon-title { font-size: 4.5rem; font-weight: 900; color: white; text-transform: uppercase; text-shadow: 0 0 10px rgba(0, 242, 255, 0.8), 0 0 20px rgba(0, 242, 255, 0.4); margin: 0; letter-spacing: 4px; }
.subtitle { color: #94a3b8; font-size: 1.1rem; margin-bottom: 40px; letter-spacing: 1px; }
.input-box-glow { display: flex; position: relative; width: 550px; box-shadow: 0 0 30px rgba(189, 0, 255, 0.2); border-radius: 14px; }
.neon-input { flex: 1; background: rgba(0, 0, 0, 0.6); border: 1px solid #bd00ff; border-right: none; color: white; padding: 18px 25px; border-top-left-radius: 14px; border-bottom-left-radius: 14px; font-size: 1.1rem; outline: none; }
.neon-btn { background: linear-gradient(135deg, #00f2ff, #00a8ff); color: black; border: none; padding: 0 40px; font-weight: 800; font-size: 1rem; cursor: pointer; border-top-right-radius: 14px; border-bottom-right-radius: 14px; transition: 0.3s; }
.tags-suggestion { margin-top: 20px; display: flex; gap: 10px; }
.tags-suggestion span { color: #94a3b8; font-size: 0.9rem; cursor: pointer; transition: 0.2s; border-bottom: 1px dashed transparent; }
.tags-suggestion span:hover { color: #00f2ff; border-bottom-color: #00f2ff; text-shadow: 0 0 8px #00f2ff; }
.loader-overlay { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: center; align-items: center; z-index: 60; background: #0f172a; }
.cyber-spinner { width: 80px; height: 80px; border: 4px solid transparent; border-top: 4px solid #00f2ff; border-right: 4px solid #bd00ff; border-radius: 50%; animation: spin 1s linear infinite; position: relative; box-shadow: 0 0 15px rgba(0, 242, 255, 0.5); }
.loader-text { margin-top: 20px; color: #00f2ff; letter-spacing: 2px; font-size: 0.9rem; animation: pulse 1.5s infinite; }
.scan-line { position: absolute; top: 0; left: 0; width: 100%; height: 2px; background: rgba(255,255,255,0.5); opacity: 0; transition: 0.3s; box-shadow: 0 0 10px white; }
.neon-node:hover .scan-line { opacity: 1; animation: scan 1.5s linear infinite; }
@keyframes scan { 0% { top: 0; } 100% { top: 100%; } }
@keyframes spin { 100% { transform: rotate(360deg); } }
.neon-node { position: relative; background: rgba(15, 23, 42, 0.95); border: 2px solid #00f2ff; border-radius: 12px; padding: 0; width: 240px; box-shadow: 0 0 15px rgba(0, 242, 255, 0.15); transition: all 0.3s ease; display: flex; flex-direction: column; overflow: hidden; }
.neon-node.difficulty-easy { border-color: #10b981 !important; box-shadow: 0 0 20px rgba(16, 185, 129, 0.3) !important; } .neon-node.difficulty-easy .icon-box { color: #10b981; }
.neon-node.difficulty-medium { border-color: #f59e0b !important; box-shadow: 0 0 20px rgba(245, 158, 11, 0.3) !important; } .neon-node.difficulty-medium .icon-box { color: #f59e0b; }
.neon-node.difficulty-hard { border-color: #ef4444 !important; box-shadow: 0 0 20px rgba(239, 68, 68, 0.3) !important; } .neon-node.difficulty-hard .icon-box { color: #ef4444; }
.neon-node.completed { border-color: #10b981 !important; background: rgba(16, 185, 129, 0.1); box-shadow: 0 0 25px rgba(16, 185, 129, 0.5) !important; }
.node-header { padding: 12px; display: flex; justify-content: space-between; align-items: flex-start; background: rgba(255,255,255,0.03); border-bottom: 1px solid rgba(255,255,255,0.05); }
.node-body { padding: 12px; }
.node-title { font-weight: 700; font-size: 0.95rem; line-height: 1.3; }
.icon-box { font-size: 1.4rem; color: #00f2ff; }
.node-meta { font-size: 0.7rem; color: #94a3b8; background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px; }
.slide-down-enter-active, .slide-down-leave-active { transition: transform 0.5s cubic-bezier(0.19, 1, 0.22, 1); }
.slide-down-enter-from, .slide-down-leave-to { transform: translate(-50%, -150%); }
.zoom-fade-enter-active, .zoom-fade-leave-active { transition: all 0.6s cubic-bezier(0.19, 1, 0.22, 1); }
.zoom-fade-enter-from, .zoom-fade-leave-to { opacity: 0; transform: scale(0.9); }
.slide-right-enter-active, .slide-right-leave-active { transition: transform 0.4s cubic-bezier(0.19, 1, 0.22, 1); }
.slide-right-enter-from, .slide-right-leave-to { transform: translateX(100%); }
.custom-scroll::-webkit-scrollbar { width: 4px; }
.custom-scroll::-webkit-scrollbar-thumb { background: #475569; border-radius: 2px; }
</style>