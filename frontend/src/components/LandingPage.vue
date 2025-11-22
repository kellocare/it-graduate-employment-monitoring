<template>
  <div class="landing-page">

    <!-- 1. HERO SECTION -->
    <div class="hero-wrapper">
      <div class="hero-blob blob-1"></div>
      <div class="hero-blob blob-2"></div>

      <div class="container hero-content">
        <a-row type="flex" align="middle" :gutter="[40, 40]">
          <a-col :span="24" :md="12" class="fade-in-up" style="animation-delay: 0.1s">
            <div class="hero-badge">🚀 Официальная платформа СПбГТИ</div>
            <h1 class="hero-title">
              Твой старт в <span class="text-gradient">IT-индустрии</span> <br> начинается здесь
            </h1>
            <p class="hero-desc">
              Умная система мониторинга трудоустройства. Искусственный интеллект поможет создать резюме, подготовиться к собеседованию и найти работу мечты.
            </p>
            <div class="hero-buttons">
              <!-- Исправил вызов роутера, чтобы точно работало -->
              <a-button type="primary" size="large" class="btn-cta" @click="goTo('/vacancies')">
                Найти вакансию <arrow-right-outlined />
              </a-button>
              <a-button size="large" class="btn-secondary" @click="goTo('/chat')">
                <robot-filled /> AI Ассистент
              </a-button>
            </div>

            <div class="hero-stats-row">
              <div class="stat-item"><h3>500+</h3><p>Выпускников</p></div>
              <div class="stat-divider"></div>
              <div class="stat-item"><h3>98%</h3><p>Трудоустройства</p></div>
              <div class="stat-divider"></div>
              <div class="stat-item"><h3>120k+</h3><p>Ср. зарплата</p></div>
            </div>
          </a-col>

          <a-col :span="24" :md="12" class="hero-image-col fade-in-up" style="animation-delay: 0.3s">
            <div class="image-card">
              <!-- ТВОЯ КАРТИНКА -->
              <img src="https://images.squarespace-cdn.com/content/v1/671b407828835e7e6106c7d0/e91a3e7f-b968-439c-a4a2-9329c8732369/glass-3.png?format=2500w" alt="Career Growth" class="main-img" />

              <div class="float-card card-1">
                <check-circle-filled style="color: #52c41a; font-size: 24px;" />
                <div><strong>Оффер получен!</strong><span>Яндекс (Москва)</span></div>
              </div>
              <div class="float-card card-2">
                <thunderbolt-filled style="color: #fa8c16; font-size: 24px;" />
                <div><strong>AI Анализ</strong><span>Навыки подтверждены</span></div>
              </div>
            </div>
          </a-col>
        </a-row>
      </div>
    </div>

    <!-- 2. TECH MARQUEE -->
    <div class="tech-marquee">
      <div class="marquee-content">
        <span><code-filled /> Python</span><span><html5-filled /> Vue.js</span><span><database-filled /> PostgreSQL</span><span><api-filled /> Node.js</span><span><cloud-server-outlined /> Docker</span><span><robot-filled /> Machine Learning</span>
        <!-- Дублируем -->
        <span><code-filled /> Python</span><span><html5-filled /> Vue.js</span><span><database-filled /> PostgreSQL</span><span><api-filled /> Node.js</span><span><cloud-server-outlined /> Docker</span><span><robot-filled /> Machine Learning</span>
      </div>
    </div>

    <!-- 3. STEPS SECTION -->
    <div class="section steps-section">
      <div class="container">
        <a-row align="middle" :gutter="[60, 60]">
          <a-col :span="24" :md="12" class="steps-text-col">
            <div class="section-label">Процесс</div>
            <h2>Как это работает?</h2>
            <p class="section-sub">Всего три шага отделяют тебя от успешной карьеры.</p>
            <div class="step-list">
              <div class="step-item">
                <div class="step-icon-box color-1">1</div>
                <div class="step-content"><h4>Заполни профиль</h4><p>Расскажи о себе, загрузи портфолио или импортируй данные.</p></div>
              </div>
              <div class="step-item">
                <div class="step-icon-box color-2">2</div>
                <div class="step-content"><h4>Пройди AI-отбор</h4><p>Откликнись на вакансию. ИИ сгенерирует уникальное тестовое задание.</p></div>
              </div>
              <div class="step-item">
                <div class="step-icon-box color-3">3</div>
                <div class="step-content"><h4>Получи работу</h4><p>Общайся с работодателем в чате, пройди видео-собеседование и прими оффер.</p></div>
              </div>
            </div>
          </a-col>
          <a-col :span="24" :md="12" class="center">
            <!-- ТВОЯ КАРТИНКА -->
            <img src="https://cdn3.iconfinder.com/data/icons/majoo-1/24/Upstairs-512.png" class="steps-img" alt="Steps" />
          </a-col>
        </a-row>
      </div>
    </div>

    <!-- 4. MAP SECTION -->
    <div class="section map-section">
      <div class="container">
        <div class="section-header center">
          <h2>Мы находимся здесь</h2>
          <p>Кафедра САПР и Управления, Технологический институт</p>
        </div>
        <div class="map-wrapper">
          <iframe src="https://yandex.ru/map-widget/v1/?um=constructor%3A0&amp;source=constructor&amp;center=30.323366%2C59.917279&amp;zoom=16&amp;pt=30.318758,59.917540,pm2blm" width="100%" height="450" frameborder="0" class="styled-map"></iframe>
          <div class="map-card">
            <h3><bank-filled style="color: #1890ff" /> СПбГТИ (ТУ)</h3>
            <p>Санкт-Петербург, Московский пр., 26</p>
            <a-divider style="margin: 10px 0" />
            <p><phone-filled /> +7 (812) 316-20-88</p>
            <p><mail-filled /> office@technolog.edu.ru</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 5. CTA SECTION -->
    <div class="section cta-section">
      <div class="container cta-container">
        <h2>Готов начать карьеру?</h2>
        <p>Присоединяйся к системе мониторинга прямо сейчас.</p>
        <a-button type="primary" size="large" class="btn-white" @click="goTo('/login')">
          Зарегистрироваться
        </a-button>
      </div>
    </div>

  </div>
