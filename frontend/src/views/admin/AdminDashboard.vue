<template>
  <div class="dashboard-content fade-in-up">

    <!-- ЗАГОЛОВОК -->
    <div class="dash-header">
      <div class="header-text">
        <h1>👋 Добро пожаловать, Админ!</h1>
        <p>Система работает стабильно. Данные обновлены.</p>
      </div>
      <div class="date-badge">
        <calendar-outlined /> {{ currentDate }}
      </div>
    </div>

    <!-- 1. СТАТИСТИКА (КАРТОЧКИ) -->
    <div class="stats-grid">
      <div class="glass-card stat-item">
         <div class="icon-wrap purple"><team-outlined /></div>
         <div class="info">
           <div class="num">{{ stats.counts?.users || 0 }}</div>
           <div class="label">Пользователей</div>
         </div>
      </div>
      <div class="glass-card stat-item">
         <div class="icon-wrap blue"><solution-outlined /></div>
         <div class="info">
           <div class="num">{{ stats.counts?.vacancies || 0 }}</div>
           <div class="label">Вакансий</div>
         </div>
      </div>
      <div class="glass-card stat-item">
         <div class="icon-wrap green"><file-done-outlined /></div>
         <div class="info">
           <div class="num">{{ stats.counts?.applications || 0 }}</div>
           <div class="label">Откликов</div>
         </div>
      </div>
      <div class="glass-card stat-item">
         <div class="icon-wrap orange"><bank-outlined /></div>
         <div class="info">
           <div class="num">{{ stats.counts?.companies || 0 }}</div>
           <div class="label">Компаний</div>
         </div>
      </div>
    </div>

    <!-- 2. ГРАФИКИ И AI ОТЧЕТ -->
    <div class="charts-row">

      <!-- ЛЕВЫЙ БЛОК: График регистраций -->
      <div class="glass-card chart-card">
        <div class="card-title-row">
           <h3>🚀 Активность (Регистрации)</h3>
        </div>
        <div class="chart-wrapper">
          <!-- ГРАФИК -->
          <Line v-if="chartLoaded" :data="lineChartData" :options="chartOptions" />
          <div v-else class="loading-chart"><loading-outlined spin /></div>
        </div>
      </div>

      <!-- ПРАВЫЙ БЛОК: AI Аналитика -->
      <div class="glass-card ai-report-card">
        <div class="card-title-row">
           <h3>🤖 AI Аналитика платформы</h3>
           <a-button type="primary" shape="round" size="small" :loading="aiLoading" @click="generateReport">
             <thunderbolt-filled /> Сгенерировать
           </a-button>
        </div>

        <div class="ai-content custom-scroll" v-if="aiReport" v-html="formatMarkdown(aiReport)"></div>

        <div class="ai-placeholder" v-else>
           <file-search-outlined style="font-size: 40px; opacity: 0.5; margin-bottom: 10px;" />
           <p>Нажмите кнопку, чтобы получить сводку от ИИ на основе текущих данных.</p>
        </div>
      </div>
    </div>

    <!-- 3. НИЖНИЙ РЯД (ТОП НАВЫКОВ) -->
    <div class="bottom-row">
      <div class="glass-card skills-card">
        <h3>🔥 Топ востребованных навыков</h3>
        <p class="sub-h">Чего сейчас хотят работодатели</p>

        <div class="skills-list" v-if="stats.skills && stats.skills.length">
          <div v-for="(skill, idx) in stats.skills" :key="idx" class="skill-row">
            <div class="skill-info">
              <span class="skill-name">{{ skill.name }}</span>
              <span class="skill-count">{{ skill.count }} вак.</span>
            </div>
            <div class="progress-bg">
              <div class="progress-fill" :style="{ width: (skill.count / (stats.skills[0]?.count || 1) * 100) + '%' }"></div>
            </div>
          </div>
        </div>
        <div v-else class="empty-skills">Недостаточно данных</div>
      </div>

      <!-- Статус сервера (Декор) -->
      <div class="glass-card server-card">
        <h3>🖥 Состояние системы</h3>
        <div class="server-grid">
           <div class="s-item"><div class="s-val success">Stable</div><div class="s-label">API Status</div></div>
           <div class="s-item"><div class="s-val">24ms</div><div class="s-label">Latency</div></div>
           <div class="s-item"><div class="s-val">0%</div><div class="s-label">Error Rate</div></div>
        </div>
        <div class="uptime-bar"><div class="uptime-fill"></div></div>
        <div class="uptime-text">Uptime: 99.9% (Last 30 days)</div>
      </div>
    </div>

  </div>
