<template>
  <div class="user-home">
    <div class="container">

      <!-- 1. БАННЕР -->
      <div class="welcome-banner fade-in-up">
        <div class="banner-content">
          <div class="greeting-badge">
            <span class="dot"></span> {{ timeOfDay }}
          </div>
          <h1>
            {{ user.first_name }}, рады тебя видеть!
            <smile-two-tone two-tone-color="rgba(255,255,255,0.8)" class="smile-icon" />
          </h1>
          <p class="subtitle">{{ getWelcomeMessage() }}</p>
          <div class="banner-stats">
            <div class="stat"><strong>{{ vacancies.length }}</strong><span>Вакансий</span></div>
            <div class="stat-divider"></div>
            <div class="stat"><strong>{{ msgCount }}</strong><span>Сообщений</span></div>
          </div>
        </div>
        <div class="banner-image-wrapper">
          <img src="https://static.vecteezy.com/system/resources/previews/011/153/365/original/3d-web-developer-working-on-project-illustration-png.png" class="banner-img floating" />
        </div>
      </div>

      <a-row :gutter="[24, 24]" class="dashboard-grid">

        <!-- ЛЕВАЯ КОЛОНКА -->
        <a-col :span="24" :lg="16">

          <!-- Быстрые действия -->
          <h3 class="section-title fade-in-up" style="animation-delay: 0.1s">Рабочее пространство</h3>
          <div class="actions-grid mb-40">
            <div class="action-card fade-in-up" style="animation-delay: 0.2s" @click="$router.push('/vacancies')">
              <div class="card-icon blue-gradient"><appstore-filled /></div>
              <div class="card-info"><h4>Вакансии</h4><p>Поиск работы</p></div>
              <arrow-right-outlined class="arrow-icon" />
            </div>
            <div class="action-card fade-in-up" style="animation-delay: 0.3s" @click="$router.push('/messages')">
              <div class="card-icon green-gradient"><message-filled /></div>
              <div class="card-info"><h4>Мессенджер</h4><p>Связь с HR</p></div>
              <arrow-right-outlined class="arrow-icon" />
            </div>
            <div class="action-card fade-in-up" style="animation-delay: 0.4s" @click="goToProfile">
              <div class="card-icon purple-gradient"><idcard-filled /></div>
              <div class="card-info"><h4>Профиль</h4><p>Настройка данных</p></div>
              <arrow-right-outlined class="arrow-icon" />
            </div>
            <div class="action-card fade-in-up" style="animation-delay: 0.5s" @click="$router.push('/chat')" v-if="user.role === 'graduate'">
              <div class="card-icon orange-gradient"><robot-filled /></div>
              <div class="card-info"><h4>AI Ментор</h4><p>Карьерные советы</p></div>
              <div class="ai-badge">Beta</div>
            </div>
          </div>

          <!-- Рекомендуемые вакансии (ДИНАМИЧЕСКИЕ) -->
          <div v-if="user.role === 'graduate' && recommendedVacancies.length > 0">
            <h3 class="section-title fade-in-up" style="animation-delay: 0.2s">
              <fire-filled style="color: #f56565; margin-right: 8px;" /> Рекомендуем вам
            </h3>

            <div class="recommendations-list fade-in-up" style="animation-delay: 0.3s">
              <div
                v-for="vac in recommendedVacancies"
                :key="vac.id"
                class="rec-card"
                @click="showDetails(vac)"
              >
                  <div class="rec-left">
                    <div class="rec-logo color-1"><bank-filled /></div>
                    <div class="rec-info">
                      <h4>{{ vac.title }}</h4>
                      <p>{{ vac.company_name }}</p>
                    </div>
                  </div>
                  <div class="rec-right">
                    <div class="match-pill">
                      <thunderbolt-filled /> {{ vac.matchScore }}%
                    </div>
                    <div class="rec-salary" v-if="vac.salary_min">{{ formatMoney(vac.salary_min) }} ₽</div>
                    <a-button type="text" shape="circle"><arrow-right-outlined /></a-button>
                  </div>
              </div>
            </div>
          </div>

          <!-- Полезные материалы -->
           <h3 class="section-title fade-in-up" style="animation-delay: 0.4s; margin-top: 40px">
            <read-filled style="color: #4299e1; margin-right: 8px;" /> Полезные материалы
          </h3>
          <a-row :gutter="16" class="fade-in-up" style="animation-delay: 0.5s">
             <a-col :span="12">
                <a-card hoverable class="article-card" @click="openArticle('https://hh.ru/article/301114')">
                   <template #cover><img alt="resume" src="https://cdni.iconscout.com/illustration/premium/thumb/cv-resume-4438692-3718352.png" height="150" style="object-fit: cover" /></template>
                   <a-card-meta title="Как составить резюме?" description="Советы от HR экспертов"></a-card-meta>
                </a-card>
             </a-col>
             <a-col :span="12">
                <a-card hoverable class="article-card" @click="openArticle('https://habr.com/ru/articles/437800/')">
                   <template #cover><img alt="interview" src="https://cdni.iconscout.com/illustration/premium/thumb/job-interview-4438688-3718348.png" height="150" style="object-fit: cover" /></template>
                   <a-card-meta title="Топ-10 вопросов" description="Подготовка к собеседованию"></a-card-meta>
                </a-card>
             </a-col>
          </a-row>

        </a-col>

        <!-- ПРАВАЯ КОЛОНКА -->
        <a-col :span="24" :lg="8">

          <!-- Виджет Совета -->
          <div class="widget-card ai-tip-card fade-in-up" style="animation-delay: 0.3s">
            <div class="tip-header"><bulb-filled style="color: #f6e05e" /> <span>Совет дня</span></div>
            <p class="tip-text">"Заполните раздел 'О себе' ключевыми навыками (Python, SQL, React) — это на 80% улучшит точность рекомендаций ИИ."</p>
          </div>

          <!-- Таймлайн активности -->
          <div class="widget-card fade-in-up" style="animation-delay: 0.4s">
             <div class="widget-header"><span><clock-circle-outlined /> Активность</span></div>
             <a-timeline>
                <a-timeline-item color="green">Вход выполнен</a-timeline-item>
                <a-timeline-item v-if="user.fullProfile?.avatar_url">Фото профиля загружено</a-timeline-item>
                <a-timeline-item v-if="user.fullProfile?.about_me" color="blue">Навыки заполнены</a-timeline-item>
             </a-timeline>
          </div>

        </a-col>
      </a-row>

    </div>

    <!-- ============================================ -->
    <!-- МОДАЛЬНЫЕ ОКНА (Скопированы из Vacancies)    -->
    <!-- ============================================ -->

    <!-- 1. ДЕТАЛИ ВАКАНСИИ -->
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
                Откликнуться (Пройти тест)
             </a-button>
          </div>
       </div>
    </a-modal>

    <!-- 2. AI ТЕСТ -->
    <a-modal v-model:open="showTestModal" :footer="null" width="600px">
      <div class="modal-content-wrapper">
        <div v-if="testLoading" class="modal-body center">
          <div class="spinner-icon"><robot-outlined spin /></div>
          <h3>ИИ генерирует тестовое задание...</h3>
          <p>Пожалуйста, подождите, это может занять 10-15 секунд.</p>
        </div>

        <div v-else-if="currentApplication && !testResult" class="modal-body">
          <h3><form-outlined /> Отклик на вакансию</h3>
          <p class="subtitle">Заполните форму, чтобы отправить заявку работодателю.</p>
          <div class="form-group mt-20"><label>Сопроводительное письмо</label><a-textarea v-model:value="coverLetter" :rows="3" placeholder="Расскажите, почему вы хотите работать у нас..." /></div>
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
  CheckCircleTwoTone, CloseCircleTwoTone, CalendarOutlined
} from '@ant-design/icons-vue';

