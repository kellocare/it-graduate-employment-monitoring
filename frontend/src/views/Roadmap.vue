<template>
  <div class="neon-page">
    <div class="stars-bg"></div>

    <!-- Прогресс бар -->
    <div class="neon-progress-container" v-if="elements.length > 1">
      <div class="progress-label">
        <div class="p-left">
           <rocket-filled />
           <!-- Отображаем название роли в шапке -->
           <span class="role-badge" v-if="targetRole">{{ targetRole }}</span>
           <span style="margin-left: 10px">{{ progress }}%</span>
           <span v-if="saving" class="saving-indicator fade-in">Сохранение...</span>
        </div>

        <a-popconfirm
          title="Завершить этот трек и сохранить в архив? Вы сможете начать новый."
          ok-text="Да, в архив"
          cancel-text="Отмена"
          @confirm="archiveAndReset"
        >
           <button class="btn-archive"><save-filled /> Завершить</button>
        </a-popconfirm>
      </div>
      <div class="progress-track">
        <div class="progress-glow" :style="{ width: progress + '%' }"></div>
      </div>
    </div>

    <!-- Ввод (показываем, если нет элементов) -->
    <transition name="fade-up">
      <div v-if="!loading && elements.length <= 1" class="intro-overlay">
        <h1 class="neon-title">Cyber Roadmap</h1>
        <div class="input-wrapper">
           <input v-model="targetRole" @keydown.enter="generateRoadmap" placeholder="Введите профессию (напр. Python Senior)" class="neon-input" />
           <button @click="generateRoadmap" :disabled="loading" class="neon-btn">
             <thunderbolt-filled v-if="!loading" spin /> {{ loading ? 'Генерация...' : 'START' }}
           </button>
        </div>
      </div>
    </transition>

    <!-- ГРАФ -->
    <div class="flow-wrapper" :class="{ 'blur-bg': loading }">
       <VueFlow v-model="elements" :default-zoom="0.8" :min-zoom="0.2" :max-zoom="2" @node-click="onNodeClick">
          <Background pattern-color="#333" gap="40" />
          <Controls class="neon-controls" />
          <template #node-custom="{ data }">
            <div class="neon-node" :class="{ 'completed': data.done, 'sub-node': data.isSub }">
               <div class="glow-ring"></div>
               <div class="node-content">
                 <div class="icon-box"><check-circle-filled v-if="data.done" /><component :is="data.isSub ? 'ApiOutlined' : 'StarFilled'" v-else /></div>
                 <div class="text-box"><div class="node-title">{{ data.label }}</div></div>
               </div>
            </div>
          </template>
       </VueFlow>
    </div>

    <!-- Drawer -->
    <transition name="slide-right">
       <div v-if="selectedNode" class="side-drawer">
          <button class="close-btn" @click="closeDrawer"><close-outlined /></button>
          <div class="drawer-header">
             <h3>{{ selectedNode.label }}</h3>
             <div class="status-badge" :class="selectedNode.done ? 'done' : 'pending'">{{ selectedNode.done ? 'Изучено' : 'В процессе' }}</div>
          </div>
          <p class="drawer-desc">{{ selectedNode.desc || '...' }}</p>
          <div class="action-area">
             <label class="neon-checkbox"><input type="checkbox" v-model="selectedNode.done" /><span class="checkmark"></span> Изучено</label>
          </div>
       </div>
    </transition>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue';
import { VueFlow, useVueFlow } from '@vue-flow/core';
import { Background } from '@vue-flow/background';
import { Controls } from '@vue-flow/controls';
import api from '../axios';
import { message } from 'ant-design-vue';
import { ThunderboltFilled, RocketFilled, StarFilled, CheckCircleFilled, CloseOutlined, ApiOutlined, SaveFilled } from '@ant-design/icons-vue';

import '@vue-flow/core/dist/style.css';
import '@vue-flow/core/dist/theme-default.css';
import '@vue-flow/controls/dist/style.css';

