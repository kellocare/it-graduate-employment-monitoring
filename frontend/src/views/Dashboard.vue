<template>
  <div class="dashboard-container">
    <h2 class="page-title">📊 Аналитика трудоустройства</h2>

    <a-spin :spinning="loading">
      <!-- Карточки статистики -->
      <a-row :gutter="[16, 16]">
        <a-col :span="24" :md="8">
          <a-card class="stat-card blue">
            <a-statistic title="Всего выпускников" :value="stats.totalGrads" :value-style="{ color: '#fff' }" />
            <div class="desc">Зарегистрировано в системе</div>
          </a-card>
        </a-col>
        <a-col :span="24" :md="8">
          <a-card class="stat-card green">
             <a-statistic title="Трудоустроено" :value="stats.employmentRate" suffix="%" :value-style="{ color: '#fff' }" />
             <div class="desc">{{ stats.employedCount }} чел. имеют работу</div>
          </a-card>
        </a-col>
        <a-col :span="24" :md="8">
          <a-card class="stat-card orange">
            <a-statistic title="Средняя зарплата" :value="stats.avgSalary" :value-style="{ color: '#fff' }" />
            <div class="desc">По текущим данным (₽)</div>
          </a-card>
        </a-col>
      </a-row>

      <a-row :gutter="[16, 16]" class="mt-20">
        <!-- Топ компаний -->
        <a-col :span="24" :md="16">
          <a-card title="🏆 Топ работодателей" :bordered="false">
            <a-list item-layout="horizontal" :data-source="stats.topCompanies">
              <template #renderItem="{ item, index }">
                <a-list-item>
                  <a-list-item-meta :description="`${item.hire_count} выпускников`">
                    <template #title>
                      <span style="font-weight: bold">#{{ index + 1 }} {{ item.name }}</span>
                    </template>
                  </a-list-item-meta>
                </a-list-item>
              </template>
            </a-list>
          </a-card>
        </a-col>

        <!-- Инфо -->
        <a-col :span="24" :md="8">
          <a-card title="ℹ️ О системе" :bordered="false">
            <p>Система мониторинга помогает анализировать карьерный путь выпускников.</p>
            <a-progress type="circle" :percent="stats.employmentRate" :width="80" />
          </a-card>
        </a-col>
      </a-row>
    </a-spin>
  </div>
</template>

<script>
import api from '../axios';
export default {
  data() {
    return {
      stats: { totalGrads: 0, employedCount: 0, employmentRate: 0, avgSalary: 0, topCompanies: [] },
      loading: true
    }
  },
  async mounted() {
    try {
      const response = await api.get('/analytics');
      this.stats = response.data;
    } catch (e) { console.error(e); } finally { this.loading = false; }
  }
}
</script>

<style scoped>
.dashboard-container { max-width: 1200px; margin: 20px auto; padding: 0 20px; }
.page-title { margin-bottom: 20px; color: #333; }
.stat-card { border-radius: 8px; }
.stat-card :deep(.ant-statistic-title) { color: rgba(255,255,255,0.8) !important; }
.desc { color: rgba(255,255,255,0.7); margin-top: 5px; }
.blue { background: linear-gradient(135deg, #3498db, #2980b9); border: none; }
.green { background: linear-gradient(135deg, #2ecc71, #27ae60); border: none; }
.orange { background: linear-gradient(135deg, #f39c12, #d35400); border: none; }
.mt-20 { margin-top: 20px; }
</style>