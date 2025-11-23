<template>

  <div class="admin-layout">


    <div class="content-container fade-in-up">

      <div class="page-controls">
        <div class="left-controls">
          <div class="search-wrap">
            <input v-model="searchQuery" placeholder="Поиск..." class="glass-input" />
          </div>
          <div class="filters">
             <select v-model="filterRole" class="glass-select">
               <option value="all">Все роли</option>
               <option value="graduate">Студенты</option>
               <option value="employer">Работодатели</option>
             </select>
          </div>
        </div>

        <div class="right-controls">
          <!-- КНОПКА ИМПОРТА (СИНЯЯ) -->
          <button class="btn-import" @click="importModalVisible = true">
            <upload-outlined />
            <span>Импорт</span>
          </button>

          <!-- КНОПКА ЭКСПОРТА (ЗЕЛЕНАЯ) -->
          <button class="btn-export" @click="downloadExcel" :disabled="exporting">
            <file-excel-outlined v-if="!exporting" />
            <loading-outlined v-else spin />
            <span>{{ exporting ? '...' : 'Excel' }}</span>
          </button>
        </div>
      </div>

      <!-- Таблица -->
      <div class="glass-table-wrapper">
         <a-table :dataSource="filteredUsers" :columns="columns" rowKey="id" :pagination="{ pageSize: 7 }">
            <template #bodyCell="{ column, record }">
               <template v-if="column.key === 'user'">
                  <div class="user-cell">
                    <a-avatar :style="{ backgroundColor: stringToColor(record.name) }">{{ record.name?.[0]?.toUpperCase() || '?' }}</a-avatar>
                    <div><div class="u-name">{{ record.name || 'Без имени' }}</div><div class="u-email">{{ record.email }}</div></div>
                  </div>
               </template>
               <template v-if="column.key === 'role'">
                  <span class="role-badge" :class="record.role">{{ getRoleName(record.role) }}</span>
               </template>
               <template v-if="column.key === 'action'">
                  <a-popconfirm title="Удалить?" ok-text="Да" cancel-text="Нет" @confirm="deleteUser(record.id)">
                     <button class="btn-del"><delete-outlined /></button>
                  </a-popconfirm>
               </template>
            </template>
         </a-table>
      </div>
    </div>

    <!-- МОДАЛЬНОЕ ОКНО ИМПОРТА -->
    <a-modal
      v-model:visible="importModalVisible"
      title="📥 Массовая регистрация студентов"
      :footer="null"
      centered
    >
      <div class="import-guide">
        <p>Загрузите Excel файл (.xlsx) со списком студентов. Система автоматически создаст аккаунты.</p>

        <div class="format-box">
          <h4>Требуемый формат таблицы:</h4>
          <table class="mini-table">
            <thead><tr><th>A (Email)</th>
              <th>B (Пароль)</th>
              <th>C (Имя)</th>
              <th>D (Фамилия)</th>
            </tr>
            </thead>
            <tbody>
            <tr>
              <td>ivan@mail.ru</td>
              <td>pass123</td>
              <td>Иван</td>
              <td>Иванов</td>
            </tr>
            <tr>
              <td>anna@bk.ru</td>
              <td>(пусто)*</td>
              <td>Анна</td>
              <td>Петрова</td>
            </tr>
            </tbody>
          </table>
          <small>* Если пароль пустой, будет установлен: <b>student123</b></small>
        </div>

        <div class="upload-area">
          <a-upload-dragger
              name="file"
              :multiple="false"
              :before-upload="beforeUpload"
              :show-upload-list="false"
          >
            <p class="ant-upload-drag-icon">
              <inbox-outlined/>
            </p>
            <p class="ant-upload-text" v-if="!fileToUpload">Нажмите или перетащите файл сюда</p>
            <p class="ant-upload-text" v-else>Выбран файл: <b>{{ fileToUpload.name }}</b></p>
          </a-upload-dragger>
        </div>

        <div class="import-actions">
          <a-button @click="importModalVisible = false" style="margin-right: 10px">Отмена</a-button>
          <a-button type="primary" @click="uploadFile" :loading="importing" :disabled="!fileToUpload">
            Загрузить и обработать
          </a-button>
        </div>
      </div>
    </a-modal>

  </div>
</template>

<script>
import api from '../../axios';
import {ref, computed, onMounted} from 'vue';
import {
  DeleteOutlined, FileExcelOutlined, LoadingOutlined, UploadOutlined, InboxOutlined
} from '@ant-design/icons-vue';
import {message} from 'ant-design-vue';