export default {
  components: { VueFlow, Background, Controls, ThunderboltFilled, RocketFilled, StarFilled, CheckCircleFilled, CloseOutlined, ApiOutlined, SaveFilled },
  setup() {
    const { setCenter, fitView } = useVueFlow();
    const targetRole = ref('');
    const loading = ref(true);
    const saving = ref(false);
    const selectedNode = ref(null);
    const elements = ref([]);

    // 1. Загрузка с сервера
    onMounted(async () => {
       try {
         const r = await api.get('/chat/roadmap');
         // Если пришел новый формат { role, nodes }
         if (r.data && r.data.nodes) {
             elements.value = r.data.nodes;
             targetRole.value = r.data.role || ''; // ВОССТАНАВЛИВАЕМ НАЗВАНИЕ!
             setTimeout(() => fitView({ padding: 0.2 }), 500);
         }
         // Если пришел старый формат (просто массив)
         else if (Array.isArray(r.data) && r.data.length > 0) {
             elements.value = r.data;
             setTimeout(() => fitView({ padding: 0.2 }), 500);
         }
       } catch (e) { console.error(e); } finally { loading.value = false; }
    });

    // 2. Автосохранение
    let saveTimeout = null;
    watch(elements, (newVal) => {
        if (loading.value || newVal.length <= 1) return;

        clearTimeout(saveTimeout);
        saving.value = true;

        saveTimeout = setTimeout(async () => {
            try {
                // Отправляем и узлы, и название роли
                await api.post('/chat/roadmap/save', {
                    roadmapData: newVal,
                    role: targetRole.value // ВАЖНО: отправляем роль
                });
            } catch(e) { console.error(e); } finally { saving.value = false; }
        }, 1000);
    }, { deep: true });

    const progress = computed(() => {
       const nodes = elements.value.filter(el => el.type === 'custom');
       if (!nodes.length) return 0;
       const doneCount = nodes.reduce((acc, n) => acc + (n.data.done ? 1 : 0), 0);
       return Math.round((doneCount / nodes.length) * 100);
    });

    const archiveAndReset = async () => {
        if (elements.value.length <= 1) return;
        try {
            await api.post('/chat/roadmap/archive', {
                // Роль теперь точно известна, т.к. восстановлена в onMounted
                roleTitle: targetRole.value || "My Roadmap",
                finalProgress: progress.value
            });
            message.success('Сохранено в историю');
            elements.value = [];
            targetRole.value = '';
        } catch (e) { message.error('Ошибка'); }
    };

    const generateRoadmap = async () => {
      if(!targetRole.value.trim()) return message.warning('Введите роль!');
      loading.value = true;
      elements.value = [];

      try {
        const res = await api.post('/chat/roadmap', { role: targetRole.value });
        const steps = res.data;
        const newElements = [];
        let xBase = 0;

        steps.forEach((step, idx) => {
            const mainId = `main-${idx}`;
          newElements.push({
            id: mainId,
            type: 'custom',
            position: {x: xBase, y: 0},
            data: {label: step.label, desc: step.desc, done: false, isSub: false}
          });
          if (idx > 0) {
            newElements.push({
              id: `e-main-${idx - 1}-${idx}`,
              source: `main-${idx - 1}`,
              target: mainId,
              animated: true,
              style: {stroke: '#00f2ff', strokeWidth: 3, strokeDasharray: 5}
            });
          }
          if (step.subtopics) {
            step.subtopics.forEach((sub, subIdx) => {
              const subId = `sub-${idx}-${subIdx}`;
              const isTop = subIdx % 2 === 0;
              const level = Math.floor(subIdx / 2) + 1;
              const yOffset = isTop ? -(level * 350) : (level * 350);
              const xOffset = (subIdx % 2 === 0 ? -80 : 80) + (level * 40);
              newElements.push({
                id: subId,
                type: 'custom',
                position: {x: xBase + xOffset, y: yOffset},
                data: {label: sub, desc: `Подтема`, done: false, isSub: true}
              });
              newElements.push({
                id: `e-${mainId}-${subId}`,
                source: mainId,
                target: subId,
                style: {stroke: '#bd00ff', strokeWidth: 1}
              });
            });
          }
          xBase += 900;
        });

        elements.value = newElements;
        setTimeout(() => fitView({padding: 0.2}), 200);

        // СРАЗУ СОХРАНЯЕМ с названием роли!
        await api.post('/chat/roadmap/save', {
          roadmapData: newElements,
          role: targetRole.value
        });

      } catch (e) {
        message.error("Ошибка ИИ");
      } finally {
        loading.value = false;
      }
    };

    const onNodeClick = (event) => {
      selectedNode.value = event.node.data;
      setCenter(event.node.position.x, event.node.position.y, {zoom: 1.2, duration: 800});
    };
    const closeDrawer = () => {
      selectedNode.value = null;
      fitView({padding: 0.2, duration: 800});
    };

    return {
      targetRole,
      loading,
      elements,
      generateRoadmap,
      onNodeClick,
      selectedNode,
      closeDrawer,
      progress,
      saving,
      archiveAndReset
    };
  }
}
</script>

<style scoped>
/* Добавлен стиль для бейджа роли */
.role-badge {
  background: rgba(0, 242, 255, 0.1);
  color: #00f2ff;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 0.8rem;
  border: 1px solid rgba(0, 242, 255, 0.3);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.btn-archive {
  background: transparent;
  border: 1px solid #f59e0b;
  color: #f59e0b;
  padding: 4px 12px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: 0.3s;
}

.btn-archive:hover {
  background: #f59e0b;
  color: black;
}

.p-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* Остальные стили без изменений */
.neon-page {
  position: relative;
  width: 100%;
  height: 100vh;
  background: #0f172a;
  color: white;
  overflow: hidden;
  font-family: 'Segoe UI', sans-serif;
}

.stars-bg {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(white 1px, transparent 1px);
  background-size: 50px 50px;
  opacity: 0.1;
  pointer-events: none;
}

.neon-progress-container {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  width: 450px;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(10px);
  padding: 10px 20px;
  border-radius: 20px;
  border: 1px solid rgba(0, 242, 255, 0.3);
}

.progress-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 700;
  color: #00f2ff;
  margin-bottom: 5px;
  font-size: 0.9rem;
}

