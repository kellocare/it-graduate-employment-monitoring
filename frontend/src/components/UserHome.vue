<template>
  <div class="page-wrapper">

    <!-- ФОНОВЫЕ ПУЗЫРИ -->
    <div class="blobs-container">
      <div class="blob blob-1"></div>
      <div class="blob blob-2"></div>
      <div class="blob blob-3"></div>
    </div>

    <div class="content-container">

      <!-- ========================================= -->
      <!-- ВЕРСИЯ ДЛЯ АДМИНА                         -->
      <!-- ========================================= -->
      <template v-if="isAdmin">
        <!-- (Код админа из твоего файла, я его не трогаю, но добавляю @click для новостей) -->
        <div class="welcome-banner admin-banner fade-in-up">
          <div class="banner-content">
            <div class="greeting-badge admin-badge"><security-scan-filled /> Admin Mode</div>
            <h1>Центр управления</h1>
            <p class="subtitle">Полный контроль над платформой: модерация, пользователи, контент и логи.</p>
            <div class="stats-row">
              <div class="stat-glass"><strong>{{ adminStats.pendingVacancies || 0 }}</strong><span>На проверке</span></div>
              <div class="stat-glass"><strong>{{ adminStats.totalUsers || 0 }}</strong><span>Пользователей</span></div>
            </div>
          </div>
          <div class="banner-image-wrapper">
             <img src="https://static.tildacdn.com/tild3039-3361-4834-a533-386335343639/___9.png" class="banner-img floating" />
          </div>
        </div>

        <div class="dashboard-grid">
           <div class="left-column">
              <h3 class="section-title fade-in-up" style="animation-delay: 0.1s"><thunderbolt-filled class="title-icon" /> Быстрый доступ</h3>
              <div class="actions-grid">
                 <div class="glass-card action-card fade-in-up" style="animation-delay: 0.2s" @click="$router.push('/admin/vacancies')"><div class="icon-box purple-gradient"><audit-outlined /></div><div class="card-text"><h4>Модерация</h4><p>Проверка вакансий</p></div><div class="notification-badge" v-if="adminStats.pendingVacancies > 0">{{ adminStats.pendingVacancies }}</div></div>
                 <div class="glass-card action-card fade-in-up" style="animation-delay: 0.3s" @click="$router.push('/admin/users')"><div class="icon-box blue-gradient"><team-outlined /></div><div class="card-text"><h4>Пользователи</h4><p>База данных</p></div></div>
                 <div class="glass-card action-card fade-in-up" style="animation-delay: 0.4s" @click="$router.push('/admin')"><div class="icon-box orange-gradient"><line-chart-outlined /></div><div class="card-text"><h4>Аналитика</h4><p>Дашборд</p></div></div>
                 <div class="glass-card action-card fade-in-up" style="animation-delay: 0.5s" @click="$router.push('/admin/news')"><div class="icon-box pink-gradient"><read-filled /></div><div class="card-text"><h4>Новости</h4><p>Публикации</p></div></div>
                 <div class="glass-card action-card fade-in-up" style="animation-delay: 0.6s" @click="$router.push('/admin/logs')"><div class="icon-box gray-gradient"><history-outlined /></div><div class="card-text"><h4>Журнал</h4><p>Логи действий</p></div></div>
              </div>
              <h3 class="section-title fade-in-up mt-40" style="animation-delay: 0.3s"><hourglass-filled class="title-icon" style="color: #f59e0b;" /> Требуют проверки</h3>
              <div class="glass-card list-card fade-in-up" style="animation-delay: 0.4s">
                 <div v-if="pendingVacanciesList.length === 0" class="empty-mini"><check-circle-two-tone two-tone-color="#52c41a" style="font-size: 24px" /><p>Все проверено!</p></div>
                 <div v-else class="mini-list">
                    <div v-for="vac in pendingVacanciesList.slice(0, 3)" :key="vac.id" class="mini-item" @click="$router.push('/admin/vacancies')"><div class="mini-icon"><file-text-outlined /></div><div class="mini-info"><div class="mini-title">{{ vac.title }}</div><div class="mini-sub">{{ vac.company_name }}</div></div><right-outlined class="arrow-light" /></div>
                    <div class="view-all" @click="$router.push('/admin/vacancies')">Смотреть все ({{ pendingVacanciesList.length }})</div>
                 </div>
              </div>
              <!-- НОВОСТИ АДМИНА (ИСПРАВЛЕНО) -->
              <h3 class="section-title fade-in-up mt-40" style="animation-delay: 0.4s"><bell-filled style="color: #f59e0b;" class="title-icon" /> Опубликованные новости</h3>
              <div class="news-list fade-in-up" style="animation-delay: 0.5s">
                 <div v-if="newsList.length === 0" class="empty-news">Пока новостей нет</div>
                 <div v-for="news in newsList" :key="news.id" class="glass-card news-card" @click="openNewsModal(news)">
                    <div v-if="news.image_url" class="news-img" :style="{ backgroundImage: `url(${news.image_url})` }"></div>
                    <div class="news-body"><div class="news-meta">{{ new Date(news.created_at).toLocaleDateString() }}</div><h4>{{ news.title }}</h4><p>{{ news.content }}</p></div>
                 </div>
              </div>
           </div>
           <div class="right-column">
              <div class="glass-card widget-card fade-in-up" style="animation-delay: 0.3s"><div class="widget-header"><hdd-filled style="color: #10b981" /> <span>System Status</span></div><div class="server-status-list"><div class="status-row"><span>API Gateway</span><span class="status-val ok">Online</span></div><div class="status-row"><span>Database</span><span class="status-val ok">Connected</span></div><div class="status-row"><span>AI Service</span><span class="status-val ok">Active</span></div><div class="status-row"><span>Server Load</span><span class="status-val">12%</span></div></div></div>
              <div class="glass-card widget-card fade-in-up" style="animation-delay: 0.4s"><div class="widget-header"><user-add-outlined style="color: #6366f1" /> <span>Новые пользователи</span></div><div class="users-mini-list"><div v-for="u in latestUsers.slice(0, 4)" :key="u.id" class="user-mini-item"><a-avatar size="small" style="background-color: #87d068">{{ u.email[0].toUpperCase() }}</a-avatar><span class="u-email">{{ u.email }}</span><span class="u-role">{{ u.role === 'employer' ? 'HR' : 'Stud' }}</span></div></div><div class="view-all-link" @click="$router.push('/admin/users')">Все пользователи</div></div>
           </div>
        </div>
      </template>

      <!-- ========================================= -->
      <!-- ВЕРСИЯ ДЛЯ ПОЛЬЗОВАТЕЛЕЙ (СТУДЕНТ/HR)   -->
      <!-- ========================================= -->
      <template v-else>
        <div class="welcome-banner fade-in-up" :class="{ 'employer-banner': isEmployer }">
          <div class="banner-content">
            <div class="greeting-badge"><span class="dot-pulse"></span> {{ timeOfDay }}</div>
            <h1>{{ user?.first_name || 'Гость' }}, {{ isEmployer ? 'продуктивного дня!' : 'рады тебя видеть!' }}</h1>
            <p class="subtitle">{{ getWelcomeMessage() }}</p>
            <div class="stats-row" v-if="user">
              <div class="stat-glass"><strong>{{ isEmployer ? myVacanciesCount : vacancies.length }}</strong><span>{{ isEmployer ? 'Активных вакансий' : 'Вакансий всего' }}</span></div>
              <div class="stat-glass"><strong>{{ isEmployer ? applications.length : msgCount }}</strong><span>{{ isEmployer ? 'Новых откликов' : 'Сообщений' }}</span></div>
            </div>
          </div>
          <div class="banner-image-wrapper"><img :src="bannerImage" class="banner-img floating" /></div>
        </div>

        <div class="dashboard-grid" v-if="user">
          <div class="left-column">
            <h3 class="section-title fade-in-up" style="animation-delay: 0.1s"><appstore-filled class="title-icon" /> Рабочее пространство</h3>
            <div class="actions-grid">
              <template v-if="isEmployer">
                <div class="glass-card action-card fade-in-up" style="animation-delay: 0.2s" @click="$router.push('/employer')"><div class="icon-box blue-gradient"><bank-filled /></div><div class="card-text"><h4>Моя компания</h4><p>Профиль и настройки</p></div><div class="hover-arrow"><arrow-right-outlined /></div></div>
                <div class="glass-card action-card fade-in-up" style="animation-delay: 0.3s" @click="$router.push('/vacancies')"><div class="icon-box green-gradient"><plus-circle-filled /></div><div class="card-text"><h4>Создать вакансию</h4><p>Найти сотрудника</p></div><div class="hover-arrow"><arrow-right-outlined /></div></div>
                <div class="glass-card action-card fade-in-up" style="animation-delay: 0.4s" @click="$router.push('/employer')"><div class="icon-box orange-gradient"><team-outlined /></div><div class="card-text"><h4>Отклики</h4><p>Входящие заявки</p></div><div class="notification-badge" v-if="applications.length > 0">{{ applications.length }}</div></div>
                <div class="glass-card action-card fade-in-up" style="animation-delay: 0.5s" @click="$router.push('/messages')"><div class="icon-box purple-gradient"><message-filled /></div><div class="card-text"><h4>Мессенджер</h4><p>Связь с кандидатами</p></div><div class="hover-arrow"><arrow-right-outlined /></div></div>
              </template>
              <template v-else>
                <div class="glass-card action-card fade-in-up" style="animation-delay: 0.2s" @click="$router.push('/vacancies')"><div class="icon-box blue-gradient"><appstore-filled /></div><div class="card-text"><h4>Вакансии</h4><p>Поиск работы</p></div><div class="hover-arrow"><arrow-right-outlined /></div></div>
                <div class="glass-card action-card fade-in-up" style="animation-delay: 0.3s" @click="$router.push('/messages')"><div class="icon-box green-gradient"><message-filled /></div><div class="card-text"><h4>Мессенджер</h4><p>Связь с HR</p></div><div class="hover-arrow"><arrow-right-outlined /></div></div>
                <div class="glass-card action-card fade-in-up" style="animation-delay: 0.4s" @click="goToProfile"><div class="icon-box purple-gradient"><idcard-filled /></div><div class="card-text"><h4>Профиль</h4><p>Мои данные</p></div><div class="hover-arrow"><arrow-right-outlined /></div></div>
                <div class="glass-card action-card fade-in-up" style="animation-delay: 0.5s" @click="$router.push('/chat')"><div class="icon-box orange-gradient"><robot-filled /></div><div class="card-text"><h4>AI Ментор</h4><p>Карьерный рост</p></div><div class="beta-tag">Beta</div></div>
              </template>
            </div>

            <div v-if="!isEmployer && recommendedVacancies.length > 0" class="mt-40">
              <h3 class="section-title fade-in-up" style="animation-delay: 0.2s"><fire-filled style="color: #f56565;" class="title-icon" /> Рекомендуем вам</h3>
              <div class="recommendations-list fade-in-up" style="animation-delay: 0.3s">
                <div v-for="vac in recommendedVacancies" :key="vac.id" class="glass-card rec-card" @click="showDetails(vac)">
                    <div class="rec-left"><div class="company-logo"><bank-filled /></div><div class="rec-info"><h4>{{ vac.title }}</h4><p>{{ vac.company_name }}</p></div></div>
                    <div class="rec-right"><div class="match-badge"><thunderbolt-filled /> {{ vac.matchScore }}%</div><div class="rec-salary" v-if="vac.salary_min">{{ formatMoney(vac.salary_min) }} ₽</div><arrow-right-outlined class="arrow-light" /></div>
                </div>
              </div>
            </div>

            <!-- НОВОСТИ ПЛАТФОРМЫ (СТУДЕНТ) -->
            <h3 class="section-title fade-in-up mt-40" style="animation-delay: 0.4s"><bell-filled style="color: #f59e0b;" class="title-icon" /> Новости платформы</h3>
            <div class="news-list fade-in-up" style="animation-delay: 0.5s">
               <div v-if="newsList.length === 0" class="empty-news">Пока новостей нет</div>
               <!-- ДОБАВЛЕН @click="openNewsModal(news)" -->
               <div v-for="news in newsList" :key="news.id" class="glass-card news-card" @click="openNewsModal(news)">
                  <div v-if="news.image_url" class="news-img" :style="{ backgroundImage: `url(${news.image_url})` }"></div>
                  <div class="news-body"><div class="news-meta">{{ new Date(news.created_at).toLocaleDateString() }}</div><h4>{{ news.title }}</h4><p>{{ news.content }}</p></div>
               </div>
            </div>
          </div>

          <div class="right-column">
            <div class="glass-card widget-card ai-tip-card fade-in-up" style="animation-delay: 0.3s">
              <div class="widget-header"><bulb-filled style="color: #f59e0b" /> <span>Совет дня</span></div>
              <p class="tip-text">{{ isEmployer ? '"Детальное описание стека повышает релевантность."' : '"Заполните раздел О себе ключевыми навыками."' }}</p>
            </div>
            <div class="glass-card widget-card fade-in-up" style="animation-delay: 0.4s">
               <div class="widget-header"><clock-circle-outlined style="color: #6366f1" /> <span>Активность</span></div>
               <a-timeline class="custom-timeline">
                  <a-timeline-item color="green">Вход выполнен</a-timeline-item>
                  <a-timeline-item v-if="isEmployer && applications.length > 0" color="blue">Новый отклик</a-timeline-item>
                  <a-timeline-item v-if="!isEmployer && user.fullProfile?.about_me" color="purple">Навыки заполнены</a-timeline-item>
                  <a-timeline-item color="gray">Поиск...</a-timeline-item>
               </a-timeline>
            </div>
          </div>
        </div>
      </template>

    </div>

    <!-- === НОВАЯ МОДАЛКА НОВОСТИ === -->
    <a-modal
      v-model:open="newsModalVisible"
      :footer="null"
      width="700px"
      centered
      class="news-modal"
    >
      <div v-if="selectedNews" class="news-modal-content">
         <div class="news-hero" v-if="selectedNews.image_url" :style="{ backgroundImage: `url(${selectedNews.image_url})` }"></div>
         <div class="news-detail-body">
            <span class="news-date-badge"><calendar-outlined /> {{ new Date(selectedNews.created_at).toLocaleDateString() }}</span>
            <h2>{{ selectedNews.title }}</h2>
            <div class="news-text-full">{{ selectedNews.content }}</div>
            <button class="btn-close-news" @click="newsModalVisible = false">Закрыть</button>
         </div>
      </div>
    </a-modal>

    <!-- Старые модалки (Detail, Test) -->
    <a-modal v-model:open="detailVisible" :footer="null" width="750px" centered class="vacancy-modal"><div v-if="selectedVacancy" class="modal-content-inner"><div class="modal-hero"><div class="modal-badge">{{ selectedVacancy.company_name }}</div><h2>{{ selectedVacancy.title }}</h2><div class="modal-meta"><span v-if="selectedVacancy.salary_min" class="salary-tag">{{ formatMoney(selectedVacancy.salary_min) }} ₽</span><span class="date-tag"><calendar-outlined /> {{ formatDate(selectedVacancy.created_at) }}</span></div></div><div class="ai-insight-box" v-if="selectedVacancy.ai_summary"><div class="ai-title"><robot-filled /> AI Резюме</div><p class="ai-text">{{ selectedVacancy.ai_summary }}</p></div><div class="modal-section"><h4>Требуемые навыки</h4><div class="skills-cloud"><span v-for="skill in selectedVacancy.skills" :key="skill" class="skill-tag large">{{ skill }}</span></div></div><div class="modal-section"><h4>Описание вакансии</h4><p class="desc-text">{{ selectedVacancy.description }}</p></div><div class="modal-footer-row"><div class="contact-info" v-if="selectedVacancy.contact_email"><mail-outlined /> {{ selectedVacancy.contact_email }}</div><a-button v-if="user && user.role === 'graduate'" type="primary" class="btn-respond" @click="startFromDetail(selectedVacancy.id)">Откликнуться</a-button></div></div></a-modal>
    <a-modal v-model:open="showTestModal" :footer="null" width="600px"><div class="modal-content-wrapper"><div v-if="testLoading" class="center"><div class="spinner-icon"><robot-outlined spin /></div><h3>ИИ генерирует тест...</h3></div><div v-else-if="currentApplication && !testResult" class="modal-body"><h3>Отклик на вакансию</h3><div class="form-group mt-20"><label>Сопроводительное письмо</label><a-textarea v-model:value="coverLetter" :rows="3" /></div><a-divider /><h4>Блиц-тест от ИИ</h4><div class="questions-list"><div v-for="(question, index) in currentApplication.test_tasks" :key="index" class="question-item"><p class="q-text"><strong>{{ index + 1 }}:</strong> {{ question }}</p><a-textarea v-model:value="studentAnswers[index]" :rows="2" /></div></div><div class="modal-actions"><button class="btn-submit" @click="submitAnswers" :disabled="submitting">{{ submitting ? '...' : 'Отправить' }}</button><button class="btn-close-text" @click="cancelAndClose">Отмена</button></div></div><div v-else-if="testResult" class="modal-body result-box"><div class="score-circle">{{ testResult.ai_score }}</div><h3>{{ testResult.status === 'accepted' ? 'Успех!' : 'Отказ' }}</h3><button class="btn-close-main" @click="closeModal">Закрыть</button></div></div></a-modal>

  </div>
