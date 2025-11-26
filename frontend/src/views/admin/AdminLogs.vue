<template>
  <div class="content-container fade-in-up">

    <!-- ЗАГОЛОВОК И ЭКСПОРТ -->
    <div class="page-header">
      <div class="header-left">
        <h2><history-outlined class="icon-purple" /> Журнал аудита</h2>
        <span class="log-count">{{ filteredLogs.length }} событий</span>
      </div>
      <div class="header-actions">
        <a-button @click="exportCSV" type="dashed"><download-outlined /> CSV</a-button>
        <a-button type="primary" @click="fetchLogs" :loading="loading"><reload-outlined /></a-button>
      </div>
    </div>

    <!-- ПАНЕЛЬ ФИЛЬТРОВ -->
    <div class="filters-bar glass-panel">
      <a-input
        v-model:value="searchText"
        placeholder="Поиск по деталям..."
        prefix-icon="search"
        allow-clear
        class="search-input"
      >
        <template #prefix><search-outlined /></template>
      </a-input>

      <a-select v-model:value="filterType" style="width: 200px" placeholder="Тип действия" allow-clear>
        <a-select-option value="ALL">Все действия</a-select-option>
        <a-select-option value="AUTH">Авторизация</a-select-option>
        <a-select-option value="CREATE">Создание</a-select-option>
        <a-select-option value="UPDATE">Обновление</a-select-option>
        <a-select-option value="DELETE">Удаление</a-select-option>
      </a-select>

      <a-range-picker v-model:value="dateRange" />
    </div>

    <!-- ТАБЛИЦА -->
    <div class="glass-table-wrapper">
      <a-table
        :dataSource="filteredLogs"
        :columns="columns"
        rowKey="id"
        :pagination="{ pageSize: 8 }"
        :loading="loading"
      >
        <!-- Слот: Администратор -->
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'admin'">
             <div class="admin-cell">
               <a-avatar :style="{ backgroundColor: stringToColor(record.admin_email || 'System') }" size="small">
                 {{ (record.admin_email || 'S')[0].toUpperCase() }}
               </a-avatar>
               <div class="admin-info">
                 <span class="admin-email">{{ record.admin_email || 'System Bot' }}</span>
                 <span class="admin-ip" v-if="record.ip">{{ record.ip }}</span>
               </div>
             </div>
          </template>

          <!-- Слот: Действие -->
          <template v-if="column.key === 'action'">
             <a-tag :color="getActionColor(record.action)" class="action-tag">
               <component :is="getActionIcon(record.action)" />
               {{ record.action }}
             </a-tag>
          </template>

          <!-- Слот: Детали -->
          <template v-if="column.key === 'details'">
             <span class="details-text">{{ truncate(record.details, 40) }}</span>
             <a v-if="record.details && record.details.length > 40" @click="openDetails(record)" class="more-link">подробнее</a>
          </template>

          <!-- Слот: Дата -->
          <template v-if="column.key === 'date'">
             <div class="date-cell">
               <span class="date-main">{{ new Date(record.created_at).toLocaleDateString() }}</span>
               <span class="date-sub">{{ new Date(record.created_at).toLocaleTimeString() }}</span>
             </div>
          </template>
        </template>
      </a-table>
    </div>

    <!-- МОДАЛКА ДЕТАЛЕЙ -->
    <a-modal v-model:open="detailsVisible" title="Детали события" :footer="null">
      <div v-if="selectedLog" class="log-details-view">
        <p><strong>ID события:</strong> {{ selectedLog.id }}</p>
        <p><strong>Инициатор:</strong> {{ selectedLog.admin_email }}</p>
        <p><strong>Действие:</strong> {{ selectedLog.action }}</p>
        <a-divider />
        <div class="json-box">
          {{ selectedLog.details }}
        </div>
      </div>
    </a-modal>

  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue';
import api from '../../axios';
import {
  HistoryOutlined, ReloadOutlined, SearchOutlined, DownloadOutlined,
  DeleteOutlined, EditOutlined, LoginOutlined, PlusCircleOutlined, InfoCircleOutlined,
  ThunderboltOutlined
} from '@ant-design/icons-vue';

export default {
  components: {
    HistoryOutlined, ReloadOutlined, SearchOutlined, DownloadOutlined,
    DeleteOutlined, EditOutlined, LoginOutlined, PlusCircleOutlined, InfoCircleOutlined,
    ThunderboltOutlined
  },
  setup() {
    const logs = ref([]);
    const loading = ref(false);
    const searchText = ref('');
    const filterType = ref(null);
    const dateRange = ref([]);

    // Для модалки
    const detailsVisible = ref(false);
    const selectedLog = ref(null);

    const columns = [
      { title: 'Администратор', key: 'admin', width: '25%' },
      { title: 'Действие', key: 'action', width: '20%' },
      { title: 'Детали', key: 'details' },
      { title: 'Время', key: 'date', width: '150px', align: 'right' }
    ];

    const fetchLogs = async () => {
      loading.value = true;
      try {
        const r = await api.get('/admin/logs');
        logs.value = r.data;
      } catch(e){
        // Если API нет, можно заглушку для теста:
        // logs.value = mockLogs;
      } finally {
        loading.value = false;
      }
    };

    // Фильтрация на клиенте (для мгновенного отклика)
    const filteredLogs = computed(() => {
      return logs.value.filter(log => {
        // 1. Поиск
        const matchesSearch = !searchText.value ||
          (log.details && log.details.toLowerCase().includes(searchText.value.toLowerCase())) ||
          (log.admin_email && log.admin_email.toLowerCase().includes(searchText.value.toLowerCase()));

        // 2. Тип действия
        const matchesType = !filterType.value || filterType.value === 'ALL' || log.action.includes(filterType.value);

        // 3. Даты (если нужно, можно раскомментировать логику dayjs)
        // const matchesDate = ...

        return matchesSearch && matchesType;
      });
    });

    // Визуальные хелперы
    const getActionColor = (act) => {
      if (act.includes('DELETE')) return 'error';     // Красный
      if (act.includes('REJECT')) return 'warning';   // Оранжевый
      if (act.includes('CREATE')) return 'success';   // Зеленый
      if (act.includes('AUTH')) return 'processing';  // Синий
      if (act.includes('UPDATE')) return 'purple';    // Фиолетовый
      return 'default';
    };

    const getActionIcon = (act) => {
      if (act.includes('DELETE')) return 'DeleteOutlined';
      if (act.includes('REJECT')) return 'InfoCircleOutlined';
      if (act.includes('CREATE')) return 'PlusCircleOutlined';
      if (act.includes('AUTH')) return 'LoginOutlined';
      if (act.includes('UPDATE')) return 'EditOutlined';
      return 'ThunderboltOutlined';
    };

    const stringToColor = (str) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) { hash = str.charCodeAt(i) + ((hash << 5) - hash); }
      const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
      return '#' + '00000'.substring(0, 6 - c.length) + c;
    };

    const truncate = (str, n) => {
      return (str && str.length > n) ? str.substr(0, n - 1) + '...' : str;
    };

    const openDetails = (record) => {
      selectedLog.value = record;
      detailsVisible.value = true;
    };

    const exportCSV = () => {
      // Простая генерация CSV из текущих данных
      const headers = ['ID,Admin,Action,Date,Details'];
      const rows = filteredLogs.value.map(l =>
        `${l.id},${l.admin_email},${l.action},${l.created_at},"${l.details.replace(/"/g, '""')}"`
      );
      const csvContent = "data:text/csv;charset=utf-8," + headers.concat(rows).join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "system_logs.csv");
      document.body.appendChild(link);
      link.click();
    };

    onMounted(fetchLogs);

    return {
      logs, filteredLogs, columns, loading,
      searchText, filterType, dateRange,
      fetchLogs, getActionColor, getActionIcon, stringToColor, truncate,
      detailsVisible, selectedLog, openDetails, exportCSV
    };
  }
}
</script>

<style scoped>
.content-container { max-width: 1100px; margin: 0 auto; }
.page-header { display: flex; justify-content: space-between; margin-bottom: 25px; align-items: center; }
.header-left { display: flex; align-items: baseline; gap: 15px; }
.log-count { color: #9ca3af; font-size: 0.9rem; }
.icon-purple { color: #7c3aed; margin-right: 10px; }

/* Панель фильтров */
.glass-panel {
  background: rgba(255,255,255,0.6);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 15px 20px;
  margin-bottom: 20px;
  display: flex;
  gap: 15px;
  align-items: center;
  border: 1px solid rgba(255,255,255,0.5);
  flex-wrap: wrap;
}
.search-input { flex: 1; min-width: 200px; }

/* Таблица */
.glass-table-wrapper {
  background: rgba(255,255,255,0.7);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 20px;
  border: 1px solid rgba(255,255,255,0.8);
  box-shadow: 0 10px 30px rgba(0,0,0,0.05);
}

.admin-cell { display: flex; align-items: center; gap: 10px; }
.admin-info { display: flex; flex-direction: column; line-height: 1.2; }
.admin-email { font-weight: 600; color: #374151; }
.admin-ip { font-size: 0.75rem; color: #9ca3af; }

.action-tag { display: inline-flex; align-items: center; gap: 5px; border-radius: 6px; padding: 2px 10px; font-weight: 600; }

.date-cell { display: flex; flex-direction: column; text-align: right; }
.date-main { color: #374151; font-weight: 500; }
.date-sub { color: #9ca3af; font-size: 0.8rem; }

.more-link { margin-left: 8px; font-size: 0.85rem; }
.json-box {
  background: #f3f4f6;
  padding: 15px;
  border-radius: 8px;
  font-family: monospace;
  white-space: pre-wrap;
  color: #4b5563;
  max-height: 300px;
  overflow-y: auto;
}

.fade-in-up { animation: fadeInUp 0.5s ease forwards; }
@keyframes fadeInUp { from {opacity:0; transform:translateY(20px);} to {opacity:1; transform:translateY(0);} }
</style>