</template>

<script>
import { useRouter } from 'vue-router';
import {
  ArrowRightOutlined, RobotFilled, RocketFilled, MessageFilled,
  SolutionOutlined, CheckCircleFilled, ThunderboltFilled,
  BankFilled, PhoneFilled, MailFilled, GlobalOutlined,
  CodeFilled, Html5Filled, DatabaseFilled, ApiFilled, CloudServerOutlined
} from '@ant-design/icons-vue';

export default {
  components: {
    ArrowRightOutlined, RobotFilled, RocketFilled, MessageFilled,
    SolutionOutlined, CheckCircleFilled, ThunderboltFilled,
    BankFilled, PhoneFilled, MailFilled, GlobalOutlined,
    CodeFilled, Html5Filled, DatabaseFilled, ApiFilled, CloudServerOutlined
  },
  setup() {
    const router = useRouter();
    const goTo = (path) => {
      router.push(path);
    };
    return { goTo };
  }
}
</script>

<style scoped>
/* Общие */
.container { max-width: 1200px; margin: 0 auto; padding: 0 20px; position: relative; z-index: 2; }
.section { padding: 100px 0; }
.center { text-align: center; }
.section-label { color: #764ba2; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; font-size: 0.9rem; margin-bottom: 10px; }
.section-sub { font-size: 1.2rem; color: #718096; max-width: 600px; margin: 0 auto; }

/* 1. Hero Section */
.hero-wrapper {
  position: relative;
  padding: 80px 0 120px;
  overflow: hidden;
  background-color: #f8f9ff;
}
/* Пузыри */
.hero-blob { position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.5; z-index: 1; }
.blob-1 { width: 500px; height: 500px; background: #d6bcfa; top: -150px; left: -100px; animation: moveBlob 12s infinite alternate; }
.blob-2 { width: 400px; height: 400px; background: #90cdf4; bottom: -100px; right: -100px; animation: moveBlob 10s infinite alternate-reverse; }
@keyframes moveBlob { from { transform: translate(0,0); } to { transform: translate(40px, 40px); } }

.hero-badge { display: inline-block; background: #fff; padding: 8px 20px; border-radius: 30px; color: #764ba2; font-weight: 700; font-size: 0.9rem; box-shadow: 0 4px 20px rgba(118, 75, 162, 0.15); margin-bottom: 25px; }
.hero-title { font-size: 4rem; font-weight: 800; line-height: 1.1; color: #1a202c; margin-bottom: 25px; }
.hero-desc { font-size: 1.25rem; color: #4a5568; margin-bottom: 40px; max-width: 550px; line-height: 1.6; }

.hero-buttons { display: flex; gap: 20px; margin-bottom: 60px; }
.btn-cta { height: 55px; font-size: 1.1rem; padding: 0 35px; border-radius: 30px; display: flex; align-items: center; gap: 10px; font-weight: bold; }
.btn-secondary { height: 55px; font-size: 1.1rem; padding: 0 35px; border-radius: 30px; background: #fff; border: 2px solid #e2e8f0; color: #4a5568; display: flex; align-items: center; gap: 10px; font-weight: bold; }
.btn-secondary:hover { border-color: #764ba2; color: #764ba2; }

.hero-stats-row { display: flex; gap: 50px; align-items: center; }
.stat-item h3 { font-size: 2.2rem; font-weight: 800; margin: 0; color: #2d3748; }
.stat-item p { margin: 0; color: #718096; font-weight: 500; }
.stat-divider { width: 2px; height: 40px; background: #e2e8f0; }

.image-card { position: relative; text-align: center; perspective: 1000px; }
.main-img { width: 100%; max-width: 550px; animation: float 6s ease-in-out infinite; filter: drop-shadow(0 20px 40px rgba(0,0,0,0.15)); }

.float-card {
  position: absolute; background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(12px);
  padding: 15px 25px; border-radius: 16px; box-shadow: 0 15px 35px rgba(0,0,0,0.1);
  display: flex; align-items: center; gap: 15px; font-size: 0.95rem;
  animation: floatCard 5s ease-in-out infinite; border: 1px solid rgba(255,255,255,0.5);
}
.float-card strong { display: block; color: #2d3748; font-size: 1rem; }
.float-card span { color: #718096; font-size: 0.85rem; }
.card-1 { top: 15%; left: 0; animation-delay: 1s; }
.card-2 { bottom: 15%; right: 0; animation-delay: 2s; }

@keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
@keyframes floatCard { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }

/* 2. Tech Marquee */
.tech-marquee { background: #1a202c; padding: 20px 0; overflow: hidden; white-space: nowrap; position: relative; }
.marquee-content { display: inline-block; animation: scroll 20s linear infinite; }
.marquee-content span { color: rgba(255,255,255,0.7); font-size: 1.2rem; font-weight: 600; margin: 0 30px; display: inline-flex; align-items: center; gap: 10px; }
@keyframes scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }

/* 3. Steps */
.steps-section { background: #fff; }
.steps-img { width: 100%; max-width: 550px; }
.step-list { margin-top: 40px; }
.step-item { display: flex; gap: 25px; margin-bottom: 40px; }
.step-icon-box {
  width: 60px; height: 60px; color: white; border-radius: 20px;
  display: flex; align-items: center; justify-content: center;
  font-weight: 800; font-size: 1.5rem; flex-shrink: 0;
  box-shadow: 0 10px 20px rgba(0,0,0,0.15);
}
.color-1 { background: linear-gradient(135deg, #667eea, #764ba2); }
.color-2 { background: linear-gradient(135deg, #fa8c16, #f6ad55); }
.color-3 { background: linear-gradient(135deg, #52c41a, #95de64); }
.step-content h4 { font-size: 1.4rem; font-weight: 700; margin: 0 0 8px; color: #2d3748; }
.step-content p { color: #718096; margin: 0; font-size: 1.05rem; line-height: 1.5; }

/* 4. Map */
.map-section { background: #f7fafc; }
.map-wrapper { position: relative; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.1); margin-top: 40px; }
.styled-map { filter: grayscale(80%) contrast(1.1) brightness(1.1) sepia(10%) hue-rotate(190deg); display: block; }
.map-card {
  position: absolute; top: 30px; left: 30px; background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px); padding: 25px; border-radius: 15px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.15); max-width: 300px;
}
.map-card h3 { font-weight: 800; color: #2d3748; margin-bottom: 5px; }
.map-card p { margin: 5px 0; color: #4a5568; font-size: 0.95rem; display: flex; align-items: center; gap: 10px; }

/* 5. CTA */
.cta-section { background: var(--primary-gradient); color: white; text-align: center; padding: 100px 0; }
.cta-container h2 { color: white; font-size: 3rem; font-weight: 800; margin-bottom: 15px; }
.cta-container p { font-size: 1.3rem; opacity: 0.9; margin-bottom: 40px; }
.btn-white { background: white; color: #764ba2; border: none; height: 60px; padding: 0 50px; font-weight: 800; font-size: 1.1rem; border-radius: 30px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); }
.btn-white:hover { background: #f7fafc; transform: translateY(-3px); }

@media (max-width: 768px) {
  .hero-title { font-size: 2.5rem; }
  .hero-buttons { flex-direction: column; }
  .hero-stats-row { flex-wrap: wrap; gap: 20px; }
  .map-card { position: relative; top: 0; left: 0; width: 100%; max-width: none; border-radius: 0; }
  .styled-map { height: 300px; }
}
</style>