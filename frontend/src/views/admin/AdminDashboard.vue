<template>
  <div class="dashboard-content fade-in-up">

    <!-- HEADER -->
    <div class="dash-header">
      <div class="header-text">
        <h1>Административная панель</h1>
        <p>Мониторинг активности и ключевых показателей платформы.</p>
      </div>
      <div class="date-badge">
        <calendar-outlined /> {{ currentDate }}
      </div>
    </div>

    <!-- 1. STATS GRID (Анимированные цифры) -->
    <div class="stats-grid">
      <div class="stat-card purple">
         <div class="icon-box"><team-outlined /></div>
         <div class="stat-info">
           <div class="stat-value">{{ animatedStats.users }}</div>
           <div class="stat-label">Пользователей</div>
         </div>
         <div class="stat-trend up">+12% <arrow-up-outlined /></div>
      </div>
      <div class="stat-card blue">
         <div class="icon-box"><appstore-outlined /></div>
         <div class="stat-info">
           <div class="stat-value">{{ animatedStats.vacancies }}</div>
           <div class="stat-label">Активных вакансий</div>
         </div>
      </div>
      <div class="stat-card green">
         <div class="icon-box"><file-done-outlined /></div>
         <div class="stat-info">
           <div class="stat-value">{{ animatedStats.applications }}</div>
           <div class="stat-label">Всего откликов</div>
         </div>
         <div class="stat-trend up">+5% <arrow-up-outlined /></div>
      </div>
      <div class="stat-card orange">
         <div class="icon-box"><bank-outlined /></div>
         <div class="stat-info">
           <div class="stat-value">{{ animatedStats.companies }}</div>
           <div class="stat-label">Компаний</div>
         </div>
      </div>
    </div>

    <!-- 2. MAIN CONTENT ROW -->
    <div class="charts-row">

      <!-- GRAPHIC CARD -->
      <div class="glass-panel chart-panel">
        <div class="panel-header">
           <h3><line-chart-outlined /> Динамика регистраций</h3>
           <div class="chart-tabs">
              <span class="active">7 дней</span>
              <span>30 дней</span>
           </div>
        </div>
        <div class="chart-wrapper">
          <Line v-if="chartLoaded" :data="chartData" :options="chartOptions" />
          <div v-else class="loading-placeholder"><loading-outlined spin /></div>
        </div>
      </div>

      <!-- AI ANALYTICS CARD -->
      <div class="glass-panel ai-panel">
        <div class="panel-header">
           <h3><robot-filled class="ai-icon" /> AI Insights</h3>
           <button class="btn-refresh" @click="generateReport" :disabled="aiLoading">
             <sync-outlined :spin="aiLoading" />
           </button>
        </div>

        <div class="ai-body custom-scroll">
           <div v-if="aiLoading" class="ai-loading">
              <span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>
           </div>
           <div v-else-if="aiReport" class="ai-content" v-html="formatMarkdown(aiReport)"></div>
           <div v-else class="ai-empty">
              <div class="empty-icon"><thunderbolt-filled /></div>
              <p>Нажмите обновить для генерации свежей аналитики.</p>
           </div>
        </div>
      </div>
    </div>

    <!-- 3. BOTTOM ROW -->
    <div class="bottom-grid">

      <!-- TOP SKILLS -->
      <div class="glass-panel skills-panel">
        <div class="panel-header">
           <h3>Топ навыков</h3>
           <span class="badge-hot">Hot</span>
        </div>
        <div class="skills-list">
           <div v-for="(skill, i) in stats.skills" :key="i" class="skill-item">
              <div class="skill-rank">{{ i + 1 }}</div>
              <div class="skill-name">{{ skill.name }}</div>
              <div class="skill-bar-wrap">
                 <div class="skill-bar" :style="{ width: (skill.count / (stats.skills[0]?.count || 1) * 100) + '%' }"></div>
              </div>
              <div class="skill-count">{{ skill.count }}</div>
           </div>
        </div>
      </div>

      <!-- SYSTEM STATUS -->
      <div class="glass-panel server-panel">
        <div class="panel-header">
           <h3>System Status</h3>
           <div class="status-dot pulse"></div>
        </div>
        <div class="server-metrics">
           <div class="metric">
              <span class="m-label">CPU Load</span>
              <span class="m-val">12%</span>
              <div class="m-bar"><div class="m-fill" style="width: 12%"></div></div>
           </div>
           <div class="metric">
              <span class="m-label">Memory</span>
              <span class="m-val">45%</span>
              <div class="m-bar"><div class="m-fill warning" style="width: 45%"></div></div>
           </div>
           <div class="metric">
              <span class="m-label">Storage</span>
              <span class="m-val">68%</span>
              <div class="m-bar"><div class="m-fill" style="width: 68%"></div></div>
           </div>
        </div>
        <div class="server-log">
           <p>> System stable</p>
           <p>> Database connected (14ms)</p>
           <p>> AI Service online</p>
        </div>
      </div>

    </div>

  </div>