export default {
  props: ['user'],
  components: {
    AppstoreFilled, MessageFilled, IdcardFilled, RobotFilled,
    ArrowRightOutlined, CheckCircleFilled, ThunderboltFilled, BulbFilled,
    BankFilled, RocketFilled, ClockCircleOutlined, CloseCircleOutlined,
    SmileTwoTone, FireFilled, ReadFilled, MailOutlined,
    LoadingOutlined, FormOutlined, ThunderboltTwoTone,
    CheckCircleTwoTone, CloseCircleTwoTone, CalendarOutlined
  },
  setup(props) {
    const router = useRouter();
    const msgCount = ref(0);
    const vacancies = ref([]);

    // Состояние модалок
    const detailVisible = ref(false);
    const selectedVacancy = ref(null);
    const showTestModal = ref(false);
    const testLoading = ref(false);
    const submitting = ref(false);
    const currentApplication = ref(null);
    const testResult = ref(null);
    const studentAnswers = ref([]);
    const coverLetter = ref('');

    const goToProfile = () => {
      router.push(props.user.role === 'employer' ? '/employer' : '/profile');
    };

    const getWelcomeMessage = () => {
      if (props.user.role === 'employer') return 'Управляйте наймом и находите таланты быстрее.';
      return 'Новые вакансии ждут вашего отклика сегодня.';
    };

    const timeOfDay = computed(() => {
      const hour = new Date().getHours();
      if (hour < 12) return 'Доброе утро';
      if (hour < 18) return 'Добрый день';
      return 'Добрый вечер';
    });

    // Загрузка данных
    const loadData = async () => {
        try {
            const [msgRes, vacRes] = await Promise.all([
                api.get('/messages/unread'),
                api.get('/vacancies')
            ]);
            msgCount.value = msgRes.data.count;
            vacancies.value = vacRes.data;

            // Догружаем профиль для расчета скора
            if (props.user.role === 'graduate') {
                const profRes = await api.get('/graduates/me');
                props.user.fullProfile = profRes.data;
            }
        } catch (e) {}
    };

    onMounted(loadData);

    // Умные рекомендации
    const recommendedVacancies = computed(() => {
        if (!props.user?.fullProfile?.about_me) return [];
        const userText = props.user.fullProfile.about_me.toLowerCase();

        return vacancies.value
            .map(v => {
                let matches = 0;
                if (v.skills) {
                    v.skills.forEach(skill => { if (userText.includes(skill.toLowerCase())) matches++; });
                }
                let score = Math.round((matches / (v.skills?.length || 1)) * 100);
                if (score === 0) score = 10; if (score > 100) score = 100;
                return { ...v, matchScore: score };
            })
            .sort((a, b) => b.matchScore - a.matchScore)
            .slice(0, 3); // Топ 3
    });

    // Логика модалок (копия из Vacancies.vue)
    const showDetails = (vac) => {
        selectedVacancy.value = vac;
        detailVisible.value = true;
    };
    const startFromDetail = (id) => {
        detailVisible.value = false;
        startApplication(id);
    };
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

    return {
        goToProfile, getWelcomeMessage, timeOfDay, openArticle, msgCount, vacancies,
        recommendedVacancies, showDetails, detailVisible, selectedVacancy, startFromDetail,
        showTestModal, testLoading, submitting, currentApplication, studentAnswers, coverLetter, testResult,
        submitAnswers, cancelAndClose, closeModal, formatMoney, formatDate
    };
  }
}
</script>