</template>

<script>
import { useRouter, useRoute } from 'vue-router';
import { computed, ref, onMounted, watch } from 'vue';
import api from '../axios';
import { message } from 'ant-design-vue';
import {
  AppstoreFilled, MessageFilled, IdcardFilled, RobotFilled, ArrowRightOutlined, CheckCircleFilled, ThunderboltFilled, BulbFilled,
  BankFilled, RocketFilled, ClockCircleOutlined, CloseCircleOutlined, SmileTwoTone, FireFilled, ReadFilled, MailOutlined,
  LoadingOutlined, FormOutlined, ThunderboltTwoTone, CheckCircleTwoTone, CloseCircleTwoTone, CalendarOutlined,
  TeamOutlined, PlusCircleFilled, UserAddOutlined, SecurityScanFilled, AuditOutlined, LineChartOutlined, HddFilled, UserOutlined,
  HourglassFilled, FileTextOutlined, RightOutlined, BellFilled, HistoryOutlined
} from '@ant-design/icons-vue';

export default {
  props: ['user'],
  components: {
    AppstoreFilled, MessageFilled, IdcardFilled, RobotFilled, ArrowRightOutlined, CheckCircleFilled, ThunderboltFilled, BulbFilled,
    BankFilled, RocketFilled, ClockCircleOutlined, CloseCircleOutlined, SmileTwoTone, FireFilled, ReadFilled, MailOutlined,
    LoadingOutlined, FormOutlined, ThunderboltTwoTone, CheckCircleTwoTone, CloseCircleTwoTone, CalendarOutlined,
    TeamOutlined, PlusCircleFilled, UserAddOutlined, SecurityScanFilled, AuditOutlined, LineChartOutlined, HddFilled, UserOutlined,
    HourglassFilled, FileTextOutlined, RightOutlined, BellFilled, HistoryOutlined
  },
  setup(props) {
    const router = useRouter();
    const route = useRoute();
    const currentUser = ref(null);

    const msgCount = ref(0);
    const vacancies = ref([]);
    const applications = ref([]);
    const myVacanciesCount = ref(0);
    const newsList = ref([]);

    const adminStats = ref({ pendingVacancies: 0, totalUsers: 0 });
    const pendingVacanciesList = ref([]);
    const latestUsers = ref([]);

    const detailVisible = ref(false);
    const selectedVacancy = ref(null);
    const showTestModal = ref(false);
    const testLoading = ref(false);
    const submitting = ref(false);
    const currentApplication = ref(null);
    const testResult = ref(null);
    const studentAnswers = ref([]);
    const coverLetter = ref('');

    // State для новостей
    const newsModalVisible = ref(false);
    const selectedNews = ref(null);

    const isAdmin = computed(() => currentUser.value?.role === 'admin');
    const isEmployer = computed(() => currentUser.value?.role === 'employer');

    const bannerImage = computed(() => {
        if (isAdmin.value) return 'https://static.tildacdn.com/tild3039-3361-4834-a533-386335343639/___9.png';
        return isEmployer.value ? 'https://i.pinimg.com/originals/80/b6/f7/80b6f7ced693e43cf3d1d6e7e69277c0.png' : 'https://cdn2.iconfinder.com/data/icons/3d-abstract-iridescent-shape/512/ABSTRACT_OBJEct_v2_1.png';
    });

    const loadData = async () => {
        const userData = localStorage.getItem('user');
        if (userData) currentUser.value = JSON.parse(userData);
        if (!currentUser.value) return;

        try {
            const msgRes = await api.get('/messages/unread');
            msgCount.value = msgRes.data.count;

            // Грузим новости и проверяем URL
            try {
                const newsRes = await api.get('/news');
                newsList.value = newsRes.data;
                checkNewsParam();
            } catch(e) {}

            if (isAdmin.value) {
                const vacRes = await api.get('/vacancies/admin/all');
                const usersRes = await api.get('/admin/users');
                pendingVacanciesList.value = vacRes.data.filter(v => v.status === 'pending');
                latestUsers.value = usersRes.data;
                adminStats.value = { pendingVacancies: pendingVacanciesList.value.length, totalUsers: usersRes.data.length };
            }
            else if (isEmployer.value) {
                const appRes = await api.get('/applications/employer');
                applications.value = appRes.data;
                const myVacRes = await api.get('/vacancies/my');
                myVacanciesCount.value = myVacRes.data.length;
            }
            else {
                const vacRes = await api.get('/vacancies');
                vacancies.value = vacRes.data;
                const profRes = await api.get('/graduates/me');
                if(currentUser.value) currentUser.value.fullProfile = profRes.data;
            }
        } catch (e) {}
    };

    // ЛОГИКА ОТКРЫТИЯ НОВОСТИ
    const openNewsModal = (news) => {
        selectedNews.value = news;
        newsModalVisible.value = true;
    };

    const checkNewsParam = () => {
        const newsId = route.query.news_id;
        if (newsId && newsList.value.length > 0) {
            const target = newsList.value.find(n => n.id == newsId);
            if (target) {
                openNewsModal(target);
                router.replace({ query: null });
            }
        }
    };

    // Если URL поменялся (например, кликнули в навбаре)
    watch(() => route.query.news_id, (newId) => {
        if (newId && newsList.value.length > 0) checkNewsParam();
    });

    onMounted(loadData);

    const goToProfile = () => router.push(isEmployer.value ? '/employer' : '/profile');
    const getWelcomeMessage = () => isEmployer.value ? 'Управляйте наймом.' : 'Новые вакансии ждут.';
    const timeOfDay = computed(() => { const h = new Date().getHours(); return h<12?'Доброе утро':h<18?'Добрый день':'Добрый вечер'; });

    const recommendedVacancies = computed(() => {
       if(!currentUser.value?.fullProfile?.about_me) return [];
       const userText = currentUser.value.fullProfile.about_me.toLowerCase();
       return vacancies.value.map(v=>{ let m=0; if(v.skills) v.skills.forEach(s=>{if(userText.includes(s.toLowerCase()))m++}); return {...v, matchScore: Math.round((m/(v.skills?.length||1))*100)||10}; }).sort((a,b)=>b.matchScore-a.matchScore).slice(0,3);
    });

    const showDetails = (vac) => { selectedVacancy.value=vac; detailVisible.value=true; };
    const startFromDetail = (id) => { detailVisible.value=false; startApplication(id); };
    const startApplication = async (id) => { showTestModal.value=true; testLoading.value=true; currentApplication.value=null; try{ const r=await api.post('/applications/start',{vacancy_id:id}); currentApplication.value=r.data; let t=currentApplication.value.test_tasks; if(typeof t==='string') t=JSON.parse(t); currentApplication.value.test_tasks=Array.isArray(t)?t:[t]; studentAnswers.value=new Array(t.length).fill(''); }catch(e){showTestModal.value=false;}finally{testLoading.value=false;} };
    const submitAnswers = async () => { submitting.value=true; try{ const r=await api.post('/applications/submit',{application_id:currentApplication.value.id, answers:studentAnswers.value, cover_letter:coverLetter.value}); testResult.value=r.data; }catch(e){}finally{submitting.value=false;} };
    const cancelAndClose = () => { closeModal(); };
    const closeModal = () => { showTestModal.value=false; };
    const formatMoney = (v) => new Intl.NumberFormat('ru-RU').format(v);
    const formatDate = (v) => new Date(v).toLocaleDateString('ru-RU');
    const getAvatarUrl = (url) => url ? `http://localhost:4000${url}` : null;

    return {
        user: currentUser, isAdmin, isEmployer, adminStats, pendingVacanciesList, latestUsers, newsList,
        goToProfile, getWelcomeMessage, timeOfDay, msgCount, vacancies, applications, myVacanciesCount,
        recommendedVacancies, showDetails, detailVisible, selectedVacancy, startFromDetail,
        showTestModal, testLoading, submitting, currentApplication, studentAnswers, coverLetter, testResult,
        submitAnswers, cancelAndClose, closeModal, formatMoney, formatDate, bannerImage, getAvatarUrl,
        newsModalVisible, selectedNews, openNewsModal
    };
  }
}
</script>