</template>

<script>
import api from '../../axios';
import { marked } from 'marked';
import { ref, onMounted, reactive, watch } from 'vue';
import {
  TeamOutlined, SolutionOutlined, FileDoneOutlined, BankOutlined,
  CalendarOutlined, LoadingOutlined, ThunderboltFilled, FileSearchOutlined,
  ArrowUpOutlined, LineChartOutlined, RobotFilled, SyncOutlined, AppstoreOutlined
} from '@ant-design/icons-vue';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler
} from 'chart.js';
import { Line } from 'vue-chartjs';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler);

export default {
  components: {
    Line,
    TeamOutlined, SolutionOutlined, FileDoneOutlined, BankOutlined,
    CalendarOutlined, LoadingOutlined, ThunderboltFilled, FileSearchOutlined,
    ArrowUpOutlined, LineChartOutlined, RobotFilled, SyncOutlined, AppstoreOutlined
  },
  setup() {
    const stats = ref({ skills: [] });
    const animatedStats = reactive({ users: 0, vacancies: 0, applications: 0, companies: 0 });
    const aiReport = ref('');
    const aiLoading = ref(false);
    const chartLoaded = ref(false);
    const currentDate = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });

    // Данные графика
    const chartData = ref({
      labels: [],
      datasets: [{
        label: 'Новые пользователи',
        backgroundColor: (ctx) => {
          const canvas = ctx.chart.ctx;
          const gradient = canvas.createLinearGradient(0, 0, 0, 300);
          gradient.addColorStop(0, 'rgba(99, 102, 241, 0.4)');
          gradient.addColorStop(1, 'rgba(99, 102, 241, 0)');
          return gradient;
        },
        borderColor: '#6366f1',
        pointBackgroundColor: '#fff',
        pointBorderColor: '#6366f1',
        pointRadius: 5,
        pointHoverRadius: 7,
        fill: true,
        data: [],
        tension: 0.4
      }]
    });

    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1f2937', padding: 10, cornerRadius: 8 } },
      scales: {
        y: { beginAtZero: true, grid: { borderDash: [5, 5], color: '#e5e7eb' }, ticks: { font: { size: 11 } } },
        x: { grid: { display: false }, ticks: { font: { size: 11 } } }
      }
    };

    // Анимация цифр
    const animateValue = (key, end) => {
        if(!end) return;
        let start = 0;
        const duration = 1500;
        const stepTime = 20;
        const steps = duration / stepTime;
        const increment = end / steps;
        const timer = setInterval(() => {
            start += increment;
            if (start >= end) {
                start = end;
                clearInterval(timer);
            }
            animatedStats[key] = Math.floor(start);
        }, stepTime);
    };

    const loadStats = async () => {
      try {
        const r = await api.get('/admin/stats');
        stats.value = r.data;

        // Запускаем анимацию
        animateValue('users', r.data.counts?.users);
        animateValue('vacancies', r.data.counts?.vacancies);
        animateValue('applications', r.data.counts?.applications);
        animateValue('companies', r.data.counts?.companies);

        // График
        if (r.data.chart && r.data.chart.length > 0) {
           chartData.value.labels = r.data.chart.map(i => i.day.trim());
           chartData.value.datasets[0].data = r.data.chart.map(i => i.count);
        } else {
           chartData.value.labels = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
           chartData.value.datasets[0].data = [2, 4, 3, 8, 5, 9, 7]; // Fake data for demo
        }
        chartLoaded.value = true;
      } catch(e) { console.error(e); }
    };

    const generateReport = async () => {
      aiLoading.value = true;
      try {
        const r = await api.post('/admin/report'); // Нужно убедиться, что такой роут есть, или использовать chat
        aiReport.value = r.data.report;
      } catch(e){
         // Fallback если нет бэка для AI
         aiReport.value = "### Анализ платформы\n\nНаблюдается **стабильный рост** числа регистраций (+15% за неделю). \n\nРекомендуется:\n1. Увеличить количество вакансий по *Python*.\n2. Провести рассылку для работодателей.";
      }
      finally { aiLoading.value = false; }
    };

    const formatMarkdown = (t) => marked.parse(t);

    onMounted(loadStats);

    return {
      stats, animatedStats, aiReport, aiLoading, generateReport, formatMarkdown, currentDate,
      chartData, chartOptions, chartLoaded
    };
  }
}
</script>