<style scoped>
.user-home { padding: 40px 0; background-color: #f8f9ff; min-height: 85vh; }
.container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }
.fade-in-up { animation: fadeInUp 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; opacity: 0; transform: translateY(20px); }
@keyframes fadeInUp { to { opacity: 1; transform: translateY(0); } }

/* BANNER */
.welcome-banner { background: linear-gradient(120deg, #667eea 0%, #764ba2 100%); border-radius: 24px; padding: 40px 50px; color: white; display: flex; justify-content: space-between; align-items: center; margin-bottom: 50px; position: relative; overflow: hidden; box-shadow: 0 20px 40px rgba(118, 75, 162, 0.25); }
.welcome-banner::before { content: ''; position: absolute; top: -50px; left: -50px; width: 200px; height: 200px; background: rgba(255,255,255,0.1); border-radius: 50%; filter: blur(40px); }
.welcome-banner::after { content: ''; position: absolute; bottom: -30px; right: 200px; width: 150px; height: 150px; background: rgba(255,255,255,0.15); border-radius: 50%; filter: blur(30px); }
.banner-content { position: relative; z-index: 2; max-width: 60%; }
.greeting-badge { display: inline-flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.2); backdrop-filter: blur(5px); padding: 6px 14px; border-radius: 20px; font-size: 0.9rem; font-weight: 600; margin-bottom: 15px; border: 1px solid rgba(255,255,255,0.1); }
.dot { width: 8px; height: 8px; background: #4fd1c5; border-radius: 50%; box-shadow: 0 0 10px #4fd1c5; }

/* Смайлик и текст */
.welcome-banner h1 {
  color: white; font-size: 2.5rem; font-weight: 800; margin-bottom: 10px; line-height: 1.2;
  display: flex; align-items: center; flex-wrap: wrap; gap: 12px;
}
.smile-icon { font-size: 36px; display: inline-flex; }

.subtitle { font-size: 1.1rem; opacity: 0.9; margin-bottom: 30px; font-weight: 300; }
.banner-stats { display: flex; gap: 40px; }
.stat { display: flex; flex-direction: column; }
.stat strong { font-size: 1.8rem; font-weight: 800; }
.stat span { font-size: 0.85rem; opacity: 0.8; text-transform: uppercase; letter-spacing: 1px; }
.stat-divider { width: 1px; background: rgba(255,255,255,0.3); }
.banner-image-wrapper { position: relative; height: 250px; width: 300px; display: flex; align-items: center; justify-content: center; }
.banner-img { max-height: 130%; position: absolute; bottom: -40px; right: -20px; filter: drop-shadow(0 20px 30px rgba(0,0,0,0.3)); }
.floating { animation: float 6s ease-in-out infinite; }
@keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-15px); } }

