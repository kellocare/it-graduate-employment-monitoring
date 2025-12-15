<template>
  <div class="page-wrapper">
    <!-- ФОН -->
    <div class="blobs-container">
      <div class="blob blob-1"></div>
      <div class="blob blob-2"></div>
    </div>

    <!-- 1. ЭКРАН БЛОКИРОВКИ -->
    <div v-if="!isDbAuthenticated" class="auth-overlay fade-in">
      <div class="auth-box glass-panel">
        <div class="auth-icon-wrapper">
          <database-filled class="auth-icon" />
        </div>
        <h2>База Данных</h2>
        <p>Введите ключ доступа для прямого управления реестром.</p>

        <a-form layout="vertical" class="auth-form" ref="authFormRef" :model="dbAuth" :rules="authRules">
          <a-form-item name="username" has-feedback>
            <a-input
              v-model:value="dbAuth.username"
              placeholder="Пользователь БД"
              size="large"
              @keyup.enter="connectToDb"
            >
              <template #prefix><user-outlined style="color: #9ca3af" /></template>
            </a-input>
          </a-form-item>
          <a-form-item name="password" has-feedback>
            <a-input-password
              v-model:value="dbAuth.password"
              placeholder="Пароль доступа"
              size="large"
              @keyup.enter="connectToDb"
            >
              <template #prefix><lock-outlined style="color: #9ca3af" /></template>
            </a-input-password>
          </a-form-item>
          <a-button
            type="primary"
            size="large"
            block
            :loading="authLoading"
            @click="connectToDb"
            class="btn-connect"
          >
            Подключиться
          </a-button>
        </a-form>
      </div>
    </div>

    <!-- 2. ОСНОВНОЙ КОНТЕНТ -->
    <div v-else class="content-container fade-in-up">
        <!-- ШАПКА -->
        <div class="page-header">
          <div class="header-left">
            <h2><database-outlined class="icon-purple" /> Реестр данных</h2>
            <p class="sub-text">Прямой SQL-доступ к таблицам (PostgreSQL)</p>
          </div>

          <div class="header-controls">
            <a-select
              v-model:value="currentTable"
              style="width: 280px"
              @change="loadTableData"
              show-search
              option-filter-prop="label"
              placeholder="Выберите таблицу"
              class="table-select"
            >
              <a-select-option v-for="table in tablesList" :key="table.value" :value="table.value" :label="table.label">
                <component :is="table.icon" style="margin-right: 8px; color: #6b7280;" />
                {{ table.label }}
              </a-select-option>
            </a-select>

            <a-tooltip title="Обновить">
                <button class="btn-icon" @click="loadTableData"><reload-outlined :spin="loading" /></button>
            </a-tooltip>

            <a-tooltip title="Отключиться">
                <button class="btn-icon danger" @click="disconnectDb"><logout-outlined /></button>
            </a-tooltip>
          </div>
        </div>

        <!-- СТАТИСТИКА -->
        <div class="stats-bar glass-panel" v-if="columns.length">
          <div class="stat-group">
              <div class="stat-item"><table-outlined /> Таблица: <strong>{{ currentTable }}</strong></div>
              <div class="stat-item"><bars-outlined /> Записей: <strong>{{ data.length }}</strong></div>
          </div>
          <a-input-search v-model:value="searchText" placeholder="Поиск по значениям..." style="width: 300px" />
        </div>

        <!-- ТАБЛИЦА -->
        <div class="glass-table-wrapper">
          <a-table
            :dataSource="filteredData"
            :columns="columns"
            :loading="loading"
            rowKey="id"
            :scroll="{ x: 1300, y: 600 }"
            :pagination="{ pageSize: 15 }"
            size="middle"
            class="db-table"
          >
            <template #bodyCell="{ column, record, text }">
              <!-- !!! ВАЖНО: ПРОВЕРКА ДЕЙСТВИЙ ТЕПЕРЬ ПЕРВАЯ !!! -->
              <template v-if="column.key === 'actions'">
                 <div class="row-actions">
                   <a-tooltip title="Редактировать">
                     <button class="action-mini edit" @click.stop="openEditModal(record)">
                       <edit-outlined />
                     </button>
                   </a-tooltip>
                   <a-popconfirm
                     title="Удалить запись навсегда?"
                     @confirm="deleteRecord(record.id)"
                     ok-text="Да"
                     cancel-text="Нет"
                     placement="topRight"
                   >
                     <button class="action-mini delete"><delete-outlined /></button>
                   </a-popconfirm>
                 </div>
              </template>

              <!-- ID -->
              <template v-else-if="column.key === 'id'">
                 <span class="id-tag" @click="copyId(text)">#{{ text }}</span>
              </template>

              <!-- Boolean -->
              <template v-else-if="typeof text === 'boolean'">
                 <a-tag :color="text ? 'success' : 'error'">{{ text ? 'TRUE' : 'FALSE' }}</a-tag>
              </template>

              <!-- JSON (Проверка идет ПОСЛЕ Actions) -->
              <template v-else-if="typeof text === 'object' && text !== null">
                  <a-popover title="JSON Data" trigger="click" overlayClassName="wide-popover">
                     <template #content>
                         <div class="json-preview-container">
                            <pre class="json-preview">{{ JSON.stringify(text, null, 2) }}</pre>
                         </div>
                     </template>
                     <span class="json-link">{ JSON }</span>
                  </a-popover>
              </template>

              <!-- Long Text -->
              <template v-else-if="isLongText(column.key, text)">
                 <a-popover title="Полный текст" trigger="click" overlayClassName="wide-popover">
                   <template #content><div class="popover-content">{{ text }}</div></template>
                   <span class="truncated-text">{{ String(text).substring(0, 40) }}...</span>
                 </a-popover>
              </template>

              <!-- Dates -->
              <template v-else-if="isDateKey(column.key)">
                 <span class="date-text">{{ formatDate(text) }}</span>
              </template>

              <template v-else>{{ text }}</template>
            </template>
          </a-table>
        </div>
    </div>

    <!-- МОДАЛКА РЕДАКТИРОВАНИЯ -->
    <a-modal
      v-model:open="editModalVisible"
      :title="null"
      :footer="null"
      width="650px"
      centered
      wrap-class-name="glass-modal-wrapper"
    >
      <div class="custom-modal-content">
        <!-- Шапка модалки -->
        <div class="modal-header">
          <div class="modal-icon">
            <edit-outlined />
          </div>
          <div class="modal-title-box">
             <h3>Редактирование записи</h3>
             <p>Таблица: {{ currentTable }} | ID: #{{ editForm.id }}</p>
          </div>
        </div>

        <!-- Форма -->
        <a-form layout="vertical" class="edit-form-scroll" ref="editFormRef" :model="editForm" :rules="editRules">
          <a-row :gutter="16">
            <a-col :span="24" v-for="(val, key) in editForm" :key="key">
               <template v-if="!isSystemField(key)">
                  <!-- Boolean -->
                  <a-form-item v-if="typeof val === 'boolean'" :label="formatLabel(key)" class="styled-form-item">
                     <div class="switch-wrapper">
                       <a-switch v-model:checked="editForm[key]" checked-children="TRUE" un-checked-children="FALSE" />
                       <span class="switch-label">{{ editForm[key] ? 'Активно' : 'Неактивно' }}</span>
                     </div>
                  </a-form-item>

                  <!-- TextArea -->
                  <a-form-item
                    v-else-if="isTextArea(key, val)"
                    :label="formatLabel(key)"
                    class="styled-form-item"
                    :name="key"
                  >
                     <a-textarea v-model:value="editForm[key]" :rows="4" class="custom-input" />
                  </a-form-item>

                  <!-- JSON (Как текст для чтения, чтобы не ломать верстку) -->
                  <a-form-item v-else-if="typeof val === 'object' && val !== null" :label="formatLabel(key) + ' (JSON)'" class="styled-form-item">
                      <div class="json-read-only">
                        <pre>{{ JSON.stringify(val, null, 2) }}</pre>
                      </div>
                  </a-form-item>

                  <!-- Standard Input -->
                  <a-form-item
                    v-else
                    :label="formatLabel(key)"
                    class="styled-form-item"
                    :name="key"
                    :rules="getFieldRules(key, val)"
                  >
                     <a-input v-model:value="editForm[key]" class="custom-input" size="large" />
                  </a-form-item>
               </template>
            </a-col>
          </a-row>
        </a-form>

        <!-- Футер -->
        <div class="modal-footer-custom">
           <a-button size="large" @click="editModalVisible = false" class="btn-cancel">Отмена</a-button>
           <a-button type="primary" size="large" :loading="saveLoading" @click="saveRecord" class="btn-save">
             <save-outlined /> Сохранить изменения
           </a-button>
        </div>
      </div>
    </a-modal>

  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import api from '../../axios';