<style scoped>
/* ИСПРАВЛЕННАЯ АНИМАЦИЯ */
@keyframes float {
  0% { transform: translateY(0px); }
  50% { transform: translateY(-20px); }
  100% { transform: translateY(0px); }
}

/* Стили новостной модалки */
.news-modal-content { overflow: hidden; border-radius: 12px; }
.news-hero { height: 250px; background-size: cover; background-position: center; }
.news-detail-body { padding: 30px; background: white; }
.news-date-badge { background: #f3f4f6; padding: 6px 12px; border-radius: 20px; color: #6b7280; font-size: 0.85rem; display: inline-flex; align-items: center; gap: 6px; margin-bottom: 15px; }
.news-detail-body h2 { font-size: 2rem; font-weight: 800; color: #1f2937; margin-bottom: 20px; line-height: 1.3; }
.news-text-full { font-size: 1.05rem; line-height: 1.8; color: #4b5568; white-space: pre-line; margin-bottom: 30px; }
.btn-close-news { background: #1f2937; color: white; border: none; padding: 12px 30px; border-radius: 10px; cursor: pointer; font-weight: 600; transition: 0.2s; display: block; margin: 0 auto; }
.btn-close-news:hover { background: #111827; transform: translateY(-2px); }

/* Остальные стили (Баннер, Грид и т.д.) скопированы из твоего файла... */
.page-wrapper { position: relative; width: 100%; min-height: 90vh; overflow-x: hidden; background: #f3f4f6; display: flex; justify-content: center; padding: 40px 20px; }
.blobs-container { position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 0; }
.blob { position: absolute; border-radius: 50%; filter: blur(60px); opacity: 0.5; animation: float 10s infinite alternate; }
.blob-1 { width: 400px; height: 400px; background: #a855f7; top: -100px; left: -100px; }
.blob-2 { width: 300px; height: 300px; background: #3b82f6; bottom: -50px; right: -50px; animation-delay: 2s; }
.blob-3 { width: 250px; height: 250px; background: #ec4899; top: 30%; left: 40%; opacity: 0.3; animation-duration: 15s; }
.content-container { position: relative; z-index: 1; width: 100%; max-width: 1100px; display: flex; flex-direction: column; gap: 30px; }
.glass-card { background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.9); border-radius: 24px; box-shadow: 0 10px 40px rgba(0,0,0,0.05); transition: all 0.3s ease; }
.welcome-banner { background: linear-gradient(120deg, #6366f1 0%, #8b5cf6 100%); border-radius: 24px; padding: 0 50px; height: 280px; color: white; display: flex; justify-content: space-between; align-items: center; position: relative; overflow: hidden; box-shadow: 0 20px 40px rgba(99, 102, 241, 0.25); }
.employer-banner { background: linear-gradient(120deg, #2d3748 0%, #4a5568 100%); box-shadow: 0 20px 40px rgba(45, 55, 72, 0.3); }
.admin-banner { background: linear-gradient(120deg, #1f2937 0%, #374151 100%); box-shadow: 0 20px 40px rgba(0,0,0,0.4); }
.welcome-banner::before { content: ''; position: absolute; top: -50px; left: -50px; width: 200px; height: 200px; background: rgba(255,255,255,0.1); border-radius: 50%; filter: blur(40px); }
.banner-content { position: relative; z-index: 2; max-width: 60%; }
.greeting-badge { display: inline-flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.2); backdrop-filter: blur(5px); padding: 6px 14px; border-radius: 20px; font-size: 0.9rem; font-weight: 600; margin-bottom: 15px; border: 1px solid rgba(255,255,255,0.1); }
.admin-badge { background: rgba(255, 99, 71, 0.15); color: #ffccc7; border-color: rgba(255, 99, 71, 0.2); }
.dot-pulse { width: 8px; height: 8px; background: #4fd1c5; border-radius: 50%; animation: pulse-white 2s infinite; }
.welcome-banner h1 { font-size: 2.5rem; font-weight: 800; margin-bottom: 10px; line-height: 1.2; }
.subtitle { font-size: 1.1rem; opacity: 0.9; margin-bottom: 30px; font-weight: 300; }
.stats-row { display: flex; gap: 15px; }
.stat-glass { background: rgba(255,255,255,0.15); backdrop-filter: blur(5px); border: 1px solid rgba(255,255,255,0.2); border-radius: 16px; padding: 10px 20px; display: flex; flex-direction: column; align-items: center; min-width: 100px; }
.stat-glass strong { font-size: 1.5rem; font-weight: 800; }
.stat-glass span { font-size: 0.8rem; opacity: 0.9; text-transform: uppercase; }
.banner-image-wrapper { width: 350px; height: 100%; display: flex; align-items: flex-end; justify-content: center; padding-bottom: 20px; }
.banner-img { max-height: 240px; max-width: 100%; filter: drop-shadow(0 20px 30px rgba(0,0,0,0.3)); transition: transform 0.3s; }
.floating { animation: float 6s ease-in-out infinite; }
.dashboard-grid { display: grid; grid-template-columns: 1fr 320px; gap: 30px; }
.section-title { font-size: 1.3rem; font-weight: 800; color: #1f2937; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }
.title-icon { font-size: 1.4rem; color: #6366f1; }
.mt-40 { margin-top: 40px; }
.actions-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
.action-card { padding: 20px; display: flex; flex-direction: column; justify-content: space-between; height: 160px; cursor: pointer; position: relative; }
.action-card:hover { transform: translateY(-5px); box-shadow: 0 20px 40px rgba(0,0,0,0.08); }
.icon-box { width: 48px; height: 48px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 22px; color: white; margin-bottom: 15px; }
.blue-gradient { background: linear-gradient(135deg, #3b82f6, #2563eb); }
.green-gradient { background: linear-gradient(135deg, #10b981, #059669); }
.purple-gradient { background: linear-gradient(135deg, #8b5cf6, #7c3aed); }
.orange-gradient { background: linear-gradient(135deg, #f59e0b, #d97706); }
.pink-gradient { background: linear-gradient(135deg, #ec4899, #db2777); }
.gray-gradient { background: linear-gradient(135deg, #4b5563, #1f2937); }
.card-text h4 { margin: 0; font-weight: 700; color: #111827; font-size: 1.1rem; }
.card-text p { margin: 4px 0 0; font-size: 0.85rem; color: #6b7280; }
.hover-arrow { position: absolute; top: 20px; right: 20px; color: #cbd5e1; transition: 0.3s; }
.action-card:hover .hover-arrow { color: #6366f1; transform: translateX(5px); }
.notification-badge { position: absolute; top: 20px; right: 20px; background: #ff4d4f; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.8rem; }
.news-list { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.news-card { overflow: hidden; display: flex; flex-direction: column; cursor: pointer; }
.news-card:hover { transform: translateY(-5px); }
.news-img { height: 140px; background-size: cover; background-position: center; }
.news-body { padding: 15px; }
.news-body h4 { font-weight: 700; font-size: 1rem; margin: 0 0 5px; color: #1f2937; }
.news-body p { font-size: 0.85rem; color: #6b7280; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.news-meta { font-size: 0.75rem; color: #9ca3af; margin-bottom: 5px; }
.empty-news { text-align: center; padding: 20px; color: #9ca3af; width: 100%; }
.list-card { padding: 15px; }
.mini-list { display: flex; flex-direction: column; gap: 10px; }
.mini-item { display: flex; align-items: center; gap: 12px; padding: 10px; border-radius: 12px; cursor: pointer; transition: 0.2s; }
.mini-item:hover { background: rgba(0,0,0,0.03); }
.mini-icon { width: 36px; height: 36px; background: #fef3c7; color: #d97706; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
.mini-info { flex: 1; }
.mini-title { font-weight: 600; font-size: 0.9rem; color: #374151; }
.mini-sub { font-size: 0.75rem; color: #9ca3af; }
.view-all { text-align: center; margin-top: 10px; font-size: 0.85rem; color: #6366f1; cursor: pointer; font-weight: 600; }
.widget-card { padding: 20px; margin-bottom: 20px; }
.widget-header { font-weight: 800; color: #1f2937; margin-bottom: 15px; display: flex; align-items: center; gap: 8px; font-size: 1rem; }
.server-status-list { display: flex; flex-direction: column; gap: 8px; }
.status-row { display: flex; justify-content: space-between; font-size: 0.9rem; color: #4b5563; padding: 4px 0; border-bottom: 1px solid #f3f4f6; }
.status-row:last-child { border: none; }
.status-val { font-weight: 700; color: #1f2937; }
.status-val.ok { color: #10b981; }
.users-mini-list { display: flex; flex-direction: column; gap: 8px; }
.user-mini-item { display: flex; align-items: center; gap: 10px; padding: 6px 0; border-bottom: 1px solid #f0f0f0; }
.u-email { font-size: 0.85rem; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.u-role { font-size: 0.7rem; background: #f3f4f6; padding: 2px 6px; border-radius: 4px; color: #6b7280; }
.view-all-link { text-align: center; margin-top: 15px; color: #6366f1; font-size: 0.85rem; cursor: pointer; font-weight: 600; }
.recommendations-list { display: flex; flex-direction: column; gap: 15px; }
.rec-card { padding: 15px 25px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; }
.rec-card:hover { transform: translateX(5px); background: rgba(255,255,255,0.9); }
.rec-left { display: flex; align-items: center; gap: 15px; }
.company-logo { width: 42px; height: 42px; border-radius: 12px; background: #f3f4f6; color: #6b7280; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; }
.rec-info h4 { margin: 0; font-weight: 700; color: #1f2937; font-size: 1rem; }
.rec-info p { margin: 0; font-size: 0.85rem; color: #6b7280; }
.rec-right { display: flex; align-items: center; gap: 15px; }
.match-badge { background: #ecfdf5; color: #059669; padding: 4px 10px; border-radius: 8px; font-size: 0.85rem; font-weight: 700; display: flex; gap: 5px; align-items: center; }
.rec-salary { font-weight: 700; color: #1f2937; font-size: 0.95rem; }
.arrow-light { color: #cbd5e1; }
.ai-tip-card { background: linear-gradient(135deg, rgba(255, 251, 235, 0.8) 0%, rgba(255, 255, 255, 0.8) 100%); border-color: #fde68a; }
.tip-text { font-size: 0.95rem; color: #b45309; font-style: italic; line-height: 1.6; }
.fade-in-up { animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; transform: translateY(20px); }
@keyframes fadeInUp { to { opacity: 1; transform: translateY(0); } }
@keyframes pulse-white { 0% { box-shadow: 0 0 0 0 rgba(255,255,255,0.7); } 70% { box-shadow: 0 0 0 10px rgba(255,255,255,0); } 100% { box-shadow: 0 0 0 0 rgba(255,255,255,0); } }
.modal-hero { text-align: center; margin-bottom: 30px; }
.modal-badge { display: inline-block; background: #edf2f7; padding: 4px 12px; border-radius: 6px; font-size: 0.85rem; color: #4a5568; font-weight: 600; margin-bottom: 10px; }
.modal-hero h2 { font-size: 2rem; font-weight: 800; color: #1a202c; line-height: 1.2; }
.modal-meta { display: flex; justify-content: center; gap: 15px; margin-top: 15px; }
.salary-tag { background: #def7ec; color: #046c4e; padding: 6px 12px; border-radius: 8px; font-weight: 700; }
.date-tag { background: #fff; border: 1px solid #e2e8f0; color: #718096; padding: 6px 12px; border-radius: 8px; font-size: 0.9rem; }
.ai-insight-box { background: linear-gradient(135deg, #f3e8ff 0%, #e9d8fd 100%); border: 1px solid #d6bcfa; padding: 20px; border-radius: 16px; margin-bottom: 30px; position: relative; overflow: hidden; }
.ai-title { font-weight: 800; color: #6b46c1; display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.ai-text { color: #553c9a; line-height: 1.6; font-size: 0.95rem; }
.modal-section { margin-bottom: 30px; }
.modal-section h4 { font-size: 1.1rem; font-weight: 700; color: #2d3748; margin-bottom: 15px; border-left: 4px solid #764ba2; padding-left: 10px; }
.skill-tag { background: #ebf8ff; color: #3182ce; padding: 5px 12px; border-radius: 12px; font-size: 0.8rem; font-weight: 600; margin-right: 5px; display: inline-block; margin-bottom: 5px; }
.desc-text { white-space: pre-line; color: #4a5568; line-height: 1.8; font-size: 1rem; }
.modal-footer-row { display: flex; justify-content: space-between; align-items: center; background: #f7fafc; padding: 20px; border-radius: 12px; margin-top: 20px; }
.contact-info { font-weight: 600; color: #4a5568; display: flex; align-items: center; gap: 8px; }
.btn-respond { background: #764ba2; border-color: #764ba2; font-weight: 700; }
.btn-respond:hover { background: #6b46c1; border-color: #6b46c1; }
.modal-content-wrapper { padding: 10px; color: #333; }
.center { text-align: center; }
.spinner-icon { font-size: 3em; color: #1890ff; margin-bottom: 20px; }
.question-item { margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 15px; }
.q-text { font-weight: bold; color: #000000; margin-bottom: 10px; font-size: 1.1em; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
.btn-submit { background: #27ae60; color: white; padding: 10px 20px; border: none; border-radius: 6px; font-weight: bold; }
.btn-close-text { background: #e74c3c; border: none; color: white; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: bold; }
.result-box { text-align: center; }
.score-circle { width: 80px; height: 80px; border-radius: 50%; background: #333; color: white; display: flex; justify-content: center; align-items: center; font-size: 2em; font-weight: bold; margin: 0 auto 20px; }
.result-box.accepted .score-circle { background: #2ecc71; }
.result-box.rejected .score-circle { background: #e74c3c; }
.btn-close-main { background: #333; color: white; padding: 10px 30px; border: none; border-radius: 6px; margin-top: 20px; }
</style>