</template>

<script>
import api from '../../axios';
import { marked } from 'marked';
import { ref, onMounted } from 'vue';
import {
  TeamOutlined, SolutionOutlined, FileDoneOutlined, BankOutlined,
  CalendarOutlined, LoadingOutlined, ThunderboltFilled, FileSearchOutlined
} from '@ant-design/icons-vue';

// --- ИМПОРТЫ ДЛЯ ГРАФИКОВ (Chart.js) ---
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'vue-chartjs';

// Регистрируем компоненты графика
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

export default {
  components: {
    Line, // <--- Компонент графика
    TeamOutlined, SolutionOutlined, FileDoneOutlined, BankOutlined,
    CalendarOutlined, LoadingOutlined, ThunderboltFilled, FileSearchOutlined
  },
  setup() {
    const stats = ref({});
    const aiReport = ref('');
    const aiLoading = ref(false);
    const chartLoaded = ref(false);

    const currentDate = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

    // Данные для графика (Reactive)
    const lineChartData = ref({
      labels: [],
      datasets: [{
        label: 'Регистрации',
        backgroundColor: 'rgba(99, 102, 241, 0.2)', // Цвет заливки (Индиго прозрачный)
        borderColor: '#6366f1', // Цвет линии
        pointBackgroundColor: '#fff',
        pointBorderColor: '#6366f1',
        pointRadius: 4,
        fill: true,
        data: [],
        tension: 0.4 // Плавность линии
      }]
    });

    // Настройки графика
    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, grid: { borderDash: [5, 5], color: 'rgba(0,0,0,0.05)' } },
        x: { grid: { display: false } }
      }
    };

    const loadStats = async () => {
      try {
        const r = await api.get('/admin/stats');
        stats.value = r.data;

        // ЗАПОЛНЯЕМ ГРАФИК ДАННЫМИ С БЭКА
        if (r.data.chart && r.data.chart.length > 0) {
           lineChartData.value.labels = r.data.chart.map(item => item.day.trim());
           lineChartData.value.datasets[0].data = r.data.chart.map(item => item.count);
        } else {
           // Заглушка, если данных нет
           lineChartData.value.labels = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
           lineChartData.value.datasets[0].data = [0, 0, 0, 0, 0, 0, 0];
        }
        chartLoaded.value = true;
      } catch(e){
        console.error(e);
      }
    };

    const generateReport = async () => {
      aiLoading.value = true;
      try {
        const r = await api.post('/admin/report');
        aiReport.value = r.data.report;
      } catch(e){}
      finally { aiLoading.value = false; }
    };

    const formatMarkdown = (t) => marked.parse(t);

    onMounted(loadStats);

    return {
      stats, aiReport, aiLoading, generateReport, formatMarkdown, currentDate,
      lineChartData, chartOptions, chartLoaded
    };
  }
}
</script>

<style scoped>
/* ОБЩИЙ СТИЛЬ */
.dashboard-content { width: 100%; max-width: 1200px; margin: 0 auto; }

