<template>
  <div class="page-wrapper">
    <!-- ЖИВОЙ ФОН (Пузыри) -->
    <div class="blobs-container">
      <div class="blob blob-purple"></div>
      <div class="blob blob-blue"></div>
      <div class="blob blob-pink"></div>
    </div>

    <div class="dashboard-content fade-in">

      <!-- ШАПКА -->
      <div class="header-section">
        <div class="title-group">
          <h2 class="page-title">Панель мониторинга</h2>
          <p class="subtitle">Аналитика трудоустройства и карьерных треков</p>
        </div>

        <!-- КНОПКА AI -->
        <button class="ai-btn-glow" @click="openAiModal" :disabled="aiLoading">
          <robot-outlined class="icon-mr" />
          <span>{{ aiLoading ? 'Анализируем...' : 'AI Анализ' }}</span>
        </button>
      </div>

      <a-spin :spinning="loading" size="large" tip="Загрузка данных...">

        <!-- 1. ВЕРХНИЙ РЯД (KPI) -->
        <a-row :gutter="[24, 24]" class="mb-30">
          <!-- Всего выпускников -->
          <a-col :xs="24" :sm="12" :lg="6">
            <div class="glass-card kpi-card hover-lift">
              <div class="kpi-icon-wrapper bg-blue">
                <team-outlined />
              </div>
              <div class="kpi-content">
                <div class="kpi-value">{{ stats.kpi.total }}</div>
                <div class="kpi-label">Выпускников</div>
              </div>
            </div>
          </a-col>

          <!-- Трудоустроено -->
          <a-col :xs="24" :sm="12" :lg="6">
            <div class="glass-card kpi-card hover-lift">
              <div class="kpi-icon-wrapper bg-green">
                <check-circle-outlined />
              </div>
              <div class="kpi-content">
                <div class="kpi-value">{{ stats.kpi.rate }}%</div>
                <div class="kpi-label">Трудоустроено</div>
                <a-progress
                  :percent="stats.kpi.rate"
                  :show-info="false"
                  stroke-color="#10b981"
                  trail-color="rgba(0,0,0,0.05)"
                  size="small"
                  class="mt-2"
                />
              </div>
            </div>
          </a-col>

          <!-- Средняя ЗП -->
          <a-col :xs="24" :sm="12" :lg="6">
            <div class="glass-card kpi-card hover-lift">
              <div class="kpi-icon-wrapper bg-orange">
                <wallet-outlined />
              </div>
              <div class="kpi-content">
                <div class="kpi-value">{{ formatMoney(stats.kpi.avg_salary) }} ₽</div>
                <div class="kpi-label">Средняя ЗП (Junior)</div>
              </div>
            </div>
          </a-col>

          <!-- Зона риска -->
          <a-col :xs="24" :sm="12" :lg="6">
            <div class="glass-card kpi-card hover-lift risk-card">
              <div class="kpi-icon-wrapper bg-red">
                <fire-outlined />
              </div>
              <div class="kpi-content">
                <div class="kpi-value text-red">{{ stats.kpi.at_risk }}</div>
                <div class="kpi-label">В зоне риска</div>
                <small class="risk-desc">Не работают > 6 мес.</small>
              </div>
            </div>
          </a-col>
        </a-row>

        <!-- 2. ГРАФИКИ -->
        <a-row :gutter="[24, 24]" class="mb-30">
          <!-- Doughnut (Статус) -->
          <a-col :xs="24" :lg="8">
            <div class="glass-card chart-card full-height">
              <div class="card-header">
                <h3><pie-chart-outlined /> Статус выпускников</h3>
              </div>
              <div class="chart-container">
                <Doughnut v-if="chartData.status" :data="chartData.status" :options="chartOptions" />
              </div>
            </div>
          </a-col>

          <!-- Bar (Факультеты) -->
          <a-col :xs="24" :lg="16">
            <div class="glass-card chart-card full-height">
              <div class="card-header">
                <h3><bar-chart-outlined /> Трудоустройство по факультетам</h3>
              </div>
              <div class="chart-container">
                <Bar v-if="chartData.faculties" :data="chartData.faculties" :options="barOptions" />
              </div>
            </div>
          </a-col>
        </a-row>

        <!-- 3. ТОП ПАРТНЕРОВ (ТАБЛИЦА) -->
        <a-row>
          <a-col :span="24">
            <div class="glass-card table-card">
              <div class="card-header border-bottom">
                <h3><trophy-outlined style="color: #f59e0b" /> Топ партнеров-работодателей</h3>
                <a-tag color="purple">Рейтинг по вакансиям</a-tag>
              </div>

              <a-table
                :dataSource="stats.top_companies"
                :columns="columns"
                :pagination="false"
                rowKey="company_name"
                class="custom-table"
              >
                <!-- КАСТОМНЫЕ ЯЧЕЙКИ -->
                <template #bodyCell="{ column, record }">

                  <!-- 1. КОЛОНКА КОМПАНИИ -->
                  <template v-if="column.key === 'company'">
                    <div class="company-cell">
                      <!-- Логотип или заглушка -->
                      <a-avatar
                        :src="record.logo_url"
                        shape="square"
                        size="large"
                        class="company-logo"
                      >
                        <template #icon><bank-outlined /></template>
                      </a-avatar>
                      <span class="company-name">{{ record.company_name }}</span>
                    </div>
                  </template>

                  <!-- 2. КОЛОНКА AI РЕЙТИНГ -->
                  <template v-if="column.key === 'score'">
                    <a-tag v-if="record.ai_score >= 80" color="green">
                      High {{ record.ai_score }}
                    </a-tag>
                    <a-tag v-else-if="record.ai_score >= 50" color="orange">
                      Med {{ record.ai_score }}
                    </a-tag>
                    <a-tag v-else-if="record.ai_score !== null" color="red">
                      Low {{ record.ai_score }}
                    </a-tag>
                    <span v-else style="color: #ccc">—</span>
                  </template>

                  <!-- 3. КОЛОНКА ВАКАНСИЙ -->
                  <template v-if="column.key === 'vacancies'">
                     <div class="vacancy-badge">
                        {{ record.vacancy_count }}
                     </div>
                  </template>

                </template>

                <!-- Если данных нет -->
                <template #emptyText>
                  <div class="empty-state">
                    <inbox-outlined class="empty-icon" />
                    <p>Нет активных партнеров</p>
                  </div>
                </template>
              </a-table>
            </div>
          </a-col>
        </a-row>

      </a-spin>
    </div>

    <!-- МОДАЛЬНОЕ ОКНО AI -->
    <a-modal
      v-model:open="isAiModalOpen"
      title="🤖 AI Аналитика и Рекомендации"
      footer=""
      centered
      width="700px"
      wrap-class-name="ai-modal-glass"
    >
      <div v-if="aiLoading" class="ai-loading-state">
        <a-spin size="large" />
        <p>Llama 3 анализирует данные...</p>
      </div>

      <div v-else class="ai-content-box">
         <div v-html="renderMarkdown(aiReport)" class="markdown-body"></div>
      </div>
    </a-modal>

  </div>
