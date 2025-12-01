<template>
  <div class="page-wrapper">
    <div class="blobs-container">
      <div class="blob blob-1"></div><div class="blob blob-2"></div>
    </div>

    <div class="content-container fade-in">

      <!-- HEADER -->
      <header class="page-header">
        <div class="header-left">
          <h1><compass-outlined class="icon-glow" /> Карта развития</h1>
          <p class="subtitle">Проходите этапы последовательно, чтобы подтвердить навыки</p>
        </div>
        <div class="header-actions">
           <div class="level-badge">
              <div class="level-circle">{{ currentLevel }}</div>
              <div class="level-info">
                 <span class="lvl-label">Level</span>
                 <div class="lvl-bar-bg"><div class="lvl-bar-fill" :style="{ width: nextLevelProgress + '%' }"></div></div>
              </div>
              <span class="xp-count">+{{ totalXp }} XP</span>
           </div>
        </div>
      </header>

      <div v-if="loading" class="loading-state">
         <loading-outlined spin style="font-size: 40px; color: #8b5cf6" />
         <p class="mt-2">Строим маршрут...</p>
      </div>

      <!-- ПРИВЕТСТВЕННОЕ ОКНО -->
      <div v-else-if="!roadmapData.list || roadmapData.list.length === 0" class="welcome-card fade-in-up">
        <div class="welcome-content">
            <div class="welcome-icon-wrapper">
                <rocket-filled class="main-icon" />
                <star-filled class="dec-icon star-1" />
                <thunderbolt-filled class="dec-icon bolt-1" />
            </div>

            <h2>Начните свой путь к офферу</h2>
            <p>Введите желаемую должность, и AI составит персональный пошаговый план развития.</p>

            <div class="generator-box">
                <input
                    v-model="customRole"
                    @keyup.enter="generateCustomRoadmap"
                    type="text"
                    placeholder="Например: Python Backend, DevOps, UI/UX..."
                    class="gen-input"
                />
                <button class="btn-gen-icon" @click="generateCustomRoadmap" :disabled="!customRole.trim()">
                    <thunderbolt-filled />
                </button>
            </div>

            <div class="divider-text">или</div>

            <button class="btn-start-journey" @click="$router.push('/vacancies')">
                Выбрать из вакансий <arrow-right-outlined />
            </button>

            <div class="features-grid mt-4">
                <div class="f-item"><check-circle-filled /> <span>Персональный план</span></div>
                <div class="f-item"><check-circle-filled /> <span>Тесты навыков</span></div>
                <div class="f-item"><check-circle-filled /> <span>AI Ментор</span></div>
            </div>
        </div>
      </div>

      <!-- ROADMAP UI -->
      <div v-else class="roadmap-layout">

        <!-- SIDEBAR -->
        <div class="tracks-sidebar glass-panel custom-scroll">
           <h3>Мои треки</h3>
           <div class="track-list">
              <div v-for="track in roadmapData.list" :key="track.id" class="track-item" :class="{ active: currentTrack && track.id === currentTrack.id }" @click="switchTrack(track.id)">
                 <div class="track-icon">
                    <flag-filled v-if="getTrackProgress(track) === 100" style="color: #10b981" />
                    <compass-outlined v-else />
                 </div>
                 <div class="track-info">
                    <div class="track-name" :title="track.role">{{ track.role }}</div>
                    <div class="track-progress-line">
                       <div class="tpl-fill" :style="{ width: getTrackProgress(track) + '%' }"></div>
                    </div>
                 </div>
                 <div class="track-percent">{{ getTrackProgress(track) }}%</div>
              </div>
           </div>
           <div class="add-track-wrapper">
               <button class="btn-add-track" @click="showNewTrackModal = true"><plus-outlined /> Новый трек</button>
           </div>
           <div class="archive-btn-wrapper">
              <button class="btn-archive" @click="archiveCurrentTrack"><check-square-outlined /> В архив</button>
           </div>
        </div>

        <!-- MAIN MAP -->
        <div class="map-area custom-scroll">
           <div v-if="currentTrack" class="timeline-wrapper">

              <div v-for="(node, nodeIdx) in currentTrack.nodes" :key="nodeIdx" class="section-node fade-in-up" :style="{ animationDelay: nodeIdx * 0.1 + 's' }">

                 <div class="section-line"
                      v-if="nodeIdx < currentTrack.nodes.length - 1"
                      :class="{ 'active-flow': isNodeCurrent(nodeIdx) || isNodeCompleted(node) }"
                 ></div>

                 <div class="node-card" :class="{ 'all-done': isNodeCompleted(node), 'node-active-glow': isNodeCurrent(nodeIdx) }">
                    <div class="node-header-row">
                       <div class="nh-icon">
                          <check-circle-filled v-if="isNodeCompleted(node)" style="color: #10b981" />
                          <div v-else-if="isNodeLocked(nodeIdx)" class="lock-dot"><lock-filled /></div>
                          <div v-else class="current-dot-pulse"></div>
                       </div>
                       <div class="nh-content">
                          <div class="nh-title">
                             {{ node.label || node.data?.label }}
                             <span class="difficulty-badge" :class="node.difficulty || node.data?.difficulty">{{ node.difficulty || node.data?.difficulty || 'medium' }}</span>
                          </div>
                          <p class="nh-desc">{{ node.desc || node.data?.desc }}</p>
                          <button class="btn-resources" @click="openResources(node)">
                             <read-outlined /> Материалы
                          </button>
                       </div>
                    </div>

                    <div class="subtopics-list" v-if="node.subtopics && node.subtopics.length">
                       <div class="subtopic-line"></div>
                       <div
                          v-for="(sub, subIdx) in node.subtopics"
                          :key="subIdx"
                          class="step-item"
                          :class="{
                             'step-done': sub.done,
                             'step-locked': isSubtopicLocked(nodeIdx, subIdx)
                          }"
                       >
                          <div class="step-marker-wrapper">
                             <div class="step-marker">
                                <check-outlined v-if="sub.done" />
                                <span v-else-if="isSubtopicLocked(nodeIdx, subIdx)" class="tiny-lock"><lock-outlined /></span>
                                <span v-else class="step-num">{{ subIdx + 1 }}</span>
                             </div>
                          </div>
                          <div class="step-body">
                             <div class="step-info">
                                <div class="step-title">{{ sub.label }}</div>
                                <div class="step-desc">{{ sub.desc }}</div>
                             </div>
                             <div class="step-action">
                                <div v-if="sub.done" class="xp-gained">+{{ sub.xpEarned || 50 }} XP</div>
                                <button
                                   v-else
                                   class="btn-quiz"
                                   :disabled="isSubtopicLocked(nodeIdx, subIdx)"
                                   @click="startQuiz(node, sub, subIdx)"
                                >
                                   <thunderbolt-filled /> Сдать
                                </button>
                             </div>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>

              <div class="finish-line" v-if="isAllDone">
                 <trophy-filled style="font-size: 48px; color: #fbbf24; margin-bottom: 10px;" />
                 <h3>Поздравляем! Вы полностью прошли трек!</h3>
              </div>
           </div>
        </div>
      </div>
    </div>

    <!-- МОДАЛКИ -->
    <a-modal v-model:open="showNewTrackModal" title="Создать новый трек" :footer="null" centered>
        <div class="new-track-modal-content">
            <p>Введите название роли или технологии, которую хотите изучить.</p>
            <div class="generator-box small">
                <input v-model="customRole" @keyup.enter="generateCustomRoadmap" type="text" placeholder="Например: Golang Developer..." class="gen-input" />
                <button class="btn-gen-icon" @click="generateCustomRoadmap" :disabled="!customRole.trim()"><thunderbolt-filled /></button>
            </div>
            <div class="divider-text small">или</div>
            <a-button block @click="$router.push('/vacancies')">Выбрать из вакансий</a-button>
        </div>
    </a-modal>

    <a-drawer v-model:open="drawerVisible" title="Материалы для изучения" placement="right" width="500">
      <div v-if="selectedNode" class="resources-drawer">
         <h3 class="res-head">{{ selectedNode.label || selectedNode.data?.label }}</h3>
         <p class="text-muted mb-4">Изучите эти материалы перед сдачей тестов.</p>
         <div class="resources-list">
            <a v-for="(res, idx) in (selectedNode.resources || selectedNode.data?.resources || [])" :key="idx" :href="res.link" target="_blank" class="resource-link">
              <div class="res-icon"><link-outlined /></div>
              <div class="res-info"><div class="res-title">{{ res.title }}</div><div class="res-type">{{ res.type }}</div></div>
              <arrow-right-outlined />
            </a>
            <div v-if="!(selectedNode.resources?.length || selectedNode.data?.resources?.length)" class="empty-text">
               <read-outlined style="font-size: 24px; margin-bottom: 5px;"/>
               <p>Нет прикрепленных ресурсов</p>
            </div>
         </div>
      </div>
    </a-drawer>

    <a-modal v-model:open="quizVisible" :footer="null" width="600px" centered :maskClosable="false" class="ai-quiz-modal">
       <div class="quiz-container">
          <div class="quiz-header-card">
             <div class="quiz-icon-wrapper"><robot-filled style="font-size: 32px; color: white;" /></div>
             <div class="quiz-header-text"><h3>Проверка навыка</h3><p>{{ currentSubtopic?.label }}</p></div>
          </div>
          <div class="quiz-body-content">
             <div v-if="quizLoading" class="quiz-state-loading"><div class="ai-pulse-ring"><div></div><div></div></div><p>ИИ формулирует задачу...</p></div>
             <div v-else-if="quizStep === 'question'" class="quiz-state-question fade-in">
                <div class="question-bubble"><p>{{ quizData?.question }}</p></div>
                <div class="answer-section"><label>Ваш ответ:</label><a-textarea v-model:value="userAnswer" :rows="5" placeholder="Напишите код или объяснение..." class="quiz-textarea" /></div>
                <div class="quiz-footer-actions"><button class="btn-cancel" @click="quizVisible = false">Отмена</button><button class="btn-submit-ai" :disabled="!userAnswer.trim() || verifying" @click="submitQuiz"><span v-if="!verifying">Отправить на проверку</span><span v-else><loading-outlined /> Проверяю...</span></button></div>
             </div>
             <div v-else-if="quizStep === 'result'" class="quiz-state-result fade-in" :class="quizResult?.passed ? 'is-pass' : 'is-fail'">
                <div class="result-icon"><check-circle-filled v-if="quizResult?.passed" /><close-circle-filled v-else /></div>
                <h2 class="result-title">{{ quizResult?.passed ? 'Задание сдано!' : 'Есть ошибки' }}</h2>
                <div class="ai-feedback-box custom-scroll"><div v-html="renderMarkdown(quizResult?.feedback)"></div></div>
                <button class="btn-continue" @click="closeQuiz">{{ quizResult?.passed ? 'Продолжить обучение' : 'Попробовать снова' }}</button>
             </div>
          </div>
       </div>
    </a-modal>

    <!-- 🔥 МОДАЛКА LEVEL UP -->
    <a-modal v-model:open="showLevelUpModal" :footer="null" centered :closable="false" width="400px" class="levelup-modal">
       <div class="levelup-content">
          <div class="levelup-glow"></div>
          <trophy-filled class="levelup-icon" />
          <h2>LEVEL UP!</h2>
          <div class="new-level">{{ levelUpData.level }}</div>
          <p>Поздравляем! Вы достигли нового уровня.</p>

          <div class="reward-box" v-if="levelUpData.reward">
             <span>Открыта награда:</span>
             <strong>{{ levelUpData.reward }}</strong>
          </div>

          <button class="btn-claim" @click="closeLevelUp">Забрать</button>
       </div>
    </a-modal>

  </div>
