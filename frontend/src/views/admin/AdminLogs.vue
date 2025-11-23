<template>
  <div class="content-container fade-in-up">
    <div class="page-header">
      <h2><history-outlined class="icon-purple" /> Журнал действий</h2>
      <a-button @click="fetchLogs"><reload-outlined /></a-button>
    </div>

    <div class="glass-table-wrapper">
      <a-table :dataSource="logs" :columns="columns" rowKey="id" :pagination="{ pageSize: 10 }">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'admin'">
             <span class="admin-badge">{{ record.admin_email || 'System' }}</span>
          </template>
          <template v-if="column.key === 'action'">
             <a-tag :color="getActionColor(record.action)">{{ record.action }}</a-tag>
          </template>
          <template v-if="column.key === 'date'">
             {{ new Date(record.created_at).toLocaleString() }}
          </template>
        </template>
      </a-table>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import api from '../../axios';
import { HistoryOutlined, ReloadOutlined } from '@ant-design/icons-vue';

export default {
  components: { HistoryOutlined, ReloadOutlined },
  setup() {
    const logs = ref([]);
    const columns = [
      { title: 'Администратор', key: 'admin' },
      { title: 'Действие', key: 'action' },
      { title: 'Детали', dataIndex: 'details' },
      { title: 'Дата', key: 'date', width: 200 }
    ];

    const fetchLogs = async () => {
      try { const r = await api.get('/admin/logs'); logs.value = r.data; } catch(e){}
    };

    const getActionColor = (act) => {
      if (act.includes('DELETE')) return 'red';
      if (act.includes('REJECT')) return 'orange';
      return 'blue';
    };

    onMounted(fetchLogs);
    return { logs, columns, fetchLogs, getActionColor };
  }
}
</script>

<style scoped>
.content-container { max-width: 1000px; margin: 0 auto; }
.page-header { display: flex; justify-content: space-between; margin-bottom: 20px; align-items: center; }
.glass-table-wrapper { background: rgba(255,255,255,0.7); backdrop-filter: blur(15px); border-radius: 20px; padding: 20px; border: 1px solid #fff; }
.admin-badge { font-weight: 600; color: #4b5563; }
.icon-purple { color: #7c3aed; margin-right: 10px; }
.fade-in-up { animation: fadeInUp 0.5s ease forwards; }
@keyframes fadeInUp { from {opacity:0; transform:translateY(20px);} to {opacity:1; transform:translateY(0);} }
</style>