</template>

<script>
import api from '../axios';
import {
  TeamOutlined, CheckCircleOutlined, WalletOutlined, FireOutlined,
  RobotOutlined, TrophyOutlined, InboxOutlined, PieChartOutlined,
  BarChartOutlined, BankOutlined
} from '@ant-design/icons-vue';
import { message } from 'ant-design-vue';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from 'chart.js'
import { Doughnut, Bar } from 'vue-chartjs'

ChartJS.register(ArcElement, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

export default {
  components: {
    TeamOutlined, CheckCircleOutlined, WalletOutlined, FireOutlined,
    RobotOutlined, TrophyOutlined, InboxOutlined, PieChartOutlined,
    BarChartOutlined, BankOutlined,
    Doughnut, Bar
  },
  data() {
    return {
      loading: true,
      aiLoading: false,
      isAiModalOpen: false,
      aiReport: '',

      stats: {
        kpi: { total: 0, rate: 0, avg_salary: 0, at_risk: 0 },
        top_companies: []
      },

      chartData: { status: null, faculties: null },

      chartOptions: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'right' } }
      },
      barOptions: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } }, x: { grid: { display: false } } }
      },

      // Конфигурация колонок таблицы (без JSX!)
      columns: [
        { title: 'Компания', key: 'company', width: '50%' },
        { title: 'AI Рейтинг', key: 'score', align: 'center' },
        { title: 'Вакансий', key: 'vacancies', align: 'right' },
      ]
    }
  },
  async mounted() {
    await this.fetchData();
  },
  methods: {
    formatMoney(val) {
      return new Intl.NumberFormat('ru-RU').format(val);
    },

    renderMarkdown(text) {
        if (!text) return '';
        return text
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/- /g, '• ')
          .replace(/\n/g, '<br>');
    },

    async fetchData() {
      try {
        const res = await api.get('/university/stats');
        this.stats = res.data;

        // График статусов
        const statusData = res.data.charts.status_distribution;
        this.chartData.status = {
          labels: statusData.map(d => d.name),
          datasets: [{
            backgroundColor: ['#10b981', '#3b82f6', '#cbd5e1'],
            borderColor: '#ffffff',
            borderWidth: 2,
            data: statusData.map(d => d.value)
          }]
        };

        // График факультетов
        const facultyData = res.data.charts.faculties || [];
        this.chartData.faculties = {
          labels: facultyData.map(f => f.faculty),
          datasets: [{
            label: 'Студентов',
            backgroundColor: '#8b5cf6',
            borderRadius: 6,
            data: facultyData.map(f => f.count)
          }]
        };

      } catch (e) {
        console.error(e);
        message.error('Не удалось загрузить данные');
      } finally {
        this.loading = false;
      }
    },

    async openAiModal() {
      this.isAiModalOpen = true;
      if (this.aiReport) return;

      this.aiLoading = true;
      try {
        const res = await api.get('/university/ai-report');
        this.aiReport = res.data.report;
      } catch (e) {
        this.aiReport = "Не удалось получить ответ от нейросети.";
      } finally {
        this.aiLoading = false;
      }
    }
  }
}
</script>