</template>

<script>
import api from '../axios';
import { message } from 'ant-design-vue';
import { marked } from 'marked';
import confetti from 'canvas-confetti'; // Импорт конфетти
import {
  CompassOutlined, StarFilled, LoadingOutlined, RocketOutlined,
  FlagOutlined, CheckSquareOutlined, CheckCircleFilled, LockOutlined,
  ClockCircleOutlined, StarOutlined, RightOutlined, RocketFilled,
  ReadOutlined, LinkOutlined, ThunderboltOutlined, CheckOutlined, ArrowRightOutlined,
  FlagFilled, LockFilled, TrophyFilled, RobotFilled, CloseCircleFilled,
  ThunderboltFilled, PlusOutlined
} from '@ant-design/icons-vue';

export default {
  components: {
    CompassOutlined, StarFilled, LoadingOutlined, RocketOutlined,
    FlagOutlined, CheckSquareOutlined, CheckCircleFilled, LockOutlined,
    ClockCircleOutlined, StarOutlined, RightOutlined, RocketFilled,
    ReadOutlined, LinkOutlined, ThunderboltOutlined, CheckOutlined, ArrowRightOutlined,
    FlagFilled, LockFilled, TrophyFilled, RobotFilled, CloseCircleFilled,
    ThunderboltFilled, PlusOutlined
  },
  data() {
    return {
      loading: true,
      roadmapData: { activeId: null, list: [] },
      currentTrack: null,
      customRole: '',
      showNewTrackModal: false,
      drawerVisible: false,
      selectedNode: null,
      quizVisible: false,
      quizLoading: false,
      verifying: false,
      quizStep: 'question',
      currentNode: null,
      currentSubtopic: null,
      currentSubIdx: -1,
      quizData: null,
      userAnswer: '',
      quizResult: null,

      // Level Up
      showLevelUpModal: false,
      levelUpData: { level: 1, reward: '' }
    };
  },
  computed: {
    totalXp() {
       if (!this.roadmapData || !this.roadmapData.list) return 0;
       let total = 0;
       this.roadmapData.list.forEach(track => {
           if (track.nodes) {
               track.nodes.forEach(node => {
                   if (node.subtopics) {
                       node.subtopics.forEach(sub => { if(sub.done) total += (sub.xpEarned || 50); });
                   }
               });
           }
       });
       return total;
    },
    currentLevel() { return Math.floor(this.totalXp / 500) + 1; },
    nextLevelProgress() { return ((this.totalXp % 500) / 500) * 100; },
    isAllDone() {
       if(!this.currentTrack) return false;
       return this.currentTrack.nodes.every(n => this.isNodeCompleted(n));
    }
  },
  async mounted() {
    await this.loadRoadmap();
  },
  methods: {
    async loadRoadmap() {
      try {
        const r = await api.get('/chat/roadmap');
        this.roadmapData = r.data || { list: [] };
        if (this.roadmapData.list.length > 0) {
            const active = this.roadmapData.list.find(t => t.id === this.roadmapData.activeId);
            this.currentTrack = active || this.roadmapData.list[this.roadmapData.list.length - 1];
            if (!active && this.currentTrack) this.roadmapData.activeId = this.currentTrack.id;
        } else {
            this.currentTrack = null;
        }
      } catch (e) { console.error(e); } finally { this.loading = false; }
    },

    // 🔥 ВЫЗОВ КОНФЕТТИ И ЗВУКА
    triggerConfetti() {
        // Звук
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3');
        audio.volume = 0.4;
        audio.play().catch(e => console.log('Audio play failed', e));

        // Конфетти
        var count = 200;
        var defaults = { origin: { y: 0.7 } };

        function fire(particleRatio, opts) {
          confetti(Object.assign({}, defaults, opts, {
            particleCount: Math.floor(count * particleRatio)
          }));
        }

        fire(0.25, { spread: 26, startVelocity: 55 });
        fire(0.2, { spread: 60 });
        fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
        fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
        fire(0.1, { spread: 120, startVelocity: 45 });
    },

    closeLevelUp() {
        this.showLevelUpModal = false;
    },

    async saveProgress() {
        try {
           const r = await api.post('/chat/roadmap/save', {
               roadmapId: this.currentTrack.id,
               role: this.currentTrack.role,
               nodes: this.currentTrack.nodes,
               activeId: this.currentTrack.id
           });

           // Проверка на новый уровень
           if (r.data.rewardGranted) {
               this.levelUpData = {
                   level: r.data.newLevel,
                   reward: r.data.rewardGranted
               };
               this.showLevelUpModal = true;
               this.triggerConfetti();
           }
        } catch(e) {}
    },

    // Остальные методы без изменений
    async generateCustomRoadmap() {
        if (!this.customRole.trim()) return;
        this.loading = true;
        this.showNewTrackModal = false;
        try {
            await api.post('/chat/roadmap', { role: this.customRole });
            this.customRole = '';
            await this.loadRoadmap();
            message.success('Новый трек создан!');
        } catch (e) { message.error('Ошибка генерации'); } finally { this.loading = false; }
    },
    async switchTrack(id) {
        const track = this.roadmapData.list.find(t => t.id === id);
        if (track) {
            this.currentTrack = track;
            this.roadmapData.activeId = id;
            try { await api.post('/chat/roadmap/save', { activeId: id }); } catch(e) {}
        }
    },
    async archiveCurrentTrack() {
        if (!this.currentTrack) return;
        try {
            await api.post('/chat/roadmap/archive', { roadmapId: this.currentTrack.id });
            message.success('В архиве');
            await this.loadRoadmap();
        } catch(e) { message.error('Ошибка'); }
    },
    getTrackProgress(track) {
        if (!track.nodes) return 0;
        let total = 0, done = 0;
        track.nodes.forEach(n => {
            if(n.subtopics) { total += n.subtopics.length; done += n.subtopics.filter(s => s.done).length; }
        });
        if (total === 0) return 0;
        return Math.round((done / total) * 100);
    },
    isNodeCompleted(node) { if (node.subtopics && node.subtopics.length > 0) return node.subtopics.every(s => s.done); return node.data?.done; },
    isNodeLocked(nodeIdx) { if (nodeIdx === 0) return false; const prevNode = this.currentTrack.nodes[nodeIdx - 1]; return !this.isNodeCompleted(prevNode); },
    isNodeCurrent(nodeIdx) { return !this.isNodeLocked(nodeIdx) && !this.isNodeCompleted(this.currentTrack.nodes[nodeIdx]); },
    isSubtopicLocked(nodeIdx, subIdx) { if (this.isNodeLocked(nodeIdx)) return true; if (subIdx === 0) return false; const prevSub = this.currentTrack.nodes[nodeIdx].subtopics[subIdx - 1]; return !prevSub.done; },
    openResources(node) { this.selectedNode = node; this.drawerVisible = true; },
    async startQuiz(node, subtopic, idx) { this.currentNode = node; this.currentSubtopic = subtopic; this.currentSubIdx = idx; this.quizVisible = true; this.quizStep = 'question'; this.quizLoading = true; this.userAnswer = ''; try { const r = await api.post('/chat/roadmap/quiz', { topic: subtopic.label, description: `В контексте темы: ${node.label}` }); this.quizData = r.data; } catch(e) { message.error('Ошибка AI'); this.quizVisible = false; } finally { this.quizLoading = false; } },
    async submitQuiz() { this.verifying = true; try { const r = await api.post('/chat/roadmap/check', { topic: this.currentSubtopic.label, question: this.quizData.question, answer: this.userAnswer }); this.quizResult = r.data; this.quizStep = 'result'; if (this.quizResult.passed) { this.currentSubtopic.done = true; await this.saveProgress(); } } catch(e) { message.error('Ошибка'); } finally { this.verifying = false; } },
    closeQuiz() { this.quizVisible = false; },
    renderMarkdown(text) { return marked.parse(text || ''); }
  }
};
</script>