/* HEADER */
.dash-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 30px; }
.dash-header h1 { font-size: 2.2rem; font-weight: 800; color: #1f2937; margin: 0; }
.dash-header p { color: #6b7280; font-size: 1.1rem; margin-top: 5px; }
.date-badge { background: rgba(255,255,255,0.6); padding: 8px 16px; border-radius: 20px; font-weight: 600; color: #4b5563; border: 1px solid white; display: flex; gap: 8px; align-items: center; }

/* STATS GRID */
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; margin-bottom: 30px; }
.stat-item { display: flex; align-items: center; gap: 15px; transition: transform 0.3s; }
.stat-item:hover { transform: translateY(-5px); }

/* ICON WRAPS */
.icon-wrap { width: 55px; height: 55px; border-radius: 18px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; color: white; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
.purple { background: linear-gradient(135deg, #a855f7, #7c3aed); }
.blue { background: linear-gradient(135deg, #3b82f6, #2563eb); }
.green { background: linear-gradient(135deg, #10b981, #059669); }
.orange { background: linear-gradient(135deg, #f59e0b, #d97706); }
.num { font-size: 1.8rem; font-weight: 800; color: #1f2937; line-height: 1; }
.label { font-size: 0.9rem; color: #6b7280; margin-top: 4px; }

/* CHARTS ROW */
.charts-row { display: grid; grid-template-columns: 1.5fr 1fr; gap: 25px; margin-bottom: 30px; }
@media(max-width: 900px) { .charts-row { grid-template-columns: 1fr; } }

.chart-card { min-height: 380px; display: flex; flex-direction: column; }
.chart-wrapper { flex: 1; position: relative; min-height: 250px; }

.ai-report-card { display: flex; flex-direction: column; min-height: 380px; }
.ai-content { flex: 1; overflow-y: auto; font-size: 0.9rem; line-height: 1.6; color: #374151; padding-right: 5px; max-height: 280px; }
.ai-placeholder { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; color: #9ca3af; padding: 20px; }

/* BOTTOM ROW */
.bottom-row { display: grid; grid-template-columns: 1fr 1fr; gap: 25px; }
@media(max-width: 768px) { .bottom-row { grid-template-columns: 1fr; } }

.skills-card h3, .server-card h3 { margin: 0 0 5px 0; color: #1f2937; }
.sub-h { font-size: 0.85rem; color: #6b7280; margin-bottom: 15px; }

.skills-list { display: flex; flex-direction: column; gap: 12px; }
.skill-info { display: flex; justify-content: space-between; font-size: 0.9rem; font-weight: 600; color: #374151; margin-bottom: 4px; }
.skill-count { color: #6366f1; }
.progress-bg { height: 8px; background: #f3f4f6; border-radius: 4px; overflow: hidden; }
.progress-fill { height: 100%; background: linear-gradient(90deg, #6366f1, #a855f7); border-radius: 4px; }

/* SERVER STATUS */
.server-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 20px; margin-top: 15px; }
.s-item { text-align: center; background: rgba(255,255,255,0.5); padding: 10px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.8); }
.s-val { font-weight: 800; font-size: 1.1rem; color: #1f2937; }
.s-val.success { color: #10b981; }
.s-label { font-size: 0.75rem; color: #9ca3af; }
.uptime-bar { height: 6px; background: #e5e7eb; border-radius: 3px; overflow: hidden; margin-bottom: 5px; }
.uptime-fill { width: 99%; height: 100%; background: #10b981; }
.uptime-text { font-size: 0.8rem; color: #6b7280; text-align: right; }

/* СТЕКЛЯННЫЙ КЛАСС (Дублируется для уверенности) */
.glass-card {
  background: rgba(255, 255, 255, 0.65);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 24px;
  padding: 25px;
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.05);
}

.card-title-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.card-title-row h3 { margin: 0; font-size: 1.2rem; font-weight: 700; color: #374151; }

.custom-scroll::-webkit-scrollbar { width: 4px; }
.custom-scroll::-webkit-scrollbar-thumb { background: #d8b4fe; border-radius: 4px; }
.loading-chart { display: flex; justify-content: center; align-items: center; height: 100%; font-size: 2rem; color: #6366f1; }
.fade-in-up { animation: fadeInUp 0.8s ease forwards; opacity: 0; transform: translateY(30px); }
@keyframes fadeInUp { to { opacity: 1; transform: translateY(0); } }
</style>