export default {
  components: {
    DeleteOutlined,
    FileExcelOutlined,
    LoadingOutlined,
    UploadOutlined,
    InboxOutlined
  },
  setup() {
    const users = ref([]);
    const searchQuery = ref('');
    const filterRole = ref('all');

    const exporting = ref(false);

    // State для Импорта
    const importModalVisible = ref(false);
    const fileToUpload = ref(null);
    const importing = ref(false);

    const columns = [
      {title: 'Пользователь', key: 'user'},
      {title: 'Роль', key: 'role', width: 150},
      {title: 'Действия', key: 'action', width: 100, align: 'center'}
    ];

    const loadUsers = async () => {
      try {
        const r = await api.get('/admin/users');
        users.value = r.data;
      } catch (e) {
      }
    };
    const deleteUser = async (id) => {
      try {
        await api.delete(`/admin/users/${id}`);
        users.value = users.value.filter(u => u.id !== id);
        message.success('Удалено');
      } catch (e) {
      }
    };

    const downloadExcel = async () => {
      exporting.value = true;
      try {
        const response = await api.get('/admin/users/export', {responseType: 'blob'});
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `users_${new Date().toISOString().split('T')[0]}.xlsx`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      } catch (e) {
        message.error('Ошибка скачивания');
      } finally {
        exporting.value = false;
      }
    };

    // --- ЛОГИКА ИМПОРТА ---
    const beforeUpload = (file) => {
      const isExcel = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      if (!isExcel) {
        message.error('Только файлы .xlsx');
        return false;
      }
      fileToUpload.value = file;
      return false; // Предотвращаем авто-загрузку antd
    };

    const uploadFile = async () => {
      if (!fileToUpload.value) return;
      importing.value = true;
      const formData = new FormData();
      formData.append('file', fileToUpload.value);

      try {
        const res = await api.post('/admin/users/import', formData, {
          headers: {'Content-Type': 'multipart/form-data'}
        });
        message.success(res.data.message);
        importModalVisible.value = false;
        fileToUpload.value = null;
        loadUsers(); // Обновляем список
      } catch (e) {
        message.error('Ошибка импорта');
      } finally {
        importing.value = false;
      }
    };

    const filteredUsers = computed(() => {
      let res = users.value;
      if (filterRole.value !== 'all') res = res.filter(u => u.role === filterRole.value);
      if (searchQuery.value) res = res.filter(u => u.name?.toLowerCase().includes(searchQuery.value.toLowerCase()) || u.email.includes(searchQuery.value));
      return res;
    });

    const getRoleName = (r) => ({'graduate': 'Студент', 'employer': 'Работодатель', 'admin': 'Админ'}[r] || r);
    const stringToColor = (str) => {
      if (!str) return '#ccc';
      let hash = 0;
      for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
      return '#' + (hash & 0x00FFFFFF).toString(16).toUpperCase();
    };

    onMounted(loadUsers);

    return {
      filteredUsers, columns, searchQuery, filterRole,
      exporting, downloadExcel, deleteUser, getRoleName, stringToColor,
      // Импорт
      importModalVisible, fileToUpload, importing, beforeUpload, uploadFile
    };
  }
}
</script>

<style scoped>
.admin-layout {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
  position: relative;
  z-index: 1;
}

.page-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 15px;
}

.left-controls, .right-controls {
  display: flex;
  gap: 10px;
  flex: 1;
}

.right-controls {
  justify-content: flex-end;
}

.glass-input, .glass-select {
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid #fff;
  padding: 10px 15px;
  border-radius: 12px;
  width: 100%;
  outline: none;
  transition: 0.3s;
  max-width: 250px;
}

.glass-input:focus {
  background: #fff;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
}

/* Кнопки */
.btn-export, .btn-import {
  display: flex;
  align-items: center;
  gap: 8px;
  border: none;
  padding: 0 20px;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: 0.3s;
  height: 42px;
  color: white;
}

.btn-export {
  background: #107c41;
  box-shadow: 0 4px 10px rgba(16, 124, 65, 0.3);
}

.btn-export:hover {
  background: #0c5e31;
  transform: translateY(-2px);
}

.btn-import {
  background: #3b82f6;
  box-shadow: 0 4px 10px rgba(59, 130, 246, 0.3);
}

.btn-import:hover {
  background: #2563eb;
  transform: translateY(-2px);
}

.glass-table-wrapper {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(15px);
  border-radius: 20px;
  padding: 20px;
  border: 1px solid #fff;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
}

.user-cell {
  display: flex;
  gap: 12px;
  align-items: center;
}

.u-name {
  font-weight: 600;
  color: #1f2937;
}

.u-email {
  font-size: 0.8rem;
  color: #6b7280;
}

.role-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 700;
}

.role-badge.graduate {
  background: #e0f2fe;
  color: #0284c7;
}

.role-badge.employer {
  background: #f3e8ff;
  color: #7c3aed;
}

.role-badge.admin {
  background: #fee2e2;
  color: #dc2626;
}

.btn-del {
  border: none;
  background: #fee2e2;
  color: #ef4444;
  border-radius: 8px;
  width: 32px;
  height: 32px;
  cursor: pointer;
  transition: 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-del:hover {
  background: #ef4444;
  color: white;
  transform: scale(1.1);
}

.fade-in-up {
  animation: fadeInUp 0.8s ease forwards;
  opacity: 0;
  transform: translateY(30px);
}

@keyframes fadeInUp {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Modal Styles */
.import-guide {
  font-size: 0.95rem;
  color: #4b5563;
}

.format-box {
  background: #f9fafb;
  padding: 15px;
  border-radius: 10px;
  margin: 15px 0;
  border: 1px solid #e5e7eb;
}

.format-box h4 {
  margin: 0 0 10px 0;
  font-size: 0.9rem;
}

.mini-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.mini-table th, .mini-table td {
  border: 1px solid #d1d5db;
  padding: 6px;
  text-align: left;
}

.mini-table th {
  background: #e5e7eb;
}

.upload-area {
  margin: 20px 0;
}

.import-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}
</style>