<style scoped>
/* === LAYOUT & BACKGROUND === */
.page-wrapper {
  position: relative;
  min-height: 100vh;
  padding: 30px;
  background: #f3f4f6;
  overflow-x: hidden;
  font-family: 'Inter', sans-serif;
}

.blobs-container {
  position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 0;
}
.blob { position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.6; animation: float 10s infinite ease-in-out; }
.blob-purple { width: 400px; height: 400px; background: #c4b5fd; top: -10%; left: -5%; }
.blob-blue { width: 350px; height: 350px; background: #bfdbfe; bottom: -10%; right: -5%; animation-delay: 2s; }
.blob-pink { width: 300px; height: 300px; background: #fbcfe8; top: 40%; left: 40%; animation-delay: 4s; opacity: 0.4; }

@keyframes float {
  0% { transform: translate(0, 0); }
  50% { transform: translate(20px, 30px); }
  100% { transform: translate(0, 0); }
}

.dashboard-content { position: relative; z-index: 1; max-width: 1400px; margin: 0 auto; }

/* === HEADER === */
.header-section { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 35px; }
.page-title { font-size: 2rem; font-weight: 800; color: #1f2937; margin: 0; letter-spacing: -0.5px; }
.subtitle { color: #6b7280; margin: 5px 0 0 0; font-size: 1rem; }

/* === BUTTONS === */
.ai-btn-glow {
  background: linear-gradient(135deg, #6366f1, #a855f7);
  border: none;
  color: white;
  padding: 12px 24px;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);
  transition: all 0.3s ease;
}
.ai-btn-glow:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(99, 102, 241, 0.5); }
.ai-btn-glow:disabled { opacity: 0.7; cursor: wait; }
.icon-mr { margin-right: 8px; font-size: 1.2rem; }

/* === GLASS CARDS === */
.glass-card {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
  padding: 24px;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}
.hover-lift:hover { transform: translateY(-5px); box-shadow: 0 15px 30px rgba(0, 0, 0, 0.08); background: rgba(255, 255, 255, 0.85); }
.full-height { height: 100%; display: flex; flex-direction: column; }

/* === KPI CARDS === */
.kpi-card { display: flex; align-items: center; gap: 20px; }
.kpi-icon-wrapper {
  width: 56px; height: 56px; border-radius: 16px; display: flex; align-items: center; justify-content: center;
  font-size: 1.5rem; color: white; flex-shrink: 0;
}
.bg-blue { background: linear-gradient(135deg, #3b82f6, #2563eb); box-shadow: 0 8px 16px rgba(59, 130, 246, 0.25); }
.bg-green { background: linear-gradient(135deg, #10b981, #059669); box-shadow: 0 8px 16px rgba(16, 185, 129, 0.25); }
.bg-orange { background: linear-gradient(135deg, #f59e0b, #d97706); box-shadow: 0 8px 16px rgba(245, 158, 11, 0.25); }
.bg-red { background: linear-gradient(135deg, #ef4444, #dc2626); box-shadow: 0 8px 16px rgba(239, 68, 68, 0.25); }

.kpi-content { flex: 1; }
.kpi-value { font-size: 1.8rem; font-weight: 800; color: #111827; line-height: 1.1; }
.kpi-label { color: #6b7280; font-weight: 500; font-size: 0.95rem; margin-top: 2px; }
.risk-desc { color: #ef4444; font-size: 0.75rem; background: #fee2e2; padding: 2px 6px; border-radius: 4px; }
.text-red { color: #ef4444; }

/* === CHARTS & TABLES === */
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.card-header h3 { margin: 0; font-size: 1.1rem; font-weight: 700; color: #374151; display: flex; align-items: center; gap: 8px; }
.chart-container { position: relative; flex: 1; min-height: 250px; }
.table-card { padding: 0; overflow: hidden; }
.border-bottom { border-bottom: 1px solid rgba(0,0,0,0.05); padding: 20px 24px; margin-bottom: 0; }

.custom-table { background: transparent; }
:deep(.ant-table) { background: transparent; }
:deep(.ant-table-thead > tr > th) { background: rgba(249, 250, 251, 0.5); font-weight: 600; color: #6b7280; }
:deep(.ant-table-tbody > tr > td) { border-bottom: 1px solid rgba(0,0,0,0.03); vertical-align: middle; }
:deep(.ant-table-tbody > tr:hover > td) { background: rgba(243, 244, 246, 0.5) !important; }

.company-cell { display: flex; align-items: center; gap: 15px; }
.company-name { font-weight: 600; color: #374151; font-size: 0.95rem; }
.company-logo { background: #e0e7ff; color: #6366f1; border: 1px solid rgba(0,0,0,0.05); }

.vacancy-badge {
    background: #f3f4f6;
    color: #4b5563;
    font-weight: 700;
    padding: 4px 12px;
    border-radius: 20px;
    display: inline-block;
}

.empty-state { text-align: center; padding: 40px; color: #9ca3af; }
.empty-icon { font-size: 3rem; margin-bottom: 10px; display: block; opacity: 0.5; }

/* === MODAL STYLES === */
.ai-loading-state { text-align: center; padding: 40px; }
.ai-loading-state p { margin-top: 15px; color: #6b7280; }
.ai-content-box { font-size: 1rem; line-height: 1.6; color: #374151; padding: 10px; }
.markdown-body strong { color: #4f46e5; }

/* UTILS */
.mb-30 { margin-bottom: 30px; }
.mt-2 { margin-top: 8px; }
.fade-in { animation: fadeIn 0.8s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>