<style scoped>
/* WELCOME GEN */
.welcome-card { width: 100%; max-width: 600px; margin: 40px auto; background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(20px); border-radius: 30px; border: 1px solid white; padding: 50px; text-align: center; box-shadow: 0 20px 50px rgba(139, 92, 246, 0.15); position: relative; overflow: hidden; }
.welcome-icon-wrapper { position: relative; width: 100px; height: 100px; background: linear-gradient(135deg, #8b5cf6, #ec4899); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 25px; color: white; font-size: 3rem; box-shadow: 0 10px 25px rgba(139, 92, 246, 0.4); }
.dec-icon { position: absolute; font-size: 1.5rem; color: #fbbf24; animation: float 3s infinite ease-in-out; }
.star-1 { top: -10px; right: -10px; animation-delay: 0.5s; }
.bolt-1 { bottom: 0px; left: -20px; color: #3b82f6; animation-delay: 1s; }
.welcome-content h2 { font-size: 2rem; font-weight: 800; color: #1f2937; margin-bottom: 10px; }
.welcome-content p { font-size: 1.1rem; color: #6b7280; line-height: 1.6; margin-bottom: 30px; }
.generator-box { display: flex; gap: 10px; background: white; padding: 6px; border-radius: 16px; border: 1px solid #e5e7eb; box-shadow: 0 4px 15px rgba(0,0,0,0.03); transition: 0.3s; }
.generator-box:focus-within { border-color: #8b5cf6; box-shadow: 0 4px 20px rgba(139, 92, 246, 0.15); }
.gen-input { flex: 1; border: none; outline: none; padding: 12px 15px; font-size: 1rem; color: #374151; border-radius: 12px; }
.btn-gen-icon { width: 48px; height: 48px; border-radius: 12px; background: linear-gradient(135deg, #8b5cf6, #6366f1); color: white; border: none; font-size: 1.2rem; cursor: pointer; transition: 0.2s; display: flex; align-items: center; justify-content: center; }
.btn-gen-icon:hover { transform: scale(1.05); }
.btn-gen-icon:disabled { opacity: 0.5; cursor: not-allowed; }
.divider-text { margin: 20px 0; color: #9ca3af; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1px; }
.btn-start-journey { background: #f3f4f6; color: #4b5563; border: none; padding: 14px 30px; font-size: 1rem; font-weight: 600; border-radius: 16px; cursor: pointer; transition: 0.3s; display: inline-flex; align-items: center; gap: 10px; width: 100%; justify-content: center; }
.btn-start-journey:hover { background: #e5e7eb; color: #1f2937; }
.features-grid { display: flex; justify-content: center; gap: 20px; margin-top: 35px; }
.f-item { display: flex; align-items: center; gap: 8px; font-weight: 600; color: #4b5563; background: white; padding: 8px 16px; border-radius: 20px; border: 1px solid #e5e7eb; font-size: 0.9rem; }
.f-item .anticon { color: #10b981; }

/* LEVEL UP MODAL STYLES */
.levelup-modal .ant-modal-content { background: transparent !important; box-shadow: none !important; border: none; }
.levelup-content { background: linear-gradient(135deg, #1f2937, #111827); color: white; text-align: center; padding: 40px 20px; border-radius: 24px; position: relative; overflow: hidden; border: 2px solid #fbbf24; box-shadow: 0 0 50px rgba(251, 191, 36, 0.3); }
.levelup-glow { position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: radial-gradient(circle, rgba(251,191,36,0.2) 0%, transparent 70%); animation: rotate 10s linear infinite; pointer-events: none; }
.levelup-icon { font-size: 4rem; color: #fbbf24; margin-bottom: 10px; filter: drop-shadow(0 0 10px rgba(251,191,36,0.5)); }
.new-level { font-size: 5rem; font-weight: 900; line-height: 1; color: transparent; -webkit-text-stroke: 2px #fff; margin-bottom: 10px; }
.reward-box { background: rgba(255,255,255,0.1); margin: 20px auto; padding: 15px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.2); }
.reward-box strong { display: block; font-size: 1.2rem; color: #fbbf24; margin-top: 5px; }
.btn-claim { position: relative; z-index: 100; background: #fbbf24; color: #000; border: none; padding: 12px 40px; border-radius: 30px; font-weight: 800; font-size: 1.1rem; cursor: pointer; transition: 0.2s; margin-top: 10px; box-shadow: 0 5px 15px rgba(251, 191, 36, 0.4); }
.btn-claim:hover { transform: scale(1.05); background: #f59e0b; }

/* General Styles */
.page-wrapper { min-height: 100vh; padding: 20px; background: #f3f4f6; position: relative; font-family: 'Inter', sans-serif; display: flex; justify-content: center; }
.blobs-container { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 0; pointer-events: none; }
.blob { position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.5; }
.blob-1 { width: 400px; height: 400px; background: #a855f7; top: -100px; left: -100px; }
.blob-2 { width: 350px; height: 350px; background: #3b82f6; bottom: -50px; right: -50px; }
.content-container { position: relative; z-index: 1; width: 100%; max-width: 1200px; display: flex; flex-direction: column; height: 90vh; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; background: white; padding: 15px 25px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.03); }
.header-left h1 { font-size: 1.8rem; font-weight: 800; color: #1f2937; margin: 0; display: flex; align-items: center; gap: 10px; }
.icon-glow { color: #8b5cf6; filter: drop-shadow(0 0 8px rgba(139, 92, 246, 0.3)); }
.subtitle { color: #6b7280; margin-top: 5px; font-size: 0.9rem; }
.level-badge { display: flex; align-items: center; gap: 12px; background: #f9fafb; padding: 5px 15px 5px 5px; border-radius: 30px; border: 1px solid #e5e7eb; }
.level-circle { width: 36px; height: 36px; background: linear-gradient(135deg, #f59e0b, #d97706); color: white; font-weight: 800; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; border: 2px solid #fcd34d; }
.level-info { display: flex; flex-direction: column; width: 100px; }
.lvl-label { font-size: 0.6rem; text-transform: uppercase; font-weight: 700; color: #9ca3af; }
.lvl-bar-bg { height: 6px; background: #e5e7eb; border-radius: 3px; overflow: hidden; margin-top: 2px; }
.lvl-bar-fill { height: 100%; background: #10b981; border-radius: 3px; transition: width 0.5s ease; }
.xp-count { font-weight: 700; color: #f59e0b; font-size: 0.9rem; }
.roadmap-layout { display: grid; grid-template-columns: 300px 1fr; gap: 25px; height: 100%; overflow: hidden; }
.glass-panel { background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(20px); border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.6); padding: 20px; display: flex; flex-direction: column; }
.tracks-sidebar h3 { margin: 0 0 15px 0; font-size: 1rem; font-weight: 700; color: #4b5563; text-transform: uppercase; letter-spacing: 0.5px; }
.track-list { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; }
.track-item { display: flex; align-items: center; gap: 10px; padding: 12px; background: white; border-radius: 12px; cursor: pointer; transition: 0.2s; border: 1px solid transparent; }
.track-item:hover { background: #f9fafb; }
.track-item.active { border-color: #8b5cf6; background: #f3e8ff; box-shadow: 0 4px 12px rgba(139, 92, 246, 0.1); }
.track-icon { width: 32px; height: 32px; background: #e0e7ff; color: #4f46e5; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
.track-info { flex: 1; overflow: hidden; }
.track-name { font-weight: 600; font-size: 0.9rem; color: #1f2937; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.track-progress-line { height: 4px; background: #e5e7eb; border-radius: 2px; margin-top: 6px; overflow: hidden; }
.tpl-fill { height: 100%; background: #10b981; transition: width 0.3s; }
.track-percent { font-size: 0.75rem; font-weight: 700; color: #10b981; }
.add-track-wrapper { margin-top: 10px; padding-top: 10px; border-top: 1px dashed #e5e7eb; }
.btn-add-track { width: 100%; padding: 10px; background: #eff6ff; border: 1px dashed #3b82f6; border-radius: 10px; color: #3b82f6; font-weight: 600; cursor: pointer; transition: 0.2s; display: flex; align-items: center; justify-content: center; gap: 6px; }
.btn-add-track:hover { background: #3b82f6; color: white; border-style: solid; }
.archive-btn-wrapper { margin-top: 15px; padding-top: 15px; border-top: 1px solid #e5e7eb; }
.btn-archive { width: 100%; padding: 10px; background: #f1f5f9; border: none; border-radius: 10px; color: #64748b; font-weight: 600; cursor: pointer; transition: 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px; }
.btn-archive:hover { background: #e2e8f0; color: #475569; }
.map-area { padding: 20px 40px; overflow-y: auto; display: flex; justify-content: center; }
.timeline-wrapper { width: 100%; max-width: 750px; position: relative; padding-bottom: 80px; }
.section-node { position: relative; padding-bottom: 40px; animation: fadeInUp 0.5s ease forwards; opacity: 0; transform: translateY(20px); }
.section-line { position: absolute; top: 50px; left: 30px; width: 4px; height: 100%; background: #e5e7eb; z-index: 0; border-radius: 2px; }
.section-line.active-flow { background: linear-gradient(180deg, #e5e7eb 0%, #8b5cf6 50%, #e5e7eb 100%); background-size: 100% 200%; animation: flow-line 2s linear infinite; }
@keyframes flow-line { 0% { background-position: 0% 0%; } 100% { background-position: 0% 200%; } }
.node-card { position: relative; z-index: 1; background: white; border-radius: 20px; padding: 25px; border: 1px solid #e5e7eb; transition: 0.3s; box-shadow: 0 4px 15px rgba(0,0,0,0.03); }
.node-card.all-done { border-color: #86efac; background: #f0fdf4; }
.node-active-glow { border-color: #8b5cf6; box-shadow: 0 0 20px rgba(139, 92, 246, 0.2); animation: card-pulse 3s infinite ease-in-out; }
@keyframes card-pulse { 0% { box-shadow: 0 0 10px rgba(139, 92, 246, 0.1); } 50% { box-shadow: 0 0 25px rgba(139, 92, 246, 0.4); } 100% { box-shadow: 0 0 10px rgba(139, 92, 246, 0.1); } }
.node-header-row { display: flex; gap: 20px; align-items: flex-start; margin-bottom: 20px; }
.nh-icon { width: 60px; height: 60px; border-radius: 50%; background: #f3f4f6; display: flex; align-items: center; justify-content: center; font-size: 1.8rem; color: #9ca3af; flex-shrink: 0; border: 4px solid white; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
.all-done .nh-icon { background: #10b981; color: white; border-color: #d1fae5; }
.current-dot-pulse { width: 20px; height: 20px; background: #8b5cf6; border-radius: 50%; animation: pulse-p 1.5s infinite; }
@keyframes pulse-p { 0% { box-shadow: 0 0 0 0 rgba(139,92,246,0.7); } 70% { box-shadow: 0 0 0 10px rgba(139,92,246,0); } 100% { box-shadow: 0 0 0 0 rgba(139,92,246,0); } }
.lock-dot { color: #cbd5e1; }
.nh-content { flex: 1; }
.nh-title { font-weight: 800; font-size: 1.3rem; color: #1f2937; margin-bottom: 5px; display: flex; align-items: center; gap: 10px; }
.difficulty-badge { font-size: 0.7rem; padding: 3px 10px; border-radius: 12px; text-transform: uppercase; font-weight: 700; background: #f3f4f6; color: #6b7280; }
.nh-desc { font-size: 0.95rem; color: #6b7280; line-height: 1.5; margin-bottom: 10px; }
.btn-resources { border: 1px solid #e5e7eb; background: white; padding: 6px 14px; border-radius: 8px; cursor: pointer; font-size: 0.85rem; color: #6366f1; font-weight: 600; display: flex; align-items: center; gap: 6px; transition: 0.2s; }
.btn-resources:hover { background: #e0e7ff; border-color: #c7d2fe; }
.subtopics-list { position: relative; padding-left: 0; margin-top: 15px; }
.subtopic-line { position: absolute; left: 16px; top: 10px; bottom: 30px; width: 2px; background: #e5e7eb; z-index: 0; }
.step-item { display: flex; gap: 15px; margin-bottom: 12px; position: relative; z-index: 1; }
.step-marker-wrapper { width: 32px; flex-shrink: 0; display: flex; justify-content: center; }
.step-marker { width: 32px; height: 32px; border-radius: 50%; background: #f3f4f6; border: 2px solid white; display: flex; align-items: center; justify-content: center; font-weight: 700; color: #9ca3af; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
.step-done .step-marker { background: #10b981; color: white; border-color: #10b981; }
.step-locked .step-marker { background: #e5e7eb; color: #d1d5db; }
.step-body { flex: 1; background: #f9fafb; border: 1px solid #f3f4f6; border-radius: 12px; padding: 12px 15px; display: flex; align-items: center; justify-content: space-between; transition: 0.2s; }
.step-done .step-body { background: white; border-color: #bbf7d0; }
.step-locked .step-body { opacity: 0.6; }
.step-info { flex: 1; padding-right: 15px; }
.step-title { font-weight: 700; color: #374151; font-size: 0.95rem; }
.step-desc { font-size: 0.8rem; color: #9ca3af; margin-top: 2px; }
.step-action { flex-shrink: 0; }
.btn-quiz { background: #8b5cf6; color: white; border: none; padding: 6px 14px; border-radius: 8px; font-weight: 700; font-size: 0.8rem; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: 0.2s; }
.btn-quiz:hover { background: #7c3aed; transform: translateY(-2px); }
.btn-quiz:disabled { background: #d8b4fe; cursor: not-allowed; transform: none; }
.xp-gained { color: #10b981; font-weight: 800; font-size: 0.9rem; }
.finish-line { text-align: center; padding: 50px; animation: fadeIn 1s ease; }
.ai-quiz-modal .ant-modal-content { border-radius: 24px; overflow: hidden; padding: 0; background: transparent; }
.quiz-container { background: white; min-height: 400px; display: flex; flex-direction: column; overflow: hidden; border-radius: 24px; }
.quiz-header-card { background: linear-gradient(135deg, #6366f1, #a855f7); padding: 25px; color: white; display: flex; align-items: center; gap: 20px; }
.quiz-icon-wrapper { width: 60px; height: 60px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(5px); }
.quiz-header-text h3 { margin: 0; font-size: 1.5rem; font-weight: 800; color: white; }
.quiz-header-text p { margin: 0; opacity: 0.9; font-size: 0.95rem; }
.quiz-body-content { padding: 30px; flex: 1; display: flex; flex-direction: column; justify-content: center; }
.quiz-state-loading { text-align: center; }
.ai-pulse-ring { position: relative; width: 80px; height: 80px; margin: 0 auto 20px; }
.ai-pulse-ring div { position: absolute; width: 64px; height: 64px; border: 4px solid #8b5cf6; border-radius: 50%; animation: ripple 1.2s cubic-bezier(0, 0.2, 0.8, 1) infinite; }
.ai-pulse-ring div:nth-child(2) { animation-delay: -0.5s; }
@keyframes ripple { 0% { top: 36px; left: 36px; width: 0; height: 0; opacity: 0; } 4.9% { top: 36px; left: 36px; width: 0; height: 0; opacity: 0; } 5% { top: 36px; left: 36px; width: 0; height: 0; opacity: 1; } 100% { top: 0px; left: 0px; width: 72px; height: 72px; opacity: 0; } }
.question-bubble { background: #eff6ff; padding: 20px; border-radius: 16px; border: 1px solid #dbeafe; font-size: 1.1rem; line-height: 1.6; color: #1e3a8a; margin-bottom: 20px; font-weight: 500; }
.answer-section label { display: block; margin-bottom: 8px; font-weight: 600; color: #4b5563; }
.quiz-textarea { border-radius: 12px; font-size: 1rem; border: 1px solid #d1d5db; padding: 12px; }
.quiz-textarea:focus { border-color: #8b5cf6; box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.1); }
.quiz-footer-actions { display: flex; justify-content: flex-end; gap: 15px; margin-top: 25px; }
.btn-cancel { background: transparent; border: none; color: #6b7280; font-weight: 600; cursor: pointer; transition: 0.2s; }
.btn-cancel:hover { color: #1f2937; }
.btn-submit-ai { background: #8b5cf6; color: white; padding: 12px 24px; border-radius: 12px; border: none; font-weight: 700; cursor: pointer; transition: 0.2s; box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3); }
.btn-submit-ai:hover:not(:disabled) { transform: translateY(-2px); background: #7c3aed; }
.btn-submit-ai:disabled { opacity: 0.6; cursor: not-allowed; }
.quiz-state-result { text-align: center; }
.result-icon { font-size: 4rem; margin-bottom: 15px; }
.is-pass .result-icon { color: #10b981; }
.is-fail .result-icon { color: #ef4444; }
.result-title { font-weight: 800; font-size: 1.8rem; color: #1f2937; margin-bottom: 20px; }
.ai-feedback-box { background: #f9fafb; padding: 20px; border-radius: 12px; text-align: left; max-height: 200px; overflow-y: auto; border: 1px solid #e5e7eb; color: #4b5563; line-height: 1.6; margin-bottom: 25px; }
.btn-continue { width: 100%; padding: 14px; background: #1f2937; color: white; border-radius: 12px; font-weight: 700; border: none; cursor: pointer; transition: 0.2s; }
.btn-continue:hover { background: #000; transform: translateY(-2px); }
.fade-in { animation: fadeIn 0.5s ease-out; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
.custom-scroll::-webkit-scrollbar { width: 6px; }
.custom-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
</style>