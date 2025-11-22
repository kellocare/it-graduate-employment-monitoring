<template>
  <a-layout-footer class="footer">
    <div class="container">
      <a-row :gutter="[40, 40]">

        <!-- 1. Лого и описание -->
        <a-col :span="24" :md="8">
          <div class="footer-logo">
            <rocket-filled style="color: #1890ff; font-size: 24px; margin-right: 10px;" />
            IT-Monitoring
          </div>
          <p class="footer-desc">
            Интеллектуальная система поддержки трудоустройства студентов и выпускников СПбГТИ(ТУ).
          </p>
          <div class="socials">
            <a href="#" class="social-icon"><github-outlined /></a>
            <a href="#" class="social-icon"><linkedin-filled /></a>
            <a href="#" class="social-icon"><global-outlined /></a>
          </div>
        </a-col>

        <!-- 2. Ссылки -->
        <a-col :span="24" :md="8">
          <h4 class="footer-heading">Навигация</h4>
          <ul class="footer-links">
            <li><a @click="$router.push('/vacancies')">Вакансии</a></li>
            <li><a @click="$router.push('/chat')">AI Ассистент</a></li>
            <li><a @click="$router.push('/login')">Вход для работодателей</a></li>
          </ul>
        </a-col>

        <!-- 3. Контакты -->
        <a-col :span="24" :md="8">
          <h4 class="footer-heading">Контакты</h4>
          <ul class="footer-contact">
            <li><mail-filled /> student@example.com</li>
            <li><phone-filled /> +7 (812) 316-20-88</li>
            <li><environment-filled /> Московский пр., 26</li>
          </ul>
        </a-col>

      </a-row>

      <a-divider class="footer-divider" />

      <div class="footer-bottom">
        <p>© 2025 IT-Monitoring. Дипломный проект.</p>
        <p>Разработано: Белянчиков А.С.</p>
      </div>
    </div>
  </a-layout-footer>
</template>

<script>
import {
  RocketFilled, GithubOutlined, LinkedinFilled, GlobalOutlined,
  MailFilled, PhoneFilled, EnvironmentFilled
} from '@ant-design/icons-vue';

export default {
  components: {
    RocketFilled, GithubOutlined, LinkedinFilled, GlobalOutlined,
    MailFilled, PhoneFilled, EnvironmentFilled
  }
}
</script>

<style scoped>
.footer {
  background: #1a202c;
  color: #a0aec0;
  padding: 60px 20px 30px;
}
.container { max-width: 1200px; margin: 0 auto; }

.footer-logo {
  font-size: 1.5rem;
  font-weight: 700;
  color: #fff;
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}
.footer-desc { line-height: 1.6; margin-bottom: 25px; max-width: 300px; }

.socials { display: flex; gap: 15px; }
.social-icon {
  width: 36px; height: 36px; background: #2d3748; color: #fff;
  border-radius: 50%; display: flex; align-items: center; justify-content: center;
  font-size: 18px; transition: 0.3s;
}
.social-icon:hover { background: #1890ff; transform: translateY(-3px); }

.footer-heading { color: #fff; font-size: 1.1rem; margin-bottom: 20px; font-weight: 600; }

.footer-links, .footer-contact { list-style: none; padding: 0; margin: 0; }
.footer-links li { margin-bottom: 12px; }
.footer-links a { color: #a0aec0; transition: 0.2s; }
.footer-links a:hover { color: #fff; text-decoration: underline; }

.footer-contact li { display: flex; align-items: center; gap: 10px; margin-bottom: 15px; }

.footer-divider { border-color: #2d3748; margin: 40px 0 30px; }

.footer-bottom {
  display: flex;
  justify-content: space-between;
  font-size: 0.9rem;
  flex-wrap: wrap;
}
</style>