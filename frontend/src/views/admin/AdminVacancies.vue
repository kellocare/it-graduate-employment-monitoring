<template>
  <div class="content-container fade-in-up">

    <!-- ЗАГОЛОВОК -->
    <div class="page-header">
      <div class="header-left">
        <h2><safety-certificate-filled class="icon-purple" /> Модерация вакансий</h2>
        <p class="sub-text">Проверка качества и соответствия вакансий</p>
      </div>
      <a-button type="primary" shape="round" @click="loadData" :loading="loading">
        <reload-outlined /> Обновить
      </a-button>
    </div>

    <!-- ТАБЫ -->
    <a-tabs v-model:activeKey="activeTab" class="glass-tabs">
      <a-tab-pane key="pending">
        <template #tab>
          <span>⏳ Очередь</span>
          <a-badge :count="pendingCount" :offset="[10, -5]" v-if="pendingCount > 0" />
        </template>
      </a-tab-pane>
      <a-tab-pane key="all" tab="📂 Все вакансии" />
    </a-tabs>

    <!-- ЛОАДЕР -->
    <div v-if="loading" class="loading-state">
      <loading-outlined spin /> Загрузка списка...
    </div>

    <!-- СПИСОК -->
    <div v-else class="vacancies-grid">
      <div v-if="filteredVacancies.length === 0" class="empty-state">
        <check-circle-filled style="font-size: 50px; color: #52c41a; margin-bottom: 15px;" />
        <h3>Список пуст</h3>
        <p>Нет вакансий в этой категории.</p>
      </div>

      <div
        v-for="vac in filteredVacancies"
        :key="vac.id"
        class="glass-card-vac"
        :class="vac.status"
      >
        <div class="vac-top">
          <span class="status-badge" :class="vac.status">{{ getStatusText(vac.status) }}</span>
          <div class="actions">
             <a-tooltip title="Смотреть подробно">
                <button class="btn-icon" @click="openDetailModal(vac)"><eye-outlined /></button>
             </a-tooltip>
             <a-tooltip title="Написать компании">
                <button class="btn-icon" @click="openMessageModal(vac)"><message-outlined /></button>
             </a-tooltip>
          </div>
        </div>

        <div class="vac-content">
           <div class="vac-date">{{ formatDate(vac.created_at) }}</div>
           <h3 class="vac-title">{{ vac.title }}</h3>
           <div class="vac-sub"><bank-outlined /> {{ vac.company_name || 'Неизвестная компания' }}</div>
           <div class="vac-salary">{{ vac.salary_min ? formatMoney(vac.salary_min) + ' ₽' : 'З/П не указана' }}</div>
           <p class="vac-desc">{{ vac.description }}</p>
        </div>

        <div class="vac-ai">
           <button class="btn-ai" @click="runAiAudit(vac)"><robot-outlined /> AI Аудит</button>
        </div>

        <div class="vac-footer">
           <!-- PENDING -->
           <template v-if="vac.status === 'pending'">
             <button class="btn-act approve" @click="approveVacancy(vac.id)"><check-outlined /> Опубликовать</button>
             <button class="btn-act reject" @click="openRejectModal(vac)"><close-outlined /> Отклонить</button>
           </template>

           <!-- ACTIVE -->
           <template v-else-if="vac.status === 'active'">
              <!-- 🔥 КНОПКА СНЯТИЯ С ПУБЛИКАЦИИ (ТЕПЕРЬ ОТКРЫВАЕТ МОДАЛКУ) -->
              <button class="btn-act reject ghost full" @click="openUnpublishModal(vac)">
                <stop-outlined /> Снять с публикации
              </button>
           </template>

           <!-- REJECTED -->
           <template v-else>
              <button class="btn-act approve ghost full" @click="approveVacancy(vac.id)"><redo-outlined /> Восстановить</button>
           </template>
        </div>
      </div>
    </div>

    <!-- МОДАЛКИ (AI, Detail, Message - без изменений, код сокращен для краткости) -->
    <a-modal v-model:visible="detailModalVisible" :footer="null" width="800px" centered class="glass-modal-style">
       <!-- ... (код детальной модалки тот же) ... -->
       <div v-if="selectedVac" class="modal-content-inner">
          <!-- ... -->
          <div class="modal-actions-row">
             <template v-if="selectedVac.status === 'pending'">
                <button class="btn-modal-act approve" @click="approveFromModal"><check-outlined /> Принять</button>
                <button class="btn-modal-act reject" @click="rejectFromModal"><close-outlined /> Отклонить</button>
             </template>
             <template v-else-if="selectedVac.status === 'active'">
                <button class="btn-modal-act reject ghost" @click="unpublishFromModal">
                   <stop-outlined /> Снять с публикации
                </button>
             </template>
             <template v-else>
                 <button class="btn-modal-act approve ghost" @click="approveFromModal"><redo-outlined /> Восстановить</button>
             </template>
          </div>
       </div>
    </a-modal>

    <a-modal v-model:visible="aiModalVisible" :footer="null" width="650px" centered class="ai-audit-modal">
       <!-- ... (код AI модалки тот же) ... -->
       <div v-if="aiResult" class="ai-result-content fade-in-scale">
          <!-- ... -->
       </div>
    </a-modal>

    <!-- 🔥 МОДАЛКА ОТКЛОНЕНИЯ (Reject) -->
    <a-modal
      v-model:visible="rejectModalVisible"
      title="🛑 Отклонение вакансии"
      ok-text="Отклонить"
      ok-type="danger"
      @ok="confirmReject"
      :confirmLoading="rejectLoading"
    >
      <a-alert message="Компания получит уведомление." type="warning" show-icon style="margin-bottom: 10px;" />
      <a-textarea v-model:value="rejectReason" placeholder="Укажите причину (например: 'Некорректное описание')..." :rows="4" />
    </a-modal>

    <!-- 🔥 МОДАЛКА СНЯТИЯ С ПУБЛИКАЦИИ (Unpublish) -->
    <a-modal
      v-model:visible="unpublishModalVisible"
      title="⛔ Снятие с публикации"
      ok-text="Снять вакансию"
      ok-type="danger"
      @ok="confirmUnpublish"
      :confirmLoading="rejectLoading"
    >
      <div class="msg-header-info">
        Вы снимаете вакансию: <b class="company-name-highlight">{{ selectedVac?.title }}</b>
      </div>
      <p class="sub-text-modal">Работодатель получит уведомление. Объясните причину:</p>

      <a-textarea
        v-model:value="unpublishReason"
        placeholder="Например: 'Жалобы от кандидатов' или 'Нарушение правил'..."
        :rows="4"
        style="margin-top: 10px;"
      />
    </a-modal>

    <!-- МОДАЛКА СООБЩЕНИЯ -->
    <a-modal v-model:visible="msgModalVisible" title="✉️ Написать работодателю" @ok="sendMessage">
      <div class="msg-header-info">Кому: <b class="company-name-highlight">{{ selectedVac?.company_name || 'Неизвестная компания' }}</b></div>
      <a-textarea v-model:value="msgText" placeholder="Введите текст сообщения..." :rows="5" style="margin-top: 10px;" />
    </a-modal>

  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import api from '../../axios.js';
