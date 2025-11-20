<template>
  <div class="home-page">
    <!-- Hero -->
    <div class="hero-section">
      <a-row type="flex" justify="center" align="middle" style="min-height: 70vh;">
        <a-col :span="24" :md="12" class="hero-text">
          <h1 class="animate-text">Построй карьеру в IT <br> вместе с университетом</h1>
          <p class="subtitle">
            Кафедра Систем автоматизированного проектирования и управления.<br>
            Единая система мониторинга и трудоустройства.
          </p>
          <div class="hero-buttons">
            <a-button type="primary" size="large" @click="$router.push('/vacancies')">
              <search-outlined /> Найти вакансию
            </a-button>
            <a-button size="large" @click="$router.push('/chat')" style="margin-left: 15px;">
              <robot-outlined /> Спросить ИИ
            </a-button>
          </div>
        </a-col>
        <a-col :span="24" :md="10" class="hero-image">
          <!-- Надежная картинка от Ant Design -->
          <img
            src="https://static.tildacdn.com/tild3539-6666-4632-b765-323531323964/image.png"
            alt="Career Illustration"
          />
        </a-col>
      </a-row>
    </div>

    <!-- Features -->
    <div class="features-section">
      <a-row :gutter="[32, 32]" justify="center">
        <a-col :span="24" :md="7">
          <a-card hoverable class="feature-card">
            <rocket-two-tone class="feature-icon" two-tone-color="#1890ff"/>
            <h3>Умный поиск</h3>
            <p>ИИ анализирует вакансии и выделяет навыки.</p>
          </a-card>
        </a-col>
        <a-col :span="24" :md="7">
          <a-card hoverable class="feature-card">
            <experiment-two-tone class="feature-icon" two-tone-color="#52c41a" />
            <h3>AI Собеседования</h3>
            <p>Пройди блиц-тест и проверь свои силы.</p>
          </a-card>
        </a-col>
        <a-col :span="24" :md="7">
          <a-card hoverable class="feature-card">
            <pie-chart-two-tone class="feature-icon" two-tone-color="#fa8c16" />
            <h3>Аналитика</h3>
            <p>Статистика зарплат и популярных компаний.</p>
          </a-card>
        </a-col>
      </a-row>
    </div>

    <!-- About University -->
    <div class="about-section">
      <div class="container">
        <a-card :bordered="false" class="university-card">
           <a-row :gutter="40" align="middle">
             <a-col :span="24" :md="14">
               <h2>🎓 Технологический институт (СПбГТИ)</h2>
               <p class="uni-desc">
                 Ведущий российский вуз, основанный в 1828 году. Мы готовим специалистов мирового уровня.
                 Система "IT-Monitoring" создана для поддержки студентов направления 09.04.01.
               </p>
               <div class="contacts">
                 <p><phone-outlined /> +7 (812) 316-20-88</p>
                 <p><mail-outlined /> office@technolog.edu.ru</p>
                 <p><global-outlined /> technolog.edu.ru</p>
               </div>
             </a-col>
             <a-col :span="24" :md="10" class="uni-stats">
               <a-row :gutter="16">
                 <a-col :span="12">
                   <a-statistic title="Студентов" :value="5000" />
                 </a-col>
                 <a-col :span="12">
                   <a-statistic title="Партнеров" :value="50" suffix="+" />
                 </a-col>
               </a-row>
             </a-col>
           </a-row>
        </a-card>
      </div>
    </div>
  </div>
</template>

<script>
import {
  SearchOutlined, RobotOutlined, PhoneOutlined, MailOutlined, GlobalOutlined,
  RocketTwoTone, ExperimentTwoTone, PieChartTwoTone
} from '@ant-design/icons-vue';

export default {
  components: {
    SearchOutlined, RobotOutlined, PhoneOutlined, MailOutlined, GlobalOutlined,
    RocketTwoTone, ExperimentTwoTone, PieChartTwoTone
  }
}
</script>

<style scoped>
.hero-section { padding: 40px 50px; background: linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%); }
.hero-text h1 { font-size: 2.8rem; font-weight: 800; color: #001529; margin-bottom: 20px; line-height: 1.2; }
.subtitle { font-size: 1.1rem; color: #666; margin-bottom: 30px; }
.hero-image img { width: 100%; max-width: 450px; animation: float 6s ease-in-out infinite; }

.features-section { padding: 50px 20px; background: #fff; }
.feature-card { text-align: center; border-radius: 12px; height: 100%; }
.feature-icon { font-size: 3rem; margin: 20px 0; }

.about-section { padding: 50px 20px; background: #f0f2f5; }
.container { max-width: 1000px; margin: 0 auto; }
.university-card { border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
.contacts p { font-size: 1.1em; margin-bottom: 8px; }
.contacts .anticon { margin-right: 10px; color: #1890ff; }

@keyframes float { 0% { transform: translateY(0px); } 50% { transform: translateY(-15px); } 100% { transform: translateY(0px); } }
</style>