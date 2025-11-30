<template>
  <div class="content-container fade-in-up">

    <!-- HEADER & STATS -->
    <div class="header-section">
       <div class="header-title">
          <h2><team-outlined class="icon-blue" /> База пользователей</h2>
          <p>Управление учетными записями и правами доступа</p>
       </div>

       <div class="header-stats">
          <div class="stat-card">
             <div class="stat-val">{{ users.length }}</div>
             <div class="stat-lbl">Всего</div>
          </div>
          <div class="stat-card">
             <div class="stat-val text-green">+{{ newUsersCount }}</div>
             <div class="stat-lbl">За 24ч</div>
          </div>
          <div class="stat-card">
             <div class="stat-val text-teal">{{ universityCount }}</div>
             <div class="stat-lbl">ВУЗов</div>
          </div>
       </div>
    </div>

    <!-- CONTROLS BAR -->
    <div class="glass-panel controls-bar">
      <div class="left-controls">
        <a-input
          v-model:value="searchQuery"
          placeholder="Поиск по имени, email..."
          class="search-input"
          allow-clear
        >
           <template #prefix><search-outlined style="color: #9ca3af" /></template>
        </a-input>

        <!-- ТАБЫ ФИЛЬТРАЦИИ -->
        <div class="filter-tabs">
           <div class="tab" :class="{ active: filterRole === 'all' }" @click="filterRole = 'all'">Все</div>
           <div class="tab" :class="{ active: filterRole === 'graduate' }" @click="filterRole = 'graduate'">Студенты</div>
           <div class="tab" :class="{ active: filterRole === 'employer' }" @click="filterRole = 'employer'">HR</div>
           <div class="tab" :class="{ active: filterRole === 'university_staff' }" @click="filterRole = 'university_staff'">ВУЗ</div>
           <div class="tab" :class="{ active: filterRole === 'admin' }" @click="filterRole = 'admin'">Админы</div>
        </div>
      </div>

      <div class="right-controls">
        <button class="btn-action primary" @click="importModalVisible = true">
          <cloud-upload-outlined /> Импорт
        </button>

        <button class="btn-action success" @click="downloadExcel" :disabled="exporting">
          <loading-outlined v-if="exporting" spin />
          <file-excel-outlined v-else /> Экспорт
        </button>
      </div>
    </div>

    <!-- TABLE -->
    <div class="glass-table-wrapper">
       <a-table
          :dataSource="filteredUsers"
          :columns="columns"
          rowKey="id"
          :pagination="{ pageSize: 8 }"
          class="custom-table"
          :loading="loading"
       >
          <template #bodyCell="{ column, record }">

             <!-- Пользователь -->
             <template v-if="column.key === 'user'">
                <div class="user-cell">
                  <a-avatar
                    size="large"
                    :src="record.avatar_url ? `http://localhost:4000${record.avatar_url}` : null"
                    :style="{ backgroundColor: stringToColor(record.email), fontSize: '18px' }"
                  >
                    {{ record.name?.[0]?.toUpperCase() || record.email[0].toUpperCase() }}
                  </a-avatar>
                  <div class="u-info">
                      <div class="u-name">{{ record.name || 'Без имени' }}</div>
                      <div class="u-email">{{ record.email }}</div>
                  </div>
                </div>
             </template>

             <!-- Роль (С КРАСИВОЙ ПОДСВЕТКОЙ) -->
             <template v-if="column.key === 'role'">
                <span class="role-badge" :class="record.role">
                  <component :is="getRoleIcon(record.role)" />
                  {{ getRoleName(record.role) }}
                </span>
             </template>

             <!-- Статус -->
             <template v-if="column.key === 'status'">
                <a-badge :status="record.is_verified ? 'success' : 'default'" :text="record.is_verified ? 'Активен' : 'Не подтв.'" />
             </template>

             <!-- Дата -->
             <template v-if="column.key === 'created'">
                <span class="date-text">{{ new Date(record.created_at).toLocaleDateString() }}</span>
             </template>

             <!-- Действия -->
             <template v-if="column.key === 'action'">
                <div class="actions-row">
                   <a-popconfirm title="Удалить пользователя?" ok-text="Да" cancel-text="Нет" @confirm="deleteUser(record.id)">
                      <button class="btn-mini delete"><delete-outlined /></button>
                   </a-popconfirm>
                </div>
             </template>

          </template>
       </a-table>
    </div>

    <!-- IMPORT MODAL -->
    <a-modal
      v-model:open="importModalVisible"
      title="📥 Массовый импорт (Excel)"
      :footer="null"
      centered
      width="500px"
    >
      <div class="import-content">
        <div class="info-alert">
           <info-circle-outlined />
           <span>Формат: Email, Пароль, Имя, Фамилия. <br>Пароль по умолчанию: <b>student123</b></span>
        </div>

        <div class="upload-area">
          <a-upload-dragger
              name="file"
              :multiple="false"
              :before-upload="beforeUpload"
              :show-upload-list="false"
          >
            <p class="upload-icon"><inbox-outlined /></p>
            <p class="upload-text" v-if="!fileToUpload">Нажмите или перетащите файл .xlsx</p>
            <p class="upload-text active" v-else>Файл выбран: <b>{{ fileToUpload.name }}</b></p>
          </a-upload-dragger>
        </div>

        <div class="modal-footer-custom">
          <a-button @click="importModalVisible = false">Отмена</a-button>
          <a-button type="primary" @click="uploadFile" :loading="importing" :disabled="!fileToUpload">
            Загрузить
          </a-button>
        </div>
      </div>
    </a-modal>

  </div>