import { message } from 'ant-design-vue';
import {
  SafetyCertificateFilled, ReloadOutlined, LoadingOutlined, CheckCircleFilled,
  BankOutlined, CheckOutlined, CloseOutlined, EyeOutlined, MessageOutlined,
  RobotOutlined, StopOutlined, RedoOutlined, WarningFilled, RobotFilled,
  CalendarOutlined, MailOutlined
} from '@ant-design/icons-vue';

export default {
  components: {
    SafetyCertificateFilled, ReloadOutlined, LoadingOutlined, CheckCircleFilled,
    BankOutlined, CheckOutlined, CloseOutlined, EyeOutlined, MessageOutlined,
    RobotOutlined, StopOutlined, RedoOutlined, WarningFilled, RobotFilled,
    CalendarOutlined, MailOutlined
  },
  setup() {
    // --- STATE ---
    const vacancies = ref([]);
    const loading = ref(true);
    const activeTab = ref('pending');

    // Modals
    const detailModalVisible = ref(false);
    const aiModalVisible = ref(false);
    const rejectModalVisible = ref(false);
    const unpublishModalVisible = ref(false); // Новая модалка
    const msgModalVisible = ref(false);

    // Selected Data
    const selectedVac = ref(null);
    const aiResult = ref(null);

    const rejectReason = ref('');
    const unpublishReason = ref(''); // Причина снятия

    const rejectLoading = ref(false);
    const msgText = ref('');
    const aiLoading = ref(false);

    // --- LOAD ---
    const loadData = async () => {
      loading.value = true;
      try {
        const res = await api.get('/vacancies/admin/all');
        vacancies.value = res.data;
      } catch (e) {
        message.error('Ошибка загрузки');
      } finally {
        loading.value = false;
      }
    };

    // --- ACTIONS ---
    const approveVacancy = async (id) => { await changeStatusApi(id, 'active'); };

    // 1. Отклонение (Reject)
    const openRejectModal = (vac) => {
      selectedVac.value = vac;
      rejectReason.value = '';
      rejectModalVisible.value = true;
    };
    const confirmReject = async () => {
      if (!rejectReason.value.trim()) return message.warning('Укажите причину');
      rejectLoading.value = true;
      await changeStatusApi(selectedVac.value.id, 'rejected', rejectReason.value);
      rejectLoading.value = false;
      rejectModalVisible.value = false;
      detailModalVisible.value = false;
    };

    // 2. Снятие с публикации (Unpublish)
    const openUnpublishModal = (vac) => {
      selectedVac.value = vac;
      unpublishReason.value = '';
      unpublishModalVisible.value = true;
    };
    const confirmUnpublish = async () => {
      if (!unpublishReason.value.trim()) return message.warning('Укажите причину снятия');
      rejectLoading.value = true;
      // Используем статус 'rejected' или можно добавить новый 'archived' / 'suspended'
      // Обычно 'rejected' подходит, если админ блокирует.
      await changeStatusApi(selectedVac.value.id, 'rejected', unpublishReason.value);
      rejectLoading.value = false;
      unpublishModalVisible.value = false;
      detailModalVisible.value = false;
    };

    const changeStatusApi = async (id, status, reason) => {
      try {
        // 1. Отправляем статус на бэкенд
        await api.post('/vacancies/admin/status', { id, status, reason });

        // 2. Обновляем статус в локальном списке (чтобы не перезагружать страницу)
        const v = vacancies.value.find(x => x.id === id);
        if (v) v.status = status;
        if (selectedVac.value && selectedVac.value.id === id) selectedVac.value.status = status;

        // 3. 🔥 ОТПРАВКА УВЕДОМЛЕНИЯ В ЧАТ (Если есть причина)
        if (reason && selectedVac.value && selectedVac.value.user_id) {
           // Формируем красивое сообщение с Markdown (жирный текст, эмодзи)
           const msgContent = `⛔ **ВАКАНСИЯ СНЯТА С ПУБЛИКАЦИИ**\n\nВаша вакансия **"${selectedVac.value.title}"** была скрыта модератором.\n\n**Причина:**\n${reason}\n\nПожалуйста, внесите исправления в личном кабинете.`;

           try {
             await api.post('/messages/send', {
               receiver_id: selectedVac.value.user_id, // ID работодателя
               content: msgContent,
               vacancy_id: id
             });
             message.success('Вакансия снята, уведомление отправлено');
           } catch (msgError) {
             console.error(msgError);
             message.warning('Статус изменен, но не удалось отправить сообщение');
           }
        } else {
           // Если причины нет (например, просто одобрили)
           message.success(status === 'active' ? 'Опубликовано' : 'Статус обновлен');
        }

      } catch (e) {
        message.error('Ошибка обновления статуса');
      }
    };

    // --- MODALS HELPER ---
    const openDetailModal = (vac) => { selectedVac.value = vac; detailModalVisible.value = true; };
    const approveFromModal = () => { approveVacancy(selectedVac.value.id); detailModalVisible.value = false; };
    const rejectFromModal = () => { openRejectModal(selectedVac.value); }; // Передаем объект
    const unpublishFromModal = () => { openUnpublishModal(selectedVac.value); }; // Передаем объект

    // --- AI ---
    const runAiAudit = async (vac) => {
      aiModalVisible.value = true;
      aiLoading.value = true;
      aiResult.value = null;
      try {
        const res = await api.post('/vacancies/admin/analyze', { description: vac.description, title: vac.title, salary: vac.salary_min });
        aiResult.value = res.data;
      } catch (e) { message.error('AI Error'); aiModalVisible.value = false; }
      finally { aiLoading.value = false; }
    };

    // --- MSG ---
    const openMessageModal = (vac) => { selectedVac.value = vac; msgText.value = ''; msgModalVisible.value = true; };
    const sendMessage = async () => {
      if (!msgText.value.trim()) return message.warning('Введите текст');
      try {
        await api.post('/messages/send', { receiver_id: selectedVac.value.user_id, content: msgText.value, vacancy_id: selectedVac.value.id });
        message.success('Отправлено');
        msgModalVisible.value = false;
      } catch (e) { message.error('Ошибка отправки'); }
    };

    // --- HELPERS ---
    const normalizeSkills = (skills) => { if (!skills) return []; if (Array.isArray(skills)) return skills; if (typeof skills === 'string') return skills.split(',').map(s=>s.trim()); return []; };
    const filteredVacancies = computed(() => activeTab.value === 'pending' ? vacancies.value.filter(v => v.status === 'pending') : vacancies.value);
    const pendingCount = computed(() => vacancies.value.filter(v => v.status === 'pending').length);
    const getStatusText = (s) => ({ 'pending': 'На проверке', 'active': 'Активна', 'rejected': 'Отклонена' }[s] || s);
    const formatMoney = (v) => new Intl.NumberFormat('ru-RU').format(v);
    const formatDate = (v) => new Date(v).toLocaleDateString();
    const getScoreColor = (s) => (s >= 80 ? {color:'#52c41a',text:'#389e0d'} : s >= 50 ? {color:'#faad14',text:'#d48806'} : {color:'#ff4d4f',text:'#cf1322'});
    const getGaugeStyle = (s) => { const deg = (s / 100) * 360; const color = getScoreColor(s).color; return { background: `conic-gradient(${color} ${deg}deg, transparent 0deg)` }; };

    onMounted(loadData);
    return {
      vacancies, loading, activeTab, filteredVacancies, pendingCount,
      detailModalVisible, aiModalVisible, rejectModalVisible, unpublishModalVisible, msgModalVisible,
      selectedVac, aiResult, rejectReason, unpublishReason, msgText, rejectLoading, aiLoading,
      loadData, approveVacancy,
      openRejectModal, confirmReject,
      openUnpublishModal, confirmUnpublish,
      openDetailModal, approveFromModal, rejectFromModal, unpublishFromModal,
      runAiAudit, openMessageModal, sendMessage,
      getStatusText, formatMoney, formatDate, normalizeSkills, getScoreColor, getGaugeStyle
    };
  }
}
</script>