import { message } from 'ant-design-vue';
import {
  DatabaseOutlined, ReloadOutlined, DeleteOutlined, EditOutlined,
  UserOutlined, BankOutlined, FileTextOutlined, AppstoreOutlined,
  TeamOutlined, SendOutlined, MessageOutlined, ReadOutlined,
  StarOutlined, TagsOutlined, HistoryOutlined, BellOutlined,
  SafetyCertificateOutlined, IdcardOutlined, SolutionOutlined,
  DatabaseFilled, LockOutlined, LogoutOutlined, TableOutlined, BarsOutlined,
  FilePdfOutlined, SaveOutlined, CheckCircleOutlined
} from '@ant-design/icons-vue';

export default {
  components: {
    DatabaseOutlined, ReloadOutlined, DeleteOutlined, EditOutlined,
    UserOutlined, BankOutlined, FileTextOutlined, AppstoreOutlined,
    TeamOutlined, SendOutlined, MessageOutlined, ReadOutlined,
    StarOutlined, TagsOutlined, HistoryOutlined, BellOutlined,
    SafetyCertificateOutlined, IdcardOutlined, SolutionOutlined,
    DatabaseFilled, LockOutlined, LogoutOutlined, TableOutlined, BarsOutlined,
    FilePdfOutlined, SaveOutlined, CheckCircleOutlined
  },
  setup() {
    // --- AUTH ---
    const isDbAuthenticated = ref(false);
    const dbAuth = ref({ username: '', password: '' });
    const authLoading = ref(false);
    const authFormRef = ref();

    // Правила валидации для формы авторизации
    const authRules = {
      username: [
        { required: true, message: 'Введите имя пользователя БД', trigger: 'blur' },
        { min: 2, message: 'Минимум 2 символа', trigger: 'blur' },
        {
          validator: (rule, value) => {
            // Запрет на подключение под root-пользователями
            const restrictedUsers = ['root', 'postgres', 'admin'];
            if (restrictedUsers.includes(value?.toLowerCase())) {
              return Promise.reject('Невозможно подключиться к суперпользователю');
            }
            return Promise.resolve();
          },
          trigger: 'blur'
        }
      ],
      password: [
        { required: true, message: 'Введите пароль', trigger: 'blur' },
        { min: 1, message: 'Пароль не может быть пустым', trigger: 'blur' }
      ]
    };

    // --- DATA ---
    const currentTable = ref('users');
    const data = ref([]);
    const loading = ref(false);
    const searchText = ref('');

    // --- EDIT ---
    const editModalVisible = ref(false);
    const editForm = ref({});
    const saveLoading = ref(false);
    const editFormRef = ref();

    // Правила валидации для формы редактирования
    const editRules = {
      email: [
        { required: true, message: 'Введите email', trigger: 'blur' },
        { type: 'email', message: 'Некорректный email', trigger: 'blur' }
      ],
      name: [
        { required: true, message: 'Введите имя', trigger: 'blur' },
        { min: 2, message: 'Минимум 2 символа', trigger: 'blur' }
      ],
      status: [
        { required: true, message: 'Выберите статус', trigger: 'change' }
      ]
    };

    // Список таблиц
    const tablesList = [
      { value: 'users', label: 'Users (Auth)', icon: 'UserOutlined' },
      { value: 'graduates', label: 'Студенты', icon: 'IdcardOutlined' },
      { value: 'recruiters', label: 'Рекрутеры', icon: 'SafetyCertificateOutlined' },
      { value: 'university_staff', label: 'Сотрудники ВУЗа', icon: 'BankOutlined' },
      { value: 'companies', label: 'Компании', icon: 'BankOutlined' },
      { value: 'vacancies', label: 'Вакансии', icon: 'AppstoreOutlined' },
      { value: 'applications', label: 'AI Отклики (Тесты)', icon: 'SolutionOutlined' },
      { value: 'job_applications', label: 'Простые отклики', icon: 'SendOutlined' },
      { value: 'university_reports', label: 'Отчеты ВУЗа', icon: 'FilePdfOutlined' },
      { value: 'resumes', label: 'Резюме (PDF)', icon: 'FileTextOutlined' },
      { value: 'interviews', label: 'Собеседования', icon: 'SolutionOutlined' },
      { value: 'invitations', label: 'Приглашения', icon: 'TeamOutlined' },
      { value: 'reviews', label: 'Отзывы', icon: 'StarOutlined' },
      { value: 'news', label: 'Новости', icon: 'ReadOutlined' },
      { value: 'chat_messages', label: 'Сообщения (Чат)', icon: 'MessageOutlined' },
      { value: 'notifications', label: 'Уведомления', icon: 'BellOutlined' },
      { value: 'audit_logs', label: 'Логи системы', icon: 'HistoryOutlined' },
      { value: 'roadmap_history', label: 'История Roadmap', icon: 'HistoryOutlined' },
      { value: 'skills', label: 'Справочник: Навыки', icon: 'TagsOutlined' },
      { value: 'specialties', label: 'Справочник: Спец-ти', icon: 'TagsOutlined' },
    ];

    // --- METHODS ---
    const connectToDb = async () => {
      try {
        // Валидация формы перед отправкой
        await authFormRef.value.validate();

        authLoading.value = true;

        // Имитация запроса к API (в реальном проекте здесь будет вызов API)
        setTimeout(() => {
          // Проверка валидности данных (в реальном проекте это делается на сервере)
          if (!dbAuth.value.username || !dbAuth.value.password) {
            message.error('Введите данные для входа');
            authLoading.value = false;
            return;
          }

          // Проверка на root-пользователей (дополнительная проверка на клиенте)
          const restrictedUsers = ['root', 'postgres', 'admin'];
          if (restrictedUsers.includes(dbAuth.value.username.toLowerCase())) {
            message.error('Невозможно подключиться к суперпользователю');
            authLoading.value = false;
            return;
          }

          // Имитация успешного подключения
          // В реальном проекте здесь будет:
          // const response = await api.post('/admin/connect', dbAuth.value);
          // if (response.data.success) { ... }

          isDbAuthenticated.value = true;
          message.success('Соединение установлено');
          loadTableData();
          authLoading.value = false;
        }, 800);
      } catch (error) {
        // Ошибки валидации уже отображены в форме
        authLoading.value = false;
      }
    };

    const disconnectDb = () => {
        isDbAuthenticated.value = false;
        dbAuth.value = { username: '', password: '' };
        data.value = [];
        message.info('Отключено от базы данных');
    };

    const loadTableData = async () => {
      loading.value = true;
      try {
        const r = await api.get(`/admin/tables/${currentTable.value}`);
        data.value = r.data;
      } catch (e) {
        message.error('Ошибка загрузки таблицы.');
      } finally {
        loading.value = false;
      }
    };

    const deleteRecord = async (id) => {
      try {
        await api.delete(`/admin/tables/${currentTable.value}/${id}`);
        data.value = data.value.filter(item => item.id !== id);
        message.success('Запись удалена');
      } catch (e) {
        message.error('Не удалось удалить запись');
      }
    };

    const openEditModal = (record) => {
        editForm.value = JSON.parse(JSON.stringify(record));
        editModalVisible.value = true;
    };

    const saveRecord = async () => {
      try {
        // Валидация формы перед сохранением
        await editFormRef.value.validate();

        saveLoading.value = true;
        try {
            const res = await api.put(`/admin/tables/${currentTable.value}/${editForm.value.id}`, editForm.value);
            const index = data.value.findIndex(item => item.id === editForm.value.id);
            if (index !== -1) {
              data.value[index] = res.data;
            }
            message.success('Сохранено');
            editModalVisible.value = false;
        } catch(e) {
            message.error('Ошибка сохранения');
        } finally {
            saveLoading.value = false;
        }
      } catch (error) {
        // Ошибки валидации уже отображены в форме
      }
    };

    // Динамические правила валидации для полей
    const getFieldRules = (key, value) => {
      const rules = [];

      // Обязательные поля в зависимости от таблицы
      if (currentTable.value === 'users') {
        if (key === 'email') {
          rules.push({ required: true, message: 'Email обязателен', trigger: 'blur' });
          rules.push({ type: 'email', message: 'Некорректный email', trigger: 'blur' });
        }
        if (key === 'role') {
          rules.push({ required: true, message: 'Роль обязательна', trigger: 'change' });
        }
      }

      if (currentTable.value === 'graduates') {
        if (key === 'full_name') {
          rules.push({ required: true, message: 'ФИО обязательно', trigger: 'blur' });
        }
        if (key === 'graduation_year') {
          rules.push({
            validator: (rule, val) => {
              const year = parseInt(val);
              const currentYear = new Date().getFullYear();
              if (isNaN(year) || year < 2000 || year > currentYear + 5) {
                return Promise.reject('Некорректный год выпуска');
              }
              return Promise.resolve();
            },
            trigger: 'blur'
          });
        }
      }

      // Проверка на уникальность email
      if (key === 'email') {
        rules.push({
          validator: (rule, val) => {
            if (!val) return Promise.resolve();
            // Проверка формата email
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(val)) {
              return Promise.reject('Некорректный формат email');
            }
            return Promise.resolve();
          },
          trigger: 'blur'
        });
      }

      return rules;
    };

    // --- COMPUTED & HELPERS ---
    const columns = computed(() => {
      if (!data.value.length) return [];
      const keys = Object.keys(data.value[0]);
      const cols = keys.map(key => ({
        title: key,
        dataIndex: key,
        key: key,
        width: (key === 'id') ? 80 : 180,
        sorter: (a, b) => (a[key] > b[key] ? 1 : -1),
        ellipsis: true
      }));
      // Добавляем колонку действий ЯВНО
      cols.push({ title: 'Действия', key: 'actions', fixed: 'right', width: 110, align: 'center' });
      return cols;
    });

    const filteredData = computed(() => {
      if (!searchText.value) return data.value;
      const lower = searchText.value.toLowerCase();
      return data.value.filter(item =>
        Object.values(item).some(val => String(val).toLowerCase().includes(lower))
      );
    });

    const copyId = (text) => { navigator.clipboard.writeText(text); message.success('ID скопирован'); };
    const formatDate = (val) => val ? new Date(val).toLocaleString('ru-RU') : '—';
    const isDateKey = (key) => ['created_at', 'updated_at', 'date', 'birth_date', 'last_seen'].includes(key);
    const isSystemField = (key) => ['id', 'created_at', 'updated_at'].includes(key);
    const isLongText = (key, val) => ['description', 'content', 'details', 'about_me', 'ai_feedback'].includes(key) || (val && String(val).length > 50);
    const isTextArea = (key, val) => isLongText(key, val);
    const formatLabel = (key) => key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');

    return {
      isDbAuthenticated, dbAuth, authLoading, connectToDb, disconnectDb,
      currentTable, tablesList, data, columns, loading, filteredData, searchText,
      editModalVisible, editForm, saveLoading, openEditModal, saveRecord,
      loadTableData, deleteRecord, copyId, formatDate, isDateKey, formatLabel,
      isSystemField, isTextArea, isLongText, authFormRef, editFormRef,
      authRules, editRules, getFieldRules
    };
  }
}
</script>