</template>

<script>
import api from '../../axios';
import { ref, computed, onMounted } from 'vue';
import { message } from 'ant-design-vue';
import {
  DeleteOutlined, FileExcelOutlined, LoadingOutlined, UploadOutlined, InboxOutlined,
  TeamOutlined, SearchOutlined, CloudUploadOutlined, EditOutlined,
  UserOutlined, BankOutlined, IdcardOutlined, SafetyCertificateFilled, InfoCircleOutlined
} from '@ant-design/icons-vue';

export default {
  components: {
    DeleteOutlined, FileExcelOutlined, LoadingOutlined, UploadOutlined, InboxOutlined,
    TeamOutlined, SearchOutlined, CloudUploadOutlined, EditOutlined,
    UserOutlined, BankOutlined, IdcardOutlined, SafetyCertificateFilled, InfoCircleOutlined
  },
  setup() {
    const users = ref([]);
    const loading = ref(true);
    const searchQuery = ref('');
    const filterRole = ref('all');

    const exporting = ref(false);
    const importModalVisible = ref(false);
    const fileToUpload = ref(null);
    const importing = ref(false);

    const columns = [
      { title: 'Пользователь', key: 'user', width: '35%' },
      { title: 'Роль', key: 'role', width: '20%' },
      { title: 'Статус', key: 'status', width: 150 },
      { title: 'Регистрация', key: 'created', width: 150 },
      { title: '', key: 'action', align: 'right' }
    ];

    const loadUsers = async () => {
      loading.value = true;
      try {
        const r = await api.get('/admin/users');
        users.value = r.data;
      } catch (e) { message.error('Ошибка загрузки'); }
      finally { loading.value = false; }
    };

    const deleteUser = async (id) => {
      try {
        await api.delete(`/admin/users/${id}`);
        users.value = users.value.filter(u => u.id !== id);
        message.success('Пользователь удален');
      } catch (e) { message.error('Ошибка удаления'); }
    };

    const downloadExcel = async () => {
      exporting.value = true;
      try {
        const response = await api.get('/admin/users/export', { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `users_${new Date().toISOString().split('T')[0]}.xlsx`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        message.success('Файл скачан');
      } catch (e) { message.error('Ошибка экспорта'); }
      finally { exporting.value = false; }
    };

    const beforeUpload = (file) => {
      const isExcel = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      if (!isExcel) { message.error('Только файлы .xlsx'); return false; }
      fileToUpload.value = file;
      return false;
    };

    const uploadFile = async () => {
      if (!fileToUpload.value) return;
      importing.value = true;
      const formData = new FormData();
      formData.append('file', fileToUpload.value);

      try {
        const res = await api.post('/admin/users/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        message.success(res.data.message);
        importModalVisible.value = false;
        fileToUpload.value = null;
        loadUsers();
      } catch (e) { message.error('Ошибка импорта'); }
      finally { importing.value = false; }
    };

    const filteredUsers = computed(() => {
      let res = users.value;
      if (filterRole.value !== 'all') res = res.filter(u => u.role === filterRole.value);
      if (searchQuery.value) {
          const q = searchQuery.value.toLowerCase();
          res = res.filter(u => (u.name && u.name.toLowerCase().includes(q)) || u.email.toLowerCase().includes(q));
      }
      return res;
    });

    const newUsersCount = computed(() => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return users.value.filter(u => new Date(u.created_at) > yesterday).length;
    });

    const universityCount = computed(() => users.value.filter(u => u.role === 'university_staff').length);

    const getRoleName = (r) => ({ 'graduate': 'Студент', 'employer': 'HR', 'admin': 'Админ', 'university_staff': 'ВУЗ' }[r] || r);
    const getRoleIcon = (r) => ({ 'graduate': 'IdcardOutlined', 'employer': 'BankOutlined', 'admin': 'SafetyCertificateFilled', 'university_staff': 'BankOutlined' }[r] || 'UserOutlined');

    const stringToColor = (str) => {
      if (!str) return '#ccc';
      let hash = 0;
      for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
      return '#' + (hash & 0x00FFFFFF).toString(16).toUpperCase();
    };

    onMounted(loadUsers);

    return {
      filteredUsers, columns, searchQuery, filterRole, users, newUsersCount, universityCount, loading,
      exporting, downloadExcel, deleteUser, getRoleName, getRoleIcon, stringToColor,
      importModalVisible, fileToUpload, importing, beforeUpload, uploadFile
    };
  }
}
</script>

<style scoped>
.content-container { max-width: 1200px; margin: 0 auto; }

/* HEADER */
.header-section { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 30px; }
.header-title h2 { margin: 0; font-size: 1.8rem; font-weight: 800; color: #1f2937; display: flex; align-items: center; gap: 12px; }
.header-title p { margin: 5px 0 0; color: #6b7280; font-size: 0.95rem; }
.icon-blue { color: #3b82f6; }

.header-stats { display: flex; gap: 15px; }
.stat-card { background: white; padding: 10px 20px; border-radius: 12px; border: 1px solid #e5e7eb; text-align: center; box-shadow: 0 4px 10px rgba(0,0,0,0.02); min-width: 100px; }
.stat-val { font-weight: 800; font-size: 1.5rem; color: #111827; line-height: 1; }
.stat-val.text-green { color: #10b981; }
.stat-val.text-teal { color: #0d9488; }
.stat-lbl { font-size: 0.75rem; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px; }

/* CONTROLS */
.controls-bar { display: flex; justify-content: space-between; align-items: center; padding: 15px 20px; margin-bottom: 25px; background: rgba(255,255,255,0.7); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.5); border-radius: 16px; }
.left-controls { display: flex; align-items: center; gap: 20px; flex: 1; }
.search-input { width: 280px; border-radius: 8px; box-shadow: none; border: 1px solid #e5e7eb; }
.filter-tabs { display: flex; background: #f1f5f9; padding: 4px; border-radius: 10px; gap: 4px; }
.tab { padding: 6px 16px; border-radius: 8px; font-size: 0.9rem; font-weight: 600; color: #64748b; cursor: pointer; transition: 0.2s; }
.tab:hover { background: rgba(0,0,0,0.05); }
.tab.active { background: white; color: #3b82f6; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }

.right-controls { display: flex; gap: 10px; }
.btn-action { display: flex; align-items: center; gap: 8px; border: none; padding: 0 16px; border-radius: 10px; font-weight: 600; cursor: pointer; transition: 0.3s; height: 40px; color: white; font-size: 0.9rem; }
.btn-action.primary { background: #3b82f6; box-shadow: 0 4px 10px rgba(59, 130, 246, 0.3); }
.btn-action.primary:hover { background: #2563eb; transform: translateY(-2px); }
.btn-action.success { background: #10b981; box-shadow: 0 4px 10px rgba(16, 185, 129, 0.3); }
.btn-action.success:hover { background: #059669; transform: translateY(-2px); }

/* TABLE */
.glass-table-wrapper { background: rgba(255,255,255,0.8); backdrop-filter: blur(10px); border-radius: 20px; padding: 0; border: 1px solid rgba(255,255,255,0.6); overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.02); }
.custom-table :deep(.ant-table-thead > tr > th) { background: #f8fafc; font-weight: 700; color: #4b5563; font-size: 0.85rem; }
.user-cell { display: flex; gap: 12px; align-items: center; }
.u-name { font-weight: 600; color: #1f2937; font-size: 0.95rem; }
.u-email { font-size: 0.8rem; color: #6b7280; }
.date-text { color: #6b7280; font-size: 0.85rem; }

/* BADGES */
.role-badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; }
.role-badge.graduate { background: #e0f2fe; color: #0284c7; border: 1px solid #bae6fd; }
.role-badge.employer { background: #f3e8ff; color: #7c3aed; border: 1px solid #d8b4fe; }
.role-badge.university_staff { background: #ccfbf1; color: #0f766e; border: 1px solid #99f6e4; } /* TEAL */
.role-badge.admin { background: #fee2e2; color: #dc2626; border: 1px solid #fecaca; }

.actions-row { display: flex; gap: 8px; justify-content: flex-end; }
.btn-mini { width: 32px; height: 32px; border-radius: 8px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
.btn-mini.edit { background: #f3f4f6; color: #4b5563; }
.btn-mini.edit:hover { background: #e5e7eb; color: #1f2937; }
.btn-mini.delete { background: #fff1f2; color: #f43f5e; }
.btn-mini.delete:hover { background: #f43f5e; color: white; }

/* MODAL */
.info-alert { background: #eff6ff; color: #1e40af; padding: 12px; border-radius: 8px; font-size: 0.9rem; display: flex; gap: 10px; align-items: center; margin-bottom: 20px; border: 1px solid #dbeafe; }
.upload-area { border: 2px dashed #d1d5db; border-radius: 12px; padding: 30px; text-align: center; background: #f9fafb; transition: 0.2s; }
.upload-area:hover { border-color: #3b82f6; background: #eff6ff; }
.upload-icon { font-size: 2.5rem; color: #9ca3af; margin-bottom: 10px; }
.upload-text { color: #6b7280; }
.upload-text.active { color: #3b82f6; font-weight: 600; }
.modal-footer-custom { display: flex; justify-content: flex-end; gap: 10px; margin-top: 25px; }

.fade-in-up { animation: fadeInUp 0.8s ease forwards; opacity: 0; transform: translateY(30px); }
@keyframes fadeInUp { to { opacity: 1; transform: translateY(0); } }
</style>