.saving-indicator {
  font-size: 0.75rem;
  color: #10b981;
}

.progress-track {
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
}

.progress-glow {
  height: 100%;
  background: linear-gradient(90deg, #00f2ff, #bd00ff);
  box-shadow: 0 0 10px #00f2ff;
  transition: width 0.5s ease;
}

.intro-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 50;
  background: rgba(15, 23, 42, 0.9);
  backdrop-filter: blur(5px);
}

.neon-title {
  font-size: 4rem;
  font-weight: 900;
  color: transparent;
  -webkit-text-stroke: 2px #00f2ff;
  text-shadow: 0 0 20px rgba(0, 242, 255, 0.5);
  margin-bottom: 40px;
  letter-spacing: 5px;
}

.input-wrapper {
  display: flex;
  gap: 15px;
  width: 500px;
}

.neon-input {
  flex: 1;
  background: rgba(0, 0, 0, 0.5);
  border: 2px solid #bd00ff;
  color: white;
  padding: 15px 20px;
  border-radius: 12px;
  font-size: 1.2rem;
  outline: none;
  box-shadow: 0 0 15px rgba(189, 0, 255, 0.2);
  transition: 0.3s;
}

.neon-input:focus {
  box-shadow: 0 0 30px rgba(189, 0, 255, 0.5);
  border-color: #00f2ff;
}

.neon-btn {
  background: #00f2ff;
  color: black;
  border: none;
  padding: 0 30px;
  font-weight: 800;
  border-radius: 12px;
  cursor: pointer;
  box-shadow: 0 0 20px rgba(0, 242, 255, 0.5);
  transition: 0.2s;
}

.neon-btn:hover {
  transform: scale(1.05);
  background: white;
  box-shadow: 0 0 40px white;
}

.flow-wrapper {
  width: 100%;
  height: 100%;
}

.blur-bg {
  filter: blur(5px);
  transition: 0.5s;
}

.neon-node {
  position: relative;
  background: rgba(0, 0, 0, 0.8);
  border: 2px solid #00f2ff;
  border-radius: 16px;
  padding: 15px;
  width: 220px;
  color: white;
  box-shadow: 0 0 15px rgba(0, 242, 255, 0.3);
  transition: all 0.3s ease;
  animation: float 4s ease-in-out infinite;
}

@keyframes float {
  0% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-8px);
  }
  100% {
    transform: translateY(0px);
  }
}

.neon-node:hover {
  transform: scale(1.1);
  box-shadow: 0 0 40px rgba(0, 242, 255, 0.8);
  border-color: white;
  z-index: 100;
}

.neon-node.sub-node {
  width: 180px;
  border-color: #bd00ff;
  box-shadow: 0 0 10px rgba(189, 0, 255, 0.3);
  animation-duration: 5s;
}

.neon-node.completed {
  border-color: #10b981;
  box-shadow: 0 0 20px rgba(16, 185, 129, 0.5);
}

.node-content {
  display: flex;
  align-items: center;
  gap: 10px;
}

.icon-box {
  font-size: 1.2rem;
  color: #00f2ff;
}

.sub-node .icon-box {
  color: #bd00ff;
}

.completed .icon-box {
  color: #10b981;
}

.node-title {
  font-weight: 700;
  font-size: 0.9rem;
  line-height: 1.2;
  word-wrap: break-word;
}

.side-drawer {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 400px;
  background: rgba(15, 23, 42, 0.95);
  border-left: 1px solid #333;
  padding: 40px;
  z-index: 200;
  box-shadow: -10px 0 50px rgba(0, 0, 0, 0.8);
  display: flex;
  flex-direction: column;
}

.close-btn {
  position: absolute;
  top: 20px;
  right: 20px;
  background: none;
  border: none;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
}

.drawer-header h3 {
  font-size: 1.5rem;
  color: #00f2ff;
  margin: 0 0 10px 0;
}

.status-badge {
  display: inline-block;
  padding: 5px 12px;
  border-radius: 8px;
  font-weight: bold;
  font-size: 0.8rem;
}

.status-badge.pending {
  background: #333;
  color: #aaa;
}

.status-badge.done {
  background: #10b981;
  color: black;
}

.drawer-desc {
  margin-top: 20px;
  line-height: 1.6;
  color: #ccc;
  font-size: 1rem;
  flex: 1;
}

.action-area {
  margin-top: auto;
  padding-top: 20px;
  border-top: 1px solid #333;
}

.neon-checkbox {
  display: flex;
  align-items: center;
  cursor: pointer;
  font-size: 1rem;
  user-select: none;
}

.neon-checkbox input {
  display: none;
}

.checkmark {
  height: 20px;
  width: 20px;
  background: transparent;
  border: 2px solid #bd00ff;
  border-radius: 5px;
  margin-right: 15px;
  position: relative;
  transition: 0.2s;
}

.neon-checkbox input:checked ~ .checkmark {
  background: #bd00ff;
  box-shadow: 0 0 15px #bd00ff;
}

.slide-right-enter-active, .slide-right-leave-active {
  transition: transform 0.3s ease;
}

.slide-right-enter-from, .slide-right-leave-to {
  transform: translateX(100%);
}
</style>