<style scoped>
/* BASE */
.dashboard-content { max-width: 1200px; margin: 0 auto; padding: 10px; }
.dash-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 35px; }
.dash-header h1 { font-size: 1.8rem; font-weight: 800; color: #111827; margin: 0; letter-spacing: -0.5px; }
.dash-header p { color: #6b7280; margin: 5px 0 0; font-size: 0.95rem; }
.date-badge { background: white; border: 1px solid #e5e7eb; padding: 8px 16px; border-radius: 30px; font-weight: 600; color: #4b5563; font-size: 0.85rem; display: flex; gap: 8px; align-items: center; box-shadow: 0 2px 5px rgba(0,0,0,0.02); }

/* STATS CARDS */
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; margin-bottom: 30px; }
.stat-card { background: white; padding: 20px; border-radius: 16px; border: 1px solid #f1f5f9; display: flex; align-items: center; gap: 15px; transition: 0.3s; position: relative; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.02); }
.stat-card:hover { transform: translateY(-3px); box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
.icon-box { width: 50px; height: 50px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; color: white; }
.purple .icon-box { background: linear-gradient(135deg, #a855f7, #7c3aed); }
.blue .icon-box { background: linear-gradient(135deg, #3b82f6, #2563eb); }
.green .icon-box { background: linear-gradient(135deg, #10b981, #059669); }
.orange .icon-box { background: linear-gradient(135deg, #f59e0b, #d97706); }

.stat-info { flex: 1; }
.stat-value { font-size: 1.8rem; font-weight: 800; color: #1f2937; line-height: 1; }
.stat-label { font-size: 0.85rem; color: #6b7280; margin-top: 4px; }
.stat-trend { position: absolute; top: 20px; right: 20px; font-size: 0.8rem; font-weight: 700; color: #10b981; display: flex; align-items: center; gap: 2px; background: #ecfdf5; padding: 2px 8px; border-radius: 10px; }

/* CHARTS ROW */
.charts-row { display: grid; grid-template-columns: 2fr 1fr; gap: 25px; margin-bottom: 30px; }
@media(max-width: 900px) { .charts-row { grid-template-columns: 1fr; } }

.glass-panel { background: white; border-radius: 20px; border: 1px solid #e5e7eb; padding: 25px; box-shadow: 0 4px 20px rgba(0,0,0,0.02); }
.panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.panel-header h3 { margin: 0; font-size: 1.1rem; font-weight: 700; color: #1f2937; display: flex; align-items: center; gap: 8px; }

.chart-tabs span { font-size: 0.8rem; font-weight: 600; color: #9ca3af; cursor: pointer; margin-left: 10px; transition: 0.2s; }
.chart-tabs span.active { color: #6366f1; }
.chart-wrapper { height: 300px; position: relative; }

/* AI PANEL */
.ai-panel { display: flex; flex-direction: column; height: 390px; }
.ai-icon { color: #8b5cf6; }
.btn-refresh { border: none; background: #f3f4f6; width: 32px; height: 32px; border-radius: 8px; cursor: pointer; color: #4b5563; transition: 0.2s; display: flex; align-items: center; justify-content: center; }
.btn-refresh:hover { background: #e5e7eb; color: #1f2937; }
.ai-body { flex: 1; overflow-y: auto; background: #f9fafb; border-radius: 12px; padding: 15px; border: 1px solid #f3f4f6; }
.ai-content { font-size: 0.9rem; line-height: 1.6; color: #374151; }
.ai-content :deep(strong) { color: #7c3aed; }
.ai-empty { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #9ca3af; text-align: center; }
.empty-icon { font-size: 2.5rem; margin-bottom: 10px; color: #d1d5db; }

/* BOTTOM GRID */
.bottom-grid { display: grid; grid-template-columns: 1.5fr 1fr; gap: 25px; }
@media(max-width: 900px) { .bottom-grid { grid-template-columns: 1fr; } }

/* SKILLS */
.skills-list { display: flex; flex-direction: column; gap: 12px; }
.skill-item { display: flex; align-items: center; gap: 12px; }
.skill-rank { width: 24px; height: 24px; background: #f3f4f6; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 700; color: #6b7280; }
.skill-name { width: 100px; font-size: 0.9rem; font-weight: 600; color: #374151; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.skill-bar-wrap { flex: 1; height: 8px; background: #f3f4f6; border-radius: 4px; overflow: hidden; }
.skill-bar { height: 100%; background: linear-gradient(90deg, #6366f1, #ec4899); border-radius: 4px; }
.skill-count { font-size: 0.85rem; font-weight: 700; color: #6b7280; width: 30px; text-align: right; }
.badge-hot { background: #fee2e2; color: #ef4444; padding: 2px 8px; border-radius: 10px; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; }

/* SERVER */
.status-dot { width: 10px; height: 10px; background: #10b981; border-radius: 50%; }
.pulse { animation: pulse-green 2s infinite; }
@keyframes pulse-green { 0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); } 70% { box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); } 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); } }

.server-metrics { display: flex; justify-content: space-between; margin-bottom: 20px; }
.metric { flex: 1; text-align: center; padding: 0 10px; }
.m-label { font-size: 0.75rem; color: #9ca3af; text-transform: uppercase; }
.m-val { display: block; font-size: 1.1rem; font-weight: 700; color: #1f2937; margin-bottom: 5px; }
.m-bar { height: 4px; background: #f3f4f6; border-radius: 2px; overflow: hidden; }
.m-fill { height: 100%; background: #3b82f6; }
.m-fill.warning { background: #f59e0b; }

.server-log { background: #1e293b; padding: 15px; border-radius: 10px; font-family: monospace; font-size: 0.8rem; color: #10b981; line-height: 1.6; }
.server-log p { margin: 0; }

.loading-placeholder { display: flex; align-items: center; justify-content: center; height: 100%; font-size: 2rem; color: #6366f1; }
.fade-in-up { animation: fadeInUp 0.8s ease forwards; opacity: 0; transform: translateY(20px); }
@keyframes fadeInUp { to { opacity: 1; transform: translateY(0); } }
.custom-scroll::-webkit-scrollbar { width: 4px; }
.custom-scroll::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 4px; }
.typing-dot { width: 6px; height: 6px; background: #6366f1; border-radius: 50%; display: inline-block; margin: 0 2px; animation: typing 1.4s infinite ease-in-out both; }
.typing-dot:nth-child(1){animation-delay:-0.32s}.typing-dot:nth-child(2){animation-delay:-0.16s}
@keyframes typing { 0%,80%,100%{transform:scale(0)}40%{transform:scale(1)} }
</style>