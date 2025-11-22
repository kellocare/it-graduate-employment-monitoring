<template>
  <div class="page-wrapper">

    <!-- ФОНОВЫЕ ПУЗЫРИ -->
    <div class="blobs-container">
      <div class="blob blob-1"></div>
      <div class="blob blob-2"></div>
      <div class="blob blob-3"></div>
    </div>

    <div class="content-container">

      <!-- 1. БАННЕР -->
      <div class="welcome-banner fade-in-up" :class="{ 'employer-banner': isEmployer }">
        <div class="banner-content">
          <div class="greeting-badge">
            <span class="dot-pulse"></span> {{ timeOfDay }}
          </div>
          <h1>{{ user.first_name }}, {{ isEmployer ? 'продуктивного дня!' : 'рады тебя видеть!' }}</h1>

          <p class="subtitle">{{ getWelcomeMessage() }}</p>

          <div class="stats-row">
            <div class="stat-glass">
              <!-- Для Студента: Вакансии на сайте. Для HR: Мои активные вакансии -->
              <strong>{{ isEmployer ? myVacanciesCount : vacancies.length }}</strong>
              <span>{{ isEmployer ? 'Активных вакансий' : 'Вакансий всего' }}</span>
            </div>
            <div class="stat-glass">
              <!-- Для Студента: Сообщения. Для HR: Новые отклики -->
              <strong>{{ isEmployer ? applications.length : msgCount }}</strong>
              <span>{{ isEmployer ? 'Новых откликов' : 'Сообщений' }}</span>
            </div>
          </div>
        </div>

        <div class="banner-image-wrapper">
          <!-- ДИНАМИЧЕСКАЯ КАРТИНКА -->
          <img :src="bannerImage" class="banner-img floating" />
        </div>
      </div>

      <div class="dashboard-grid">

        <!-- ЛЕВАЯ КОЛОНКА -->
        <div class="left-column">

          <!-- === РАБОЧЕЕ ПРОСТРАНСТВО (МЕНЯЕТСЯ ОТ РОЛИ) === -->
          <h3 class="section-title fade-in-up" style="animation-delay: 0.1s">
            <appstore-filled class="title-icon" /> Рабочее пространство
          </h3>

          <div class="actions-grid">

            <!-- КАРТОЧКИ ДЛЯ РАБОТОДАТЕЛЯ -->
            <template v-if="isEmployer">
              <div class="glass-card action-card fade-in-up" style="animation-delay: 0.2s" @click="$router.push('/employer')">
                <div class="icon-box blue-gradient"><bank-filled /></div>
                <div class="card-text"><h4>Моя компания</h4><p>Профиль и настройки</p></div>
                <div class="hover-arrow"><arrow-right-outlined /></div>
              </div>

              <div class="glass-card action-card fade-in-up" style="animation-delay: 0.3s" @click="$router.push('/vacancies')">
                <div class="icon-box green-gradient"><plus-circle-filled /></div>
                <div class="card-text"><h4>Создать вакансию</h4><p>Найти сотрудника</p></div>
                <div class="hover-arrow"><arrow-right-outlined /></div>
              </div>

              <div class="glass-card action-card fade-in-up" style="animation-delay: 0.4s" @click="$router.push('/employer')"> <!-- Ведет в таб откликов -->
                <div class="icon-box orange-gradient"><team-outlined /></div>
                <div class="card-text"><h4>Отклики</h4><p>Входящие заявки</p></div>
                <div class="notification-badge" v-if="applications.length > 0">{{ applications.length }}</div>
              </div>

              <div class="glass-card action-card fade-in-up" style="animation-delay: 0.5s" @click="$router.push('/messages')">
                <div class="icon-box purple-gradient"><message-filled /></div>
                <div class="card-text"><h4>Мессенджер</h4><p>Связь с кандидатами</p></div>
                <div class="hover-arrow"><arrow-right-outlined /></div>
              </div>
            </template>

            <!-- КАРТОЧКИ ДЛЯ СТУДЕНТА -->
            <template v-else>
              <div class="glass-card action-card fade-in-up" style="animation-delay: 0.2s" @click="$router.push('/vacancies')">
                <div class="icon-box blue-gradient"><appstore-filled /></div>
                <div class="card-text"><h4>Вакансии</h4><p>Поиск работы</p></div>
                <div class="hover-arrow"><arrow-right-outlined /></div>
              </div>
              <div class="glass-card action-card fade-in-up" style="animation-delay: 0.3s" @click="$router.push('/messages')">
                <div class="icon-box green-gradient"><message-filled /></div>
                <div class="card-text"><h4>Мессенджер</h4><p>Связь с HR</p></div>
                <div class="hover-arrow"><arrow-right-outlined /></div>
              </div>
              <div class="glass-card action-card fade-in-up" style="animation-delay: 0.4s" @click="goToProfile">
                <div class="icon-box purple-gradient"><idcard-filled /></div>
                <div class="card-text"><h4>Профиль</h4><p>Мои данные</p></div>
                <div class="hover-arrow"><arrow-right-outlined /></div>
              </div>
              <div class="glass-card action-card fade-in-up" style="animation-delay: 0.5s" @click="$router.push('/chat')">
                <div class="icon-box orange-gradient"><robot-filled /></div>
                <div class="card-text"><h4>AI Ментор</h4><p>Карьерный рост</p></div>
                <div class="beta-tag">Beta</div>
              </div>
            </template>
          </div>

          <!-- === СРЕДНИЙ БЛОК (МЕНЯЕТСЯ ОТ РОЛИ) === -->

          <!-- ДЛЯ СТУДЕНТА: РЕКОМЕНДАЦИИ -->
          <div v-if="!isEmployer && recommendedVacancies.length > 0" class="mt-40">
            <h3 class="section-title fade-in-up" style="animation-delay: 0.2s">
              <fire-filled style="color: #f56565;" class="title-icon" /> Рекомендуем вам
            </h3>
            <div class="recommendations-list fade-in-up" style="animation-delay: 0.3s">
              <div v-for="vac in recommendedVacancies" :key="vac.id" class="glass-card rec-card" @click="showDetails(vac)">
                  <div class="rec-left">
                    <div class="company-logo"><bank-filled /></div>
                    <div class="rec-info"><h4>{{ vac.title }}</h4><p>{{ vac.company_name }}</p></div>
                  </div>
                  <div class="rec-right">
                    <div class="match-badge"><thunderbolt-filled /> {{ vac.matchScore }}%</div>
                    <div class="rec-salary" v-if="vac.salary_min">{{ formatMoney(vac.salary_min) }} ₽</div>
                    <arrow-right-outlined class="arrow-light" />
                  </div>
              </div>
            </div>
          </div>

          <!-- ДЛЯ РАБОТОДАТЕЛЯ: ПОСЛЕДНИЕ ОТКЛИКИ -->
          <div v-if="isEmployer && applications.length > 0" class="mt-40">
            <h3 class="section-title fade-in-up" style="animation-delay: 0.2s">
              <user-add-outlined style="color: #f56565;" class="title-icon" /> Новые отклики
            </h3>
            <div class="recommendations-list fade-in-up" style="animation-delay: 0.3s">
              <div v-for="app in applications.slice(0, 3)" :key="app.id" class="glass-card rec-card" @click="$router.push('/employer')">
                  <div class="rec-left">
                    <a-avatar :src="getAvatarUrl(app.avatar_url)" :size="40" style="background-color: #87d068"><template #icon><user-outlined /></template></a-avatar>
                    <div class="rec-info">
                      <h4>{{ app.first_name }} {{ app.last_name }}</h4>
                      <p>на вакансию: {{ app.vacancy_title }}</p>
                    </div>
                  </div>
                  <div class="rec-right">
                    <div class="match-badge ai-score">AI Score: {{ app.ai_score }}</div>
                    <arrow-right-outlined class="arrow-light" />
                  </div>
              </div>
            </div>
          </div>

          <!-- ПОЛЕЗНЫЕ МАТЕРИАЛЫ (РАЗНЫЕ ДЛЯ РОЛЕЙ) -->
           <h3 class="section-title fade-in-up" style="animation-delay: 0.4s; margin-top: 40px">
            <read-filled style="color: #4299e1;" class="title-icon" /> База знаний
          </h3>

          <div class="articles-grid fade-in-up" style="animation-delay: 0.5s">
             <!-- Статьи для СТУДЕНТА -->
             <template v-if="!isEmployer">
               <div class="glass-card article-card" @click="openArticle('https://hh.ru/article/301114')">
                  <div class="article-img" style="background-image: url('https://cdni.iconscout.com/illustration/premium/thumb/cv-resume-4438692-3718352.png')"></div>
                  <div class="article-content"><h4>Как составить резюме?</h4><p>Советы от HR экспертов</p></div>
               </div>
               <div class="glass-card article-card" @click="openArticle('https://habr.com/ru/articles/437800/')">
                  <div class="article-img" style="background-image: url('https://cdni.iconscout.com/illustration/premium/thumb/job-interview-4438688-3718348.png')"></div>
                  <div class="article-content"><h4>Топ-10 вопросов</h4><p>Подготовка к интервью</p></div>
               </div>
             </template>

             <!-- Статьи для РАБОТОДАТЕЛЯ -->
             <template v-else>
               <div class="glass-card article-card" @click="openArticle('https://vc.ru/hr')">
                  <div class="article-img" style="background-image: url('https://cdni.iconscout.com/illustration/premium/thumb/business-team-meeting-4438697-3718357.png')"></div>
                  <div class="article-content"><h4>Тренды найма 2025</h4><p>Кого искать и как привлекать</p></div>
               </div>
               <div class="glass-card article-card" @click="openArticle('https://habr.com/ru/articles/712992/')">
                  <div class="article-img" style="background-image: url('https://cdni.iconscout.com/illustration/premium/thumb/project-management-4438693-3718353.png')"></div>
                  <div class="article-content"><h4>Онбординг новичков</h4><p>Как удержать сотрудника</p></div>
               </div>
             </template>
          </div>

        </div>

        <!-- ПРАВАЯ КОЛОНКА (ВИДЖЕТЫ) -->
        <div class="right-column">

          <!-- Виджет Совета -->
          <div class="glass-card widget-card ai-tip-card fade-in-up" style="animation-delay: 0.3s">
            <div class="widget-header">
              <bulb-filled style="color: #f59e0b" /> <span>Совет дня</span>
            </div>
            <p class="tip-text">
              {{ isEmployer
                 ? '"Детальное описание стека технологий в вакансии повышает релевантность откликов на 40%."'
                 : '"Заполните раздел \'О себе\' ключевыми навыками (Python, SQL, React) — это на 80% улучшит точность рекомендаций ИИ."'
              }}
            </p>
          </div>

          <!-- Таймлайн активности -->
          <div class="glass-card widget-card fade-in-up" style="animation-delay: 0.4s">
             <div class="widget-header">
               <clock-circle-outlined style="color: #6366f1" /> <span>Активность</span>
             </div>
             <a-timeline class="custom-timeline">
                <a-timeline-item color="green">Вход выполнен</a-timeline-item>
                <a-timeline-item v-if="isEmployer && applications.length > 0" color="blue">Получен новый отклик</a-timeline-item>
                <a-timeline-item v-if="!isEmployer && user.fullProfile?.about_me" color="purple">Навыки заполнены</a-timeline-item>
                <a-timeline-item color="gray">{{ isEmployer ? 'Поиск кандидатов...' : 'Поиск вакансий...' }}</a-timeline-item>
             </a-timeline>
          </div>

        </div>
      </div>

    </div>

    <!-- МОДАЛЬНЫЕ ОКНА ОСТАЮТСЯ ТЕМИ ЖЕ (для Студента) -->
    <!-- (Код модалок вакансий скопирован из предыдущего ответа, он нужен для клика по рекомендациям) -->
    <a-modal v-model:open="detailVisible" :footer="null" width="750px" centered class="vacancy-modal">
       <div v-if="selectedVacancy" class="modal-content-inner">
          <div class="modal-hero">
             <div class="modal-badge">{{ selectedVacancy.company_name }}</div>
             <h2>{{ selectedVacancy.title }}</h2>
             <div class="modal-meta">
                <span v-if="selectedVacancy.salary_min" class="salary-tag">{{ formatMoney(selectedVacancy.salary_min) }} ₽</span>
                <span class="date-tag"><calendar-outlined /> {{ formatDate(selectedVacancy.created_at) }}</span>
             </div>
          </div>
          <div class="ai-insight-box" v-if="selectedVacancy.ai_summary">
             <div class="ai-title"><robot-filled /> Мнение Искусственного Интеллекта</div>
             <p class="ai-text">{{ selectedVacancy.ai_summary }}</p>
          </div>
          <div class="modal-section">
             <h4>Требуемые навыки</h4>
             <div class="skills-cloud">
                <span v-for="skill in selectedVacancy.skills" :key="skill" class="skill-tag large">{{ skill }}</span>
             </div>
          </div>
          <div class="modal-section">
             <h4>Описание вакансии</h4>
             <p class="desc-text">{{ selectedVacancy.description }}</p>
          </div>
          <div class="modal-footer-row">
             <div class="contact-info" v-if="selectedVacancy.contact_email">
                <mail-outlined /> {{ selectedVacancy.contact_email }}
             </div>
             <a-button v-if="user && user.role === 'graduate'" type="primary" size="large" class="btn-respond" @click="startFromDetail(selectedVacancy.id)">
                Откликнуться
             </a-button>
          </div>
       </div>
    </a-modal>

    <a-modal v-model:open="showTestModal" :footer="null" width="600px">
      <div class="modal-content-wrapper">
        <div v-if="testLoading" class="modal-body center">
          <div class="spinner-icon"><robot-outlined spin /></div>
          <h3>ИИ генерирует тестовое задание...</h3>
          <p>Пожалуйста, подождите, это может занять 10-15 секунд.</p>
        </div>
        <div v-else-if="currentApplication && !testResult" class="modal-body">
          <h3><form-outlined /> Отклик на вакансию</h3>
          <p class="subtitle">Заполните форму, чтобы отправить заявку.</p>
          <div class="form-group mt-20"><label>Сопроводительное письмо</label><a-textarea v-model:value="coverLetter" :rows="3" placeholder="Почему вы хотите работать у нас..." /></div>
          <a-divider />
          <h4><thunderbolt-two-tone two-tone-color="#fa8c16" /> Блиц-тест от ИИ</h4>
          <div class="questions-list">
             <div v-for="(question, index) in currentApplication.test_tasks" :key="index" class="question-item">
              <p class="q-text"><strong>Вопрос {{ index + 1 }}:</strong> {{ question }}</p>
              <a-textarea v-model:value="studentAnswers[index]" :rows="2" placeholder="Ваш ответ..." />
            </div>
          </div>
          <div class="modal-actions">
            <button class="btn-submit" @click="submitAnswers" :disabled="submitting"><loading-outlined v-if="submitting" /> {{ submitting ? ' Проверка...' : 'Отправить' }}</button>
            <button class="btn-close-text" @click="cancelAndClose">Отмена</button>
          </div>
        </div>
        <div v-else-if="testResult" class="modal-body result-box" :class="testResult.status">
          <div class="score-circle">{{ testResult.ai_score }}</div>
          <div v-if="testResult.status === 'accepted'"><h3><check-circle-two-tone two-tone-color="#52c41a" /> Успех!</h3><p>Заявка отправлена.</p></div>
          <div v-else><h3><close-circle-two-tone two-tone-color="#eb2f96" /> Отказ</h3><p>Попробуйте снова.</p></div>
          <button class="btn-close-main" @click="closeModal">Закрыть</button>
        </div>
      </div>
    </a-modal>

  </div>