<style scoped>
/* (СТИЛИ ТЕ ЖЕ, ЧТО БЫЛИ РАНЕЕ - Я ИХ СКРЫЛ ДЛЯ КРАТКОСТИ, ОНИ ОСТАЮТСЯ БЕЗ ИЗМЕНЕНИЙ) */
/* Скопируй сюда CSS из предыдущего ответа */
.content-container { max-width: 1200px; margin: 0 auto; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; }
.header-left h2 { margin: 0; font-size: 1.8rem; display: flex; align-items: center; gap: 10px; color: #1f2937; }
.icon-purple { color: #7c3aed; }
.sub-text { color: #6b7280; margin: 5px 0 0 0; font-size: 0.95rem; }
.vacancies-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 25px; }
.glass-card-vac { background: rgba(255,255,255,0.7); backdrop-filter: blur(15px); border-radius: 24px; padding: 25px; border: 1px solid #fff; display: flex; flex-direction: column; transition: 0.3s; position: relative; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.02); }
.glass-card-vac:hover { transform: translateY(-5px); background: rgba(255,255,255,0.9); box-shadow: 0 15px 40px rgba(0,0,0,0.08); }
.glass-card-vac.pending { border-top: 5px solid #faad14; }
.glass-card-vac.active { border-top: 5px solid #52c41a; }
.glass-card-vac.rejected { border-top: 5px solid #ff4d4f; opacity: 0.85; }
.vac-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.status-badge { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; padding: 5px 12px; border-radius: 20px; letter-spacing: 0.5px; }
.pending .status-badge { background: #fff7e6; color: #faad14; }
.active .status-badge { background: #f6ffed; color: #52c41a; }
.rejected .status-badge { background: #fff1f0; color: #ff4d4f; }
.actions { display: flex; gap: 8px; }
.btn-icon { background: white; border: 1px solid #eee; border-radius: 50%; width: 34px; height: 34px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #6b7280; transition: 0.2s; }
.btn-icon:hover { border-color: #8b5cf6; color: #8b5cf6; transform: scale(1.1); }
.vac-date { font-size: 0.8rem; color: #9ca3af; margin-bottom: 4px; }
.vac-title { margin: 0 0 5px 0; font-size: 1.25rem; font-weight: 700; color: #1f2937; line-height: 1.3; }
.vac-sub { font-size: 0.9rem; color: #6b7280; margin-bottom: 8px; font-weight: 500; }
.vac-salary { font-weight: 800; color: #10b981; font-size: 1.1rem; margin-bottom: 12px; }
.vac-desc { font-size: 0.9rem; color: #4b5563; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; margin-bottom: 15px; }
.btn-ai { width: 100%; border: 1px dashed #722ed1; background: #f9f0ff; color: #722ed1; padding: 10px; border-radius: 12px; cursor: pointer; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 8px; transition: 0.2s; margin-bottom: 20px; }
.btn-ai:hover { background: #722ed1; color: white; border-style: solid; }
.vac-footer { display: flex; gap: 10px; margin-top: auto; }
.btn-act { flex: 1; border: none; padding: 12px; border-radius: 12px; font-weight: 600; cursor: pointer; color: white; display: flex; align-items: center; justify-content: center; gap: 6px; transition: 0.2s; font-size: 0.9rem; }
.btn-act:hover { transform: translateY(-2px); }
.approve { background: linear-gradient(135deg, #10b981, #059669); box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3); }
.reject { background: linear-gradient(135deg, #ff4d4f, #d9363e); box-shadow: 0 4px 12px rgba(255, 77, 79, 0.3); }
.ghost { background: #f3f4f6; color: #374151; box-shadow: none; border: 1px solid #e5e7eb; }
.ghost:hover { background: #e5e7eb; }
.full { width: 100%; }
.modal-hero { text-align: center; margin-bottom: 25px; padding-bottom: 20px; border-bottom: 1px solid #f3f4f6; }
.modal-badge { display: inline-flex; align-items: center; gap: 6px; background: #f3f4f6; padding: 6px 16px; border-radius: 20px; font-weight: 600; color: #4b5563; margin-bottom: 10px; }
.modal-hero h2 { font-size: 2rem; margin: 0 0 15px 0; color: #111827; line-height: 1.2; }
.modal-meta { display: flex; justify-content: center; gap: 12px; flex-wrap: wrap; }
.salary-tag { color: #059669; background: #ecfdf5; padding: 6px 14px; border-radius: 12px; font-weight: 700; }
.date-tag { color: #6b7280; background: #f9fafb; padding: 6px 14px; border-radius: 12px; }
.ai-insight-box { background: linear-gradient(135deg, #f5f3ff, #ede9fe); border: 1px solid #ddd6fe; padding: 20px; border-radius: 16px; margin-bottom: 25px; }
.ai-title { color: #7c3aed; font-weight: 800; margin-bottom: 8px; display: flex; align-items: center; gap: 8px; font-size: 1.1rem; }
.ai-text { color: #5b21b6; line-height: 1.6; font-size: 1rem; }
.modal-section { margin-bottom: 30px; }
.modal-section h4 { font-size: 1.1rem; font-weight: 700; margin-bottom: 15px; color: #374151; border-left: 4px solid #8b5cf6; padding-left: 10px; }
.desc-text-full { white-space: pre-wrap; line-height: 1.8; color: #4b5563; font-size: 1rem; }
.skills-cloud { display: flex; flex-wrap: wrap; gap: 10px; }
.skill-tag { background: #eef2ff; color: #4f46e5; padding: 8px 16px; border-radius: 20px; font-weight: 600; border: 1px solid #c7d2fe; }
.contact-row { display: flex; align-items: center; gap: 10px; font-weight: 600; color: #4b5563; background: #f9fafb; padding: 15px; border-radius: 12px; }
.modal-actions-row { display: flex; gap: 15px; justify-content: flex-end; margin-top: 20px; }
.btn-modal-act { border: none; padding: 12px 24px; border-radius: 12px; font-weight: 700; cursor: pointer; color: white; display: flex; align-items: center; gap: 8px; font-size: 1rem; transition: 0.2s; }
.btn-modal-act:hover { transform: scale(1.05); }
.msg-header-info { margin-bottom: 10px; font-size: 1rem; color: #4b5563; }
.company-name-highlight { color: #7c3aed; }
.ai-modal-header { display: flex; align-items: center; gap: 10px; font-size: 1.2rem; color: #722ed1; font-weight: 700; }
.ai-loading-state { text-align: center; padding: 30px; }
.pulsing-brain { font-size: 3rem; margin-bottom: 10px; animation: pulse 1.5s infinite; }
.score-section { display: flex; align-items: center; gap: 20px; background: #fafafa; padding: 15px; border-radius: 12px; margin-bottom: 20px; }
.score-ring-container { width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; position: relative; }
.score-inner { width: 68px; height: 68px; background: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.5rem; }
.analysis-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
.analysis-card { border-radius: 10px; padding: 12px; font-size: 0.9rem; }
.analysis-card.pros { background: #f6ffed; border: 1px solid #b7eb8f; }
.analysis-card.cons { background: #fff1f0; border: 1px solid #ffa39e; }
@keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
.fade-in-up { animation: fadeInUp 0.8s ease forwards; opacity: 0; transform: translateY(30px); }
@keyframes fadeInUp { to { opacity: 1; transform: translateY(0); } }
.empty-state { text-align: center; padding: 60px; color: #9ca3af; }
.sub-text-modal { color: #6b7280; margin: 5px 0 10px; font-size: 0.9rem; }
/* New AI modal styles */
.ai-audit-modal :deep(.ant-modal-content) { border-radius: 24px; overflow: hidden; background: #ffffff; box-shadow: 0 25px 50px rgba(0,0,0,0.15); border: 1px solid #e5e7eb; position: relative; }
.ai-modal-bg-glow { position: absolute; top: -50px; left: -50px; width: 200px; height: 200px; background: radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 70%); z-index: 0; pointer-events: none; }
.ai-header { text-align: center; margin-bottom: 25px; position: relative; z-index: 1; border-bottom: 1px dashed #e5e7eb; padding-bottom: 15px; }
.ai-badge { display: inline-flex; align-items: center; gap: 8px; background: #7c3aed; color: white; padding: 6px 16px; border-radius: 30px; font-weight: 700; font-size: 0.85rem; letter-spacing: 1px; margin-bottom: 10px; box-shadow: 0 4px 15px rgba(124, 58, 237, 0.3); }
.ai-header h3 { margin: 0; font-size: 1.5rem; color: #1f2937; font-weight: 800; }
.ai-loading-container { height: 300px; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; }
.scanner-line { width: 100%; height: 2px; background: linear-gradient(90deg, transparent, #7c3aed, transparent); position: absolute; top: 0; animation: scan 2s linear infinite; }
@keyframes scan { 0% { top: 10%; opacity: 0; } 50% { opacity: 1; } 100% { top: 90%; opacity: 0; } }
.loading-terminal { font-family: 'Courier New', monospace; text-align: left; background: #f3f4f6; padding: 20px; border-radius: 12px; width: 80%; color: #4b5563; font-size: 0.9rem; border: 1px solid #e5e7eb; }
.blink { animation: blinking 1s infinite; }
@keyframes blinking { 50% { opacity: 0; } }
.score-card { display: flex; align-items: center; gap: 30px; margin-bottom: 30px; background: #f9fafb; padding: 20px; border-radius: 20px; border: 1px solid #f3f4f6; }
.gauge-container { width: 120px; height: 120px; border-radius: 50%; position: relative; background: #e5e7eb; display: flex; align-items: center; justify-content: center; }
.gauge-bg { position: absolute; width: 100%; height: 100%; border-radius: 50%; background: #e5e7eb; }
.gauge-fill { position: absolute; width: 100%; height: 100%; border-radius: 50%; mask: radial-gradient(transparent 55%, black 56%); -webkit-mask: radial-gradient(transparent 55%, black 56%); transition: all 1s ease-out; }
.gauge-center { position: absolute; background: white; width: 90px; height: 90px; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: 0 5px 15px rgba(0,0,0,0.05); z-index: 2; }
.score-val { font-size: 2.2rem; font-weight: 800; color: #1f2937; line-height: 1; }
.score-label { font-size: 0.8rem; color: #9ca3af; }
.score-right h2 { margin: 0 0 5px 0; font-size: 1.4rem; font-weight: 800; }
.verdict-text { color: #6b7280; font-size: 0.95rem; line-height: 1.5; margin: 0; }
.analysis-columns { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px; }
.col { background: white; padding: 15px; border-radius: 16px; border: 1px solid #f3f4f6; }
.col-head { font-weight: 700; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; font-size: 1rem; }
.pros-col { border-top: 4px solid #52c41a; box-shadow: 0 5px 15px rgba(82, 196, 26, 0.05); }
.pros-col .col-head { color: #389e0d; }
.cons-col { border-top: 4px solid #faad14; box-shadow: 0 5px 15px rgba(250, 173, 20, 0.05); }
.cons-col .col-head { color: #d48806; }
.col ul { padding-left: 20px; margin: 0; font-size: 0.9rem; color: #4b5563; }
.col li { margin-bottom: 6px; }
.ai-recommendation-box { display: flex; align-items: flex-start; gap: 15px; padding: 15px; border-radius: 12px; border: 1px solid transparent; }
.rec-approve { background: #f6ffed; border-color: #b7eb8f; }
.rec-approve .rec-icon { color: #52c41a; font-size: 1.5rem; }
.rec-approve h4 { color: #389e0d; }
.rec-reject { background: #fff1f0; border-color: #ffa39e; }
.rec-reject .rec-icon { color: #ff4d4f; font-size: 1.5rem; }
.rec-reject h4 { color: #cf1322; }
.rec-content h4 { margin: 0 0 5px 0; font-weight: 700; }
.rec-content p { margin: 0; font-size: 0.9rem; color: #4b5563; }
.fade-in-scale { animation: fadeInScale 0.4s ease forwards; }
@keyframes fadeInScale { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
</style>