<style scoped>
/* Анимации */
.fade-in { animation: fadeIn 0.5s ease forwards; }
@keyframes fadeIn { from {opacity:0} to {opacity:1} }
.fade-in-up { animation: fadeInUp 0.5s ease forwards; }
@keyframes fadeInUp { from {opacity:0; transform:translateY(20px);} to {opacity:1; transform:translateY(0);} }

/* Общая разметка */
.page-wrapper { min-height: 100vh; background: #f3f4f6; position: relative; display: flex; justify-content: center; padding: 40px; }
.blobs-container { position: absolute; inset: 0; z-index: 0; pointer-events: none; }
.blob { position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.5; }
.blob-1 { width: 500px; height: 500px; background: #c4b5fd; top: -100px; left: -100px; }
.blob-2 { width: 400px; height: 400px; background: #93c5fd; bottom: -100px; right: -100px; }

.content-container { position: relative; z-index: 1; width: 100%; max-width: 1400px; min-height: 600px; }

/* Auth */
.auth-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 80vh; display: flex; justify-content: center; align-items: center; z-index: 100; }
.auth-box { background: rgba(255,255,255,0.8); backdrop-filter: blur(20px); padding: 50px; border-radius: 24px; box-shadow: 0 20px 60px rgba(0,0,0,0.1); width: 420px; text-align: center; border: 1px solid rgba(255,255,255,0.6); }
.auth-icon-wrapper { width: 80px; height: 80px; background: #f3f0ff; border-radius: 50%; display: flex; justify-content: center; align-items: center; margin: 0 auto 20px; box-shadow: 0 0 20px rgba(124, 58, 237, 0.2); }
.auth-icon { font-size: 36px; color: #7c3aed; }
.btn-connect { background: linear-gradient(135deg, #7c3aed, #6366f1); border: none; font-weight: 700; height: 45px; margin-top: 10px; }

/* Header */
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; background: white; padding: 20px 30px; border-radius: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.03); }
.header-left h2 { font-size: 1.6rem; font-weight: 800; display: flex; align-items: center; gap: 10px; color: #1f2937; margin: 0; }
.sub-text { color: #6b7280; margin: 5px 0 0 0; }
.icon-purple { color: #7c3aed; }
.header-controls { display: flex; gap: 10px; align-items: center; }
.btn-icon { width: 40px; height: 40px; border-radius: 10px; border: 1px solid #e5e7eb; background: white; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #4b5563; transition: 0.2s; }
.btn-icon:hover { border-color: #7c3aed; color: #7c3aed; }
.btn-icon.danger:hover { border-color: #ef4444; color: #ef4444; background: #fef2f2; }

/* Stats */
.stats-bar { background: rgba(255,255,255,0.7); backdrop-filter: blur(15px); padding: 15px 25px; border-radius: 16px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; border: 1px solid rgba(255,255,255,0.5); }
.stat-group { display: flex; gap: 20px; }
.stat-item { font-size: 0.9rem; color: #4b5563; display: flex; align-items: center; gap: 8px; }

/* Table */
.glass-table-wrapper { background: rgba(255,255,255,0.9); border-radius: 20px; padding: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); border: 1px solid white; overflow: hidden; }
:deep(.ant-table-thead > tr > th) { background: #f9fafb; font-weight: 700; color: #374151; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.5px; }

.id-tag { font-family: monospace; font-weight: 700; color: #7c3aed; background: #f3f0ff; padding: 2px 6px; border-radius: 4px; cursor: pointer; }
.json-link { color: #d97706; cursor: pointer; font-family: monospace; font-weight: 700; padding: 2px 6px; background: #fffbeb; border-radius: 4px; }
.truncated-text { color: #2563eb; cursor: help; border-bottom: 1px dashed #2563eb; }

/* POPUP FONT FIXES */
.json-preview-container {
    max-width: 500px;
}
.json-preview {
    background: #1e293b;
    color: #cbd5e1;
    padding: 10px;
    border-radius: 8px;
    font-size: 0.8rem;
    max-height: 400px;
    overflow: auto;
    /* ФИКС ДЛЯ ДЛИННЫХ СТРОК: */
    white-space: pre-wrap;
    word-break: break-word;
}
.popover-content {
    max-width: 400px;
    max-height: 300px;
    overflow: auto;
    white-space: pre-wrap;
    word-break: break-word;
}

/* Actions */
.row-actions { display: flex; gap: 8px; justify-content: center; min-width: 70px; }
.action-mini { width: 32px; height: 32px; border-radius: 8px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
.action-mini.edit { background: #eff6ff; color: #3b82f6; }
.action-mini.edit:hover { background: #3b82f6; color: white; transform: translateY(-2px); }
.action-mini.delete { background: #fff1f2; color: #f43f5e; }
.action-mini.delete:hover { background: #f43f5e; color: white; transform: translateY(-2px); }

/* Modal */
:deep(.glass-modal-wrapper .ant-modal-content) { background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(20px); border-radius: 24px; padding: 0; border: 1px solid rgba(255,255,255,0.8); box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15); }
:deep(.glass-modal-wrapper .ant-modal-close) { top: 20px; right: 20px; color: #9ca3af; }
.modal-header { background: linear-gradient(to right, #f9fafb, #ffffff); padding: 24px 30px; border-bottom: 1px solid #f3f4f6; border-radius: 24px 24px 0 0; display: flex; align-items: center; gap: 15px; }
.modal-icon { width: 48px; height: 48px; background: #f3f0ff; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #7c3aed; font-size: 24px; }
.modal-title-box h3 { margin: 0; font-size: 1.25rem; font-weight: 700; color: #1f2937; }
.edit-form-scroll { padding: 30px; max-height: 60vh; overflow-y: auto; }
.styled-form-item { margin-bottom: 20px; }
.custom-input { border-radius: 8px; background: #f9fafb; border: 1px solid #e5e7eb; }
.switch-wrapper { background: #f9fafb; padding: 10px 15px; border-radius: 8px; border: 1px solid #e5e7eb; display: flex; align-items: center; justify-content: space-between; }
.json-read-only {
    background: #fff7ed;
    color: #c2410c;
    padding: 10px;
    border-radius: 8px;
    font-size: 0.8rem;
    border: 1px dashed #fdba74;
    white-space: pre-wrap; /* Фикс для JSON в модалке */
    word-break: break-word;
}
.modal-footer-custom { padding: 20px 30px; background: #fff; border-top: 1px solid #f3f4f6; border-radius: 0 0 24px 24px; display: flex; justify-content: flex-end; gap: 12px; }
.btn-save { background: #7c3aed; border-color: #7c3aed; border-radius: 10px; font-weight: 600; }
.btn-cancel { border-radius: 10px; color: #6b7280; }

/* Валидация */
:deep(.ant-form-item-has-error .ant-input) {
  border-color: #ff4d4f !important;
}
:deep(.ant-form-item-explain-error) {
  color: #ff4d4f;
  font-size: 12px;
  margin-top: 4px;
}
</style>