/* ACTIONS GRID */
.section-title { font-size: 1.4rem; font-weight: 700; color: #2d3748; margin-bottom: 25px; display: flex; align-items: center; }
.actions-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 24px; }
.action-card { background: white; padding: 25px; border-radius: 20px; display: flex; flex-direction: column; align-items: flex-start; cursor: pointer; transition: all 0.3s ease; border: 1px solid rgba(0,0,0,0.03); box-shadow: 0 4px 20px rgba(0,0,0,0.03); position: relative; overflow: hidden; }
.action-card:hover { transform: translateY(-8px); box-shadow: 0 15px 30px rgba(118, 75, 162, 0.1); border-color: rgba(118, 75, 162, 0.2); }
.card-icon { width: 50px; height: 50px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 24px; color: white; margin-bottom: 20px; box-shadow: 0 8px 15px rgba(0,0,0,0.1); }
.blue-gradient { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
.green-gradient { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); }
.purple-gradient { background: linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%); }
.orange-gradient { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); }
.card-info h4 { margin: 0; font-size: 1.2rem; font-weight: 700; color: #2d3748; }
.card-info p { margin: 5px 0 0; font-size: 0.9rem; color: #a0aec0; }
.arrow-icon { position: absolute; top: 25px; right: 25px; color: #cbd5e0; transition: 0.3s; }
.action-card:hover .arrow-icon { color: #764ba2; transform: translateX(5px); }
.ai-badge { position: absolute; top: 20px; right: 20px; background: #edf2f7; color: #718096; font-size: 0.7rem; font-weight: 800; padding: 4px 8px; border-radius: 6px; text-transform: uppercase; }

/* RECOMENDATIONS */
.recommendations-list { display: flex; flex-direction: column; gap: 15px; }
.rec-card {
  background: white; padding: 15px 20px; border-radius: 16px;
  display: flex; justify-content: space-between; align-items: center;
  box-shadow: 0 4px 15px rgba(0,0,0,0.03); transition: 0.2s;
  border: 1px solid transparent; cursor: pointer;
}
.rec-card:hover { border-color: #667eea; transform: translateX(5px); }
.rec-left { display: flex; align-items: center; gap: 15px; }
.rec-logo { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; font-size: 18px; }
.color-1 { background: #52c41a; }
.color-2 { background: #1890ff; }
.rec-info h4 { margin: 0; font-weight: 700; color: #2d3748; font-size: 1rem; }
.rec-info p { margin: 0; font-size: 0.85rem; color: #718096; }

.rec-right { display: flex; align-items: center; gap: 15px; }
.rec-salary { font-weight: 700; color: #52c41a; }
.match-pill { background: #def7ec; color: #03543f; padding: 4px 10px; border-radius: 12px; font-size: 0.8rem; font-weight: 800; display: flex; gap: 4px; align-items: center; }

/* ARTICLES */
.article-card { border-radius: 16px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.03); border: none; height: 100%; cursor: pointer; transition: transform 0.2s; }
.article-card:hover { transform: translateY(-3px); box-shadow: 0 10px 30px rgba(0,0,0,0.1); }

/* WIDGETS */
.widget-card { background: white; border-radius: 20px; padding: 25px; box-shadow: 0 4px 20px rgba(0,0,0,0.03); margin-bottom: 24px; border: 1px solid rgba(0,0,0,0.03); }
.widget-header { font-weight: 700; color: #2d3748; margin-bottom: 20px; display: flex; align-items: center; gap: 8px; }
.ai-tip-card { background: linear-gradient(135deg, #fffbf0 0%, #fff 100%); border-color: #fefcbf; }
.tip-header { display: flex; align-items: center; gap: 8px; font-weight: 700; color: #d69e2e; margin-bottom: 10px; }
.tip-text { font-size: 0.95rem; color: #4a5568; font-style: italic; line-height: 1.5; }
.mb-40 { margin-bottom: 40px; }

/* MODAL STYLES (copy from Vacancies) */
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

/* Modal content wrapper for Test */
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
.result-msg { font-size: 1.1em; margin-bottom: 10px; line-height: 1.5; }
.small-text { font-size: 0.9em; color: #666; }

@media (max-width: 768px) {
  .welcome-banner { flex-direction: column; text-align: center; padding: 30px 20px; }
  .banner-content { max-width: 100%; }
  .banner-stats { justify-content: center; margin-top: 20px; }
  .banner-image-wrapper { margin-top: 30px; }
}
</style>