</template>

<script>
import { useRouter } from 'vue-router';
import { computed, ref, onMounted } from 'vue';
import api from '../axios';
import { message } from 'ant-design-vue';
import {
  AppstoreFilled, MessageFilled, IdcardFilled, RobotFilled,
  ArrowRightOutlined, CheckCircleFilled, ThunderboltFilled, BulbFilled,
  BankFilled, RocketFilled, ClockCircleOutlined, CloseCircleOutlined,
  SmileTwoTone, FireFilled, ReadFilled, MailOutlined,
  LoadingOutlined, FormOutlined, ThunderboltTwoTone,
  CheckCircleTwoTone, CloseCircleTwoTone, CalendarOutlined,
  TeamOutlined, PlusCircleFilled, UserAddOutlined // <--- Новые иконки
} from '@ant-design/icons-vue';

export default {
  props: ['user'],
  components: {
    AppstoreFilled, MessageFilled, IdcardFilled, RobotFilled,
    ArrowRightOutlined, CheckCircleFilled, ThunderboltFilled, BulbFilled,
    BankFilled, RocketFilled, ClockCircleOutlined, CloseCircleOutlined,
    SmileTwoTone, FireFilled, ReadFilled, MailOutlined,
    LoadingOutlined, FormOutlined, ThunderboltTwoTone,
    CheckCircleTwoTone, CloseCircleTwoTone, CalendarOutlined,
    TeamOutlined, PlusCircleFilled, UserAddOutlined
  },
  setup(props) {
    const router = useRouter();
    const msgCount = ref(0);
    const vacancies = ref([]);
    const applications = ref([]); // Для работодателя
    const myVacanciesCount = ref(0); // Для работодателя

    const detailVisible = ref(false);
    const selectedVacancy = ref(null);
    const showTestModal = ref(false);
    const testLoading = ref(false);
    const submitting = ref(false);
    const currentApplication = ref(null);
    const testResult = ref(null);
    const studentAnswers = ref([]);
    const coverLetter = ref('');

    const isEmployer = computed(() => props.user.role === 'employer');

    // ДИНАМИЧЕСКАЯ КАРТИНКА БАННЕРА
    const bannerImage = computed(() => {
        return isEmployer.value
            ? 'https://i.pinimg.com/originals/80/b6/f7/80b6f7ced693e43cf3d1d6e7e69277c0.png'
            : 'https://cdn2.iconfinder.com/data/icons/3d-abstract-iridescent-shape/512/ABSTRACT_OBJEct_v2_1.png';
    });

    const goToProfile = () => {
      router.push(isEmployer.value ? '/employer' : '/profile');
    };

    const getWelcomeMessage = () => {
      if (isEmployer.value) return 'Управляйте наймом и находите таланты быстрее.';
      return 'Новые вакансии ждут вашего отклика сегодня.';
    };

    const timeOfDay = computed(() => {
      const hour = new Date().getHours();
      if (hour < 12) return 'Доброе утро';
      if (hour < 18) return 'Добрый день';
      return 'Добрый вечер';
    });

    const loadData = async () => {
        try {
            // Общее
            const msgRes = await api.get('/messages/unread');
            msgCount.value = msgRes.data.count;

            if (isEmployer.value) {
                // ДЛЯ РАБОТОДАТЕЛЯ
                const appRes = await api.get('/applications/employer');
                applications.value = appRes.data;
                const myVacRes = await api.get('/vacancies/my');
                myVacanciesCount.value = myVacRes.data.length;
            } else {
                // ДЛЯ СТУДЕНТА
                const vacRes = await api.get('/vacancies');
                vacancies.value = vacRes.data;
                const profRes = await api.get('/graduates/me');
                props.user.fullProfile = profRes.data;
            }
        } catch (e) {}
    };

    onMounted(loadData);

    // Рекомендации (Только для студента)
    const recommendedVacancies = computed(() => {
        if (!props.user?.fullProfile?.about_me) return [];
        const userText = props.user.fullProfile.about_me.toLowerCase();
        return vacancies.value
            .map(v => {
                let matches = 0;
                if (v.skills) { v.skills.forEach(skill => { if (userText.includes(skill.toLowerCase())) matches++; }); }
                let score = Math.round((matches / (v.skills?.length || 1)) * 100);
                if (score === 0) score = 10; if (score > 100) score = 100;
                return { ...v, matchScore: score };
            })
            .sort((a, b) => b.matchScore - a.matchScore)
            .slice(0, 3);
    });

    // Логика модалок (копия из Vacancies.vue)
    const showDetails = (vac) => { selectedVacancy.value = vac; detailVisible.value = true; };
    const startFromDetail = (id) => { detailVisible.value = false; startApplication(id); };
    const startApplication = async (vacancyId) => {
      showTestModal.value = true; testLoading.value = true; currentApplication.value = null; testResult.value = null; studentAnswers.value = []; coverLetter.value = '';
      try {
        const response = await api.post('/applications/start', { vacancy_id: vacancyId });
        currentApplication.value = response.data;
        let tasks = currentApplication.value.test_tasks;
        if (!tasks) tasks = ['Ошибка загрузки'];
        else if (typeof tasks === 'string') { try { if (tasks.startsWith('"')) tasks = JSON.parse(tasks); tasks = JSON.parse(tasks); } catch(e) { tasks = [tasks]; } }
        else if (!Array.isArray(tasks)) tasks = [JSON.stringify(tasks)];
        currentApplication.value.test_tasks = tasks;
        studentAnswers.value = new Array(tasks.length).fill('');
      } catch (e) { message.error(e.response?.data?.message || 'Ошибка'); showTestModal.value = false; } finally { testLoading.value = false; }
    };
    const submitAnswers = async () => {
      if (studentAnswers.value.some(a => a.trim() === '')) return message.warning('Ответьте на вопросы');
      submitting.value = true;
      try {
        const response = await api.post('/applications/submit', { application_id: currentApplication.value.id, answers: studentAnswers.value, cover_letter: coverLetter.value });
        testResult.value = response.data;
      } catch (e) { message.error('Ошибка'); } finally { submitting.value = false; }
    };
    const cancelAndClose = async () => { if (currentApplication.value?.id) try { await api.post('/applications/cancel', { application_id: currentApplication.value.id }); } catch (e) {}; closeModal(); };
    const closeModal = () => { showTestModal.value = false; };

    const openArticle = (url) => { window.open(url, '_blank'); };
    const formatMoney = (val) => new Intl.NumberFormat('ru-RU').format(val);
    const formatDate = (val) => new Date(val).toLocaleDateString('ru-RU');
    const getAvatarUrl = (url) => url ? `http://localhost:4000${url}` : null;

    return {
        goToProfile, getWelcomeMessage, timeOfDay, openArticle, msgCount, vacancies, applications, myVacanciesCount,
        recommendedVacancies, showDetails, detailVisible, selectedVacancy, startFromDetail,
        showTestModal, testLoading, submitting, currentApplication, studentAnswers, coverLetter, testResult,
        submitAnswers, cancelAndClose, closeModal, formatMoney, formatDate, isEmployer, bannerImage, getAvatarUrl
    };
  }
}
</script>

<style scoped>
/* === ОСНОВНОЙ ЛЭЙАУТ === */
.page-wrapper { position: relative; width: 100%; min-height: 90vh; overflow-x: hidden; background: #f3f4f6; display: flex; justify-content: center; padding: 40px 20px; }
.blobs-container { position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 0; }
.blob { position: absolute; border-radius: 50%; filter: blur(60px); opacity: 0.5; animation: float 10s infinite alternate; }
.blob-1 { width: 400px; height: 400px; background: #a855f7; top: -100px; left: -100px; }
.blob-2 { width: 300px; height: 300px; background: #3b82f6; bottom: -50px; right: -50px; animation-delay: 2s; }
.blob-3 { width: 250px; height: 250px; background: #ec4899; top: 30%; left: 40%; opacity: 0.3; animation-duration: 15s; }
@keyframes float { from { transform: translate(0,0); } to { transform: translate(30px, 50px); } }

.content-container { position: relative; z-index: 1; width: 100%; max-width: 1100px; display: flex; flex-direction: column; gap: 30px; }

/* === GLASS CARD BASE === */
.glass-card {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.9);
  border-radius: 24px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.05);
  transition: all 0.3s ease;
}

/* === БАННЕР === */
.welcome-banner {
  background: linear-gradient(120deg, #6366f1 0%, #8b5cf6 100%);
  border-radius: 24px; padding: 0 50px;
  height: 280px; color: white;
  display: flex; justify-content: space-between; align-items: center;
  position: relative; overflow: hidden;
  box-shadow: 0 20px 40px rgba(99, 102, 241, 0.25);
}
/* Цвет баннера для работодателя (более "бизнесовый", темнее) */
.employer-banner {
  background: linear-gradient(120deg, #2d3748 0%, #4a5568 100%);
  box-shadow: 0 20px 40px rgba(45, 55, 72, 0.3);
}

.welcome-banner::before { content: ''; position: absolute; top: -50px; left: -50px; width: 200px; height: 200px; background: rgba(255,255,255,0.1); border-radius: 50%; filter: blur(40px); }
.banner-content { position: relative; z-index: 2; max-width: 60%; }
.greeting-badge { display: inline-flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.2); backdrop-filter: blur(5px); padding: 6px 14px; border-radius: 20px; font-size: 0.9rem; font-weight: 600; margin-bottom: 15px; border: 1px solid rgba(255,255,255,0.1); }
.dot-pulse { width: 8px; height: 8px; background: #4fd1c5; border-radius: 50%; box-shadow: 0 0 0 0 rgba(79, 209, 197, 0.7); animation: pulse-white 2s infinite; }
.welcome-banner h1 { color: white; font-size: 2.5rem; font-weight: 800; margin-bottom: 10px; line-height: 1.2; display: flex; align-items: center; gap: 12px; }
.subtitle { font-size: 1.1rem; opacity: 0.9; margin-bottom: 30px; font-weight: 300; }

.stats-row { display: flex; gap: 15px; }
.stat-glass { background: rgba(255,255,255,0.15); backdrop-filter: blur(5px); border: 1px solid rgba(255,255,255,0.2); border-radius: 16px; padding: 10px 20px; display: flex; flex-direction: column; align-items: center; min-width: 100px; }
.stat-glass strong { font-size: 1.5rem; font-weight: 800; }
.stat-glass span { font-size: 0.8rem; opacity: 0.9; text-transform: uppercase; letter-spacing: 0.5px; }

.banner-image-wrapper { width: 350px; height: 100%; display: flex; align-items: center; justify-content: center; }
.banner-img { max-height: 220px; max-width: 100%; filter: drop-shadow(0 20px 30px rgba(0,0,0,0.3)); }
.floating { animation: float 6s ease-in-out infinite; }
@keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-15px); } }

/* === DASHBOARD GRID === */
.dashboard-grid { display: grid; grid-template-columns: 1fr 320px; gap: 30px; }
@media (max-width: 900px) { .dashboard-grid { grid-template-columns: 1fr; } }

.section-title { font-size: 1.3rem; font-weight: 800; color: #1f2937; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }
.title-icon { font-size: 1.4rem; color: #6366f1; }

/* ACTIONS GRID */
.actions-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 40px; }
.action-card { padding: 20px; display: flex; flex-direction: column; justify-content: space-between; height: 160px; cursor: pointer; position: relative; }
.action-card:hover { transform: translateY(-5px); box-shadow: 0 20px 40px rgba(0,0,0,0.08); border-color: #fff; }
.icon-box { width: 48px; height: 48px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 22px; color: white; box-shadow: 0 8px 20px rgba(0,0,0,0.15); margin-bottom: 15px; }
.blue-gradient { background: linear-gradient(135deg, #3b82f6, #2563eb); }
.green-gradient { background: linear-gradient(135deg, #10b981, #059669); }
.purple-gradient { background: linear-gradient(135deg, #8b5cf6, #7c3aed); }
.orange-gradient { background: linear-gradient(135deg, #f59e0b, #d97706); }
.card-text h4 { margin: 0; font-weight: 700; color: #111827; font-size: 1.1rem; }
.card-text p { margin: 4px 0 0; font-size: 0.85rem; color: #6b7280; }
.hover-arrow { position: absolute; top: 20px; right: 20px; color: #cbd5e1; transition: 0.3s; }
.action-card:hover .hover-arrow { color: #6366f1; transform: translateX(5px); }
.beta-tag { position: absolute; top: 18px; right: 18px; background: #fff7ed; color: #f59e0b; font-size: 0.7rem; font-weight: 800; padding: 4px 8px; border-radius: 6px; border: 1px solid #ffedd5; }
.notification-badge { position: absolute; top: 20px; right: 20px; background: #ff4d4f; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.8rem; box-shadow: 0 2px 5px rgba(255, 77, 79, 0.4); }

/* RECOMENDATIONS */
.recommendations-list { display: flex; flex-direction: column; gap: 15px; }
.rec-card { padding: 15px 25px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; }
.rec-card:hover { transform: translateX(5px); background: rgba(255,255,255,0.9); }
.rec-left { display: flex; align-items: center; gap: 15px; }
.company-logo { width: 42px; height: 42px; border-radius: 12px; background: #f3f4f6; color: #6b7280; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; }
.rec-info h4 { margin: 0; font-weight: 700; color: #1f2937; font-size: 1rem; }
.rec-info p { margin: 0; font-size: 0.85rem; color: #6b7280; }
.rec-right { display: flex; align-items: center; gap: 15px; }
.match-badge { background: #ecfdf5; color: #059669; padding: 4px 10px; border-radius: 8px; font-size: 0.85rem; font-weight: 700; display: flex; gap: 5px; align-items: center; }
.ai-score { background: #f3e8ff; color: #7c3aed; }
.rec-salary { font-weight: 700; color: #1f2937; font-size: 0.95rem; }
.arrow-light { color: #cbd5e1; }

/* ARTICLES */
.articles-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.article-card { padding: 0; overflow: hidden; cursor: pointer; height: 200px; display: flex; flex-direction: column; }
.article-card:hover { transform: translateY(-5px); }
.article-img { height: 120px; background-size: cover; background-position: center; }
.article-content { padding: 15px; flex: 1; display: flex; flex-direction: column; justify-content: center; }
.article-content h4 { font-weight: 700; margin: 0; font-size: 1rem; color: #1f2937; }
.article-content p { margin: 5px 0 0; font-size: 0.85rem; color: #6b7280; }

/* WIDGETS */
.widget-card { padding: 25px; margin-bottom: 25px; }
.widget-header { font-weight: 800; color: #1f2937; margin-bottom: 20px; display: flex; align-items: center; gap: 8px; font-size: 1.1rem; }
.ai-tip-card { background: linear-gradient(135deg, rgba(255,251,235,0.8) 0%, rgba(255,255,255,0.8) 100%); border-color: #fde68a; }
.tip-text { font-size: 0.95rem; color: #b45309; font-style: italic; line-height: 1.6; }

.custom-timeline :deep(.ant-timeline-item-content) { font-size: 0.9rem; }

/* ANIMATIONS & UTILS */
.mt-40 { margin-top: 40px; }
.fade-in-up { animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; transform: translateY(20px); }
@keyframes fadeInUp { to { opacity: 1; transform: translateY(0); } }
@keyframes pulse-white { 0% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.7); } 70% { box-shadow: 0 0 0 10px rgba(255, 255, 255, 0); } 100% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0); } }

/* MODAL STYLES */
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