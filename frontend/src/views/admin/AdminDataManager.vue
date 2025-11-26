<template>
  <div class="content-container fade-in-up">

    <!-- 🔒 ЭКРАН БЛОКИРОВКИ (AUTH DB) -->
    <div v-if="!isDbAuthenticated" class="auth-overlay">
      <div class="auth-box glass-panel">
        <div class="auth-icon-wrapper">
          <database-filled class="auth-icon" />
        </div>
        <h2>Connect to Database</h2>
        <p>Введите учетные данные для доступа к реестру</p>

        <a-form layout="vertical" class="auth-form">
          <a-form-item>
            <a-input v-model:value="dbAuth.username" placeholder="DB User" size="large">
              <template #prefix><user-outlined /></template>
            </a-input>
          </a-form-item>
          <a-form-item>
            <a-input-password v-model:value="dbAuth.password" placeholder="Password" size="large">
              <template #prefix><lock-outlined /></template>
            </a-input-password>
          </a-form-item>
          <a-button type="primary" size="large" block :loading="authLoading" @click="connectToDb">
            Подключиться
          </a-button>
        </a-form>
      </div>
    </div>

    <!-- 📂 ОСНОВНОЙ КОНТЕНТ (Виден только после входа) -->
    <template v-else>
      <div class="page-header">
        <div class="header-left">
          <h2><database-outlined class="icon-purple" /> Реестр данных</h2>
          <p class="sub-text">Прямой доступ к записям базы данных</p>
        </div>

        <div class="header-controls">
          <a-select
            v-model:value="currentTable"
            style="width: 240px"
            @change="loadTableData"
            show-search
            option-filter-prop="label"
            placeholder="Выберите таблицу"
          >
            <a-select-option v-for="table in tablesList" :key="table.value" :value="table.value" :label="table.label">
              <component :is="table.icon" style="margin-right: 8px; color: #6b7280;" />
              {{ table.label }}
            </a-select-option>
          </a-select>
          <a-button @click="loadTableData" :loading="loading"><reload-outlined /></a-button>
          <a-button danger @click="disconnectDb" title="Отключиться"><logout-outlined /></a-button>
        </div>
      </div>

      <div class="stats-bar glass-panel" v-if="data.length">
        <div class="stat-item"><span>Записей:</span> <strong>{{ data.length }}</strong></div>
        <div class="stat-item"><span>Колонки:</span> <strong>{{ columns.length }}</strong></div>
        <a-input-search v-model:value="searchText" placeholder="Фильтр..." style="width: 250px" />
      </div>

      <div class="glass-table-wrapper">
        <a-table
          :dataSource="filteredData"
          :columns="columns"
          :loading="loading"
          rowKey="id"
          :scroll="{ x: 1200 }"
          :pagination="{ pageSize: 10 }"
          size="middle"
        >
          <template #bodyCell="{ column, record, text }">
            <!-- ID -->
            <template v-if="column.key === 'id'">
               <a-tag color="purple" style="cursor: pointer" @click="copyId(text)">#{{ text }}</a-tag>
            </template>

            <!-- Boolean -->
            <template v-else-if="typeof text === 'boolean'">
               <a-tag :color="text ? 'success' : 'error'">{{ text ? 'TRUE' : 'FALSE' }}</a-tag>
            </template>

            <!-- Long Text -->
            <template v-else-if="(column.key === 'details' || column.key === 'description' || column.key === 'content' || (text && String(text).length > 40))">
               <a-popover title="Полный текст" trigger="click">
                 <template #content><div class="popover-content">{{ text }}</div></template>
                 <span class="truncated-text">{{ String(text).substring(0, 35) }}...</span>
               </a-popover>
            </template>

            <!-- Dates -->
            <template v-else-if="isDateKey(column.key)">
               <span class="date-text">{{ formatDate(text) }}</span>
            </template>

            <!-- ACTIONS -->
            <template v-else-if="column.key === 'actions'">
               <div class="row-actions">
                 <button class="btn-icon-edit" @click="openEditModal(record)"><edit-outlined /></button>
                 <a-popconfirm title="Удалить?" @confirm="deleteRecord(record.id)">
                   <button class="btn-icon-del"><delete-outlined /></button>
                 </a-popconfirm>
               </div>
            </template>

            <template v-else>{{ text }}</template>
          </template>
        </a-table>
      </div>
    </template>

    <!-- ✏️ МОДАЛКА РЕДАКТИРОВАНИЯ -->
    <a-modal
      v-model:open="editModalVisible"
      title="Редактирование записи"
      @ok="saveRecord"
      :confirmLoading="saveLoading"
      width="600px"
    >
      <a-form layout="vertical" class="edit-form-scroll">
        <div v-for="(val, key) in editForm" :key="key">
           <!-- ID и Даты не редактируем -->
           <template v-if="key !== 'id' && !key.includes('created_at') && !key.includes('updated_at')">

              <!-- Boolean -> Switch -->
              <a-form-item v-if="typeof val === 'boolean'" :label="formatLabel(key)">
                 <a-switch v-model:checked="editForm[key]" />
              </a-form-item>

              <!-- Длинный текст -> Textarea -->
              <a-form-item v-else-if="key === 'description' || key === 'details' || key === 'content' || (typeof val === 'string' && val.length > 50)" :label="formatLabel(key)">
                 <a-textarea v-model:value="editForm[key]" :rows="4" />
              </a-form-item>

              <!-- Остальное -> Input -->
              <a-form-item v-else :label="formatLabel(key)">
                 <a-input v-model:value="editForm[key]" />
              </a-form-item>

           </template>
        </div>
      </a-form>
    </a-modal>

  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import api from '../../axios';
import { message, notification } from 'ant-design-vue';
import {
  DatabaseOutlined, ReloadOutlined, DeleteOutlined, EditOutlined,
  UserOutlined, BankOutlined, FileTextOutlined, AppstoreOutlined,
  TeamOutlined, SendOutlined, MessageOutlined, ReadOutlined,
  StarOutlined, TagsOutlined, HistoryOutlined, BellOutlined,
  SafetyCertificateOutlined, IdcardOutlined, SolutionOutlined,
  DatabaseFilled, LockOutlined, LogoutOutlined
} from '@ant-design/icons-vue';

export default {
  components: {
    DatabaseOutlined, ReloadOutlined, DeleteOutlined, EditOutlined,
    UserOutlined, BankOutlined, FileTextOutlined, AppstoreOutlined,
    TeamOutlined, SendOutlined, MessageOutlined, ReadOutlined,
    StarOutlined, TagsOutlined, HistoryOutlined, BellOutlined,
    SafetyCertificateOutlined, IdcardOutlined, SolutionOutlined,
    DatabaseFilled, LockOutlined, LogoutOutlined
  },
  setup() {
    // Auth State
    const isDbAuthenticated = ref(false);
    const dbAuth = ref({ username: '', password: '' });
    const authLoading = ref(false);

    // Data State
    const currentTable = ref('users');
    const data = ref([]);
    const loading = ref(false);
    const searchText = ref('');

    // Edit State
    const editModalVisible = ref(false);
    const editForm = ref({});
    const saveLoading = ref(false);

    const tablesList = [
      { value: 'users', label: 'Пользователи (Login)', icon: 'UserOutlined' },
      {value: 'graduates', label: 'Студенты (Профили)', icon: 'IdcardOutlined'},
      {value: 'recruiters', label: 'Рекрутеры (Профили)', icon: 'SafetyCertificateOutlined'},
      {value: 'companies', label: 'Компании', icon: 'BankOutlined'},
      {value: 'vacancies', label: 'Вакансии', icon: 'AppstoreOutlined'},
      {value: 'resumes', label: 'Резюме', icon: 'FileTextOutlined'},
      {value: 'applications', label: 'Отклики', icon: 'SendOutlined'},
      {value: 'interviews', label: 'Собеседования', icon: 'SolutionOutlined'},
      {value: 'invitations', label: 'Приглашения', icon: 'TeamOutlined'},
      {value: 'reviews', label: 'Отзывы', icon: 'StarOutlined'},
      {value: 'news', label: 'Новости', icon: 'ReadOutlined'},
      {value: 'chat_messages', label: 'Чат (Сообщения)', icon: 'MessageOutlined'},
      {value: 'direct_messages', label: 'ЛС (Директ)', icon: 'MessageOutlined'},
      {value: 'notifications', label: 'Уведомления', icon: 'BellOutlined'},
      {value: 'audit_logs', label: 'Логи аудита', icon: 'HistoryOutlined'},
      {value: 'skills', label: 'Навыки', icon: 'TagsOutlined'},
      {value: 'specialties', label: 'Специальности', icon: 'TagsOutlined'},
      {value: 'competencies', label: 'Компетенции', icon: 'TagsOutlined'},
      {value: 'employment_records', label: 'Опыт работы', icon: 'HistoryOutlined'},
      {value: 'prof_standards', label: 'Проф. стандарты', icon: 'ReadOutlined'},
      {value: 'roadmap_history', label: 'Roadmap История', icon: 'HistoryOutlined'},
    ];

    // --- AUTH LOGIC ---
    const connectToDb = async () => {
      authLoading.value = true;
      try {
        // Вызываем endpoint проверки
        await api.post('/admin/tables/connect', dbAuth.value);

        // Имитация задержки для красоты
        setTimeout(() => {
            isDbAuthenticated.value = true;
            authLoading.value = false;
            // Попап успеха
            notification.success({
                message: 'Connection Established',
                description: 'Успешное подключение к базе данных.',
                placement: 'topRight',
                duration: 3
            });
            loadTableData();
        }, 800);
      } catch (e) {
        message.error('Ошибка подключения: Неверные данные');
        authLoading.value = false;
      }
    };

    const disconnectDb = () => {
        isDbAuthenticated.value = false;
        dbAuth.value = { username: '', password: '' };
        data.value = [];
    };

    // --- DATA LOGIC ---
    const loadTableData = async () => {
      loading.value = true;
      try {
        const r = await api.get(`/admin/tables/${currentTable.value}`);
        data.value = r.data;
      } catch (e) { message.error('Ошибка загрузки'); }
      finally { loading.value = false; }
    };

    const deleteRecord = async (id) => {
      try {
        await api.delete(`/admin/tables/${currentTable.value}/${id}`);
        data.value = data.value.filter(item => item.id !== id);
        message.success('Удалено');
      } catch (e) { message.error('Ошибка удаления (FK Constraint)'); }
    };

    // --- EDIT LOGIC ---
    const openEditModal = (record) => {
        // Клонируем объект, чтобы не менять таблицу сразу
        editForm.value = JSON.parse(JSON.stringify(record));
        editModalVisible.value = true;
    };

    const saveRecord = async () => {
        saveLoading.value = true;
        try {
            const res = await api.put(`/admin/tables/${currentTable.value}/${editForm.value.id}`, editForm.value);

            // Обновляем запись в локальной таблице
            const index = data.value.findIndex(item => item.id === editForm.value.id);
            if (index !== -1) {
                data.value[index] = res.data;
            }

            message.success('Запись обновлена');
            editModalVisible.value = false;
        } catch(e) {
            message.error('Ошибка сохранения');
        } finally {
            saveLoading.value = false;
        }
    };

    // --- HELPERS ---
    const columns = computed(() => {
      if (!data.value.length) return [];
      const keys = Object.keys(data.value[0]);
      const cols = keys.map(key => ({
        title: key.toUpperCase(), dataIndex: key, key: key,
        width: (key === 'id') ? 70 : 150, sorter: (a, b) => (a[key] > b[key] ? 1 : -1), ellipsis: true
      }));
      cols.push({ title: '', key: 'actions', fixed: 'right', width: 100 });
      return cols;
    });

    const filteredData = computed(() => {
      if (!searchText.value) return data.value;
      const lower = searchText.value.toLowerCase();
      return data.value.filter(item => Object.values(item).some(val => String(val).toLowerCase().includes(lower)));
    });

    const copyId = (text) => { navigator.clipboard.writeText(text); message.success('ID скопирован'); };
    const formatDate = (val) => val ? new Date(val).toLocaleString('ru-RU') : '—';
    const isDateKey = (key) => key.includes('created') || key.includes('updated') || key.includes('date');
    const formatLabel = (key) => key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');

    return {
      isDbAuthenticated, dbAuth, authLoading, connectToDb, disconnectDb,
      currentTable, tablesList, data, columns, loading, filteredData, searchText,
      editModalVisible, editForm, saveLoading, openEditModal, saveRecord,
      loadTableData, deleteRecord, copyId, formatDate, isDateKey, formatLabel
    };
  }
}
</script>

<style scoped>
/* GENERAL */
.content-container { max-width: 1400px; margin: 0 auto; position: relative; min-height: 80vh; }

/* AUTH OVERLAY */
.auth-overlay {
    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
    display: flex; justify-content: center; align-items: center;
    background: rgba(255,255,255,0.4); backdrop-filter: blur(8px);
    z-index: 100; border-radius: 20px;
}
.auth-box {
    background: white; padding: 40px; border-radius: 24px;
    box-shadow: 0 20px 50px rgba(0,0,0,0.1); width: 400px; text-align: center;
    border: 1px solid #fff;
}
.auth-icon-wrapper {
    width: 70px; height: 70px; background: #f3f0ff; border-radius: 50%;
    display: flex; justify-content: center; align-items: center; margin: 0 auto 20px;
}
.auth-icon { font-size: 32px; color: #7c3aed; }
.auth-box h2 { margin-bottom: 10px; color: #1f2937; }
.auth-box p { color: #6b7280; margin-bottom: 25px; }
.auth-form { text-align: left; }

/* HEADER & CONTROLS */
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; }
.header-left h2 { margin: 0; font-size: 1.8rem; display: flex; align-items: center; gap: 10px; color: #1f2937; }
.sub-text { color: #6b7280; margin: 5px 0 0 0; }
.icon-purple { color: #7c3aed; }
.header-controls { display: flex; gap: 10px; }

.glass-panel {
  background: rgba(255,255,255,0.6); backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.5); border-radius: 12px;
  padding: 15px 20px; margin-bottom: 20px;
  display: flex; align-items: center; gap: 20px; flex-wrap: wrap;
}
.stat-item { font-size: 0.9rem; color: #4b5563; }
.stat-item strong { color: #7c3aed; margin-left: 5px; }

.glass-table-wrapper {
  background: rgba(255,255,255,0.8); border-radius: 20px; padding: 20px;
  border: 1px solid #fff; box-shadow: 0 10px 30px rgba(0,0,0,0.05);
}

.truncated-text { color: #2563eb; cursor: help; border-bottom: 1px dashed #2563eb; }
.popover-content { max-width: 400px; max-height: 300px; overflow-y: auto; white-space: pre-wrap; font-size: 0.9rem; word-break: break-word; }
.date-text { font-size: 0.8rem; color: #6b7280; white-space: nowrap; }

/* ACTIONS */
.row-actions { display: flex; justify-content: center; gap: 8px; }
.btn-icon-edit { border: none; background: #eef2ff; color: #4f46e5; width: 28px; height: 28px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
.btn-icon-edit:hover { background: #4f46e5; color: white; }
.btn-icon-del { border: none; background: #fee2e2; color: #ef4444; width: 28px; height: 28px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
.btn-icon-del:hover { background: #ef4444; color: white; }

.edit-form-scroll { max-height: 60vh; overflow-y: auto; padding-right: 10px; }

.fade-in-up { animation: fadeInUp 0.5s ease forwards; }
@keyframes fadeInUp { from {opacity:0; transform:translateY(20px);} to {opacity:1; transform:translateY(0);} }
</style>