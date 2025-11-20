<template>
  <a-layout-footer class="footer">
    <div class="footer-content">
      <a-row :gutter="[32, 32]">
        <a-col :span="24" :md="8">
          <h3 class="footer-title">🎓 IT-Monitoring</h3>
          <p>Система помощи в трудоустройстве выпускников Технологического института.</p>
          <p>© {{ new Date().getFullYear() }} Все права защищены.</p>
        </a-col>

        <a-col :span="24" :md="8">
          <h3 class="footer-title">Контакты разработчика</h3>
          <p><user-outlined /> Белянчиков Александр</p>
          <p><mail-outlined /> <a href="mailto:student@example.com">support@it-monitor.ru</a></p>
          <p><github-outlined /> <a href="https://github.com/kellocare" target="_blank">GitHub Репозиторий</a></p>
        </a-col>

        <a-col :span="24" :md="8">
          <h3 class="footer-title">Университет</h3>
          <p><bank-outlined /> СПбГТИ (ТУ)</p>
          <p><environment-outlined /> Московский пр., 26, Санкт-Петербург</p>
          <a href="https://technolog.edu.ru/" target="_blank">Официальный сайт</a>
        </a-col>
      </a-row>
    </div>
  </a-layout-footer>
</template>

<script>
import { UserOutlined, MailOutlined, GithubOutlined, BankOutlined, EnvironmentOutlined } from '@ant-design/icons-vue';
export default {
  components: { UserOutlined, MailOutlined, GithubOutlined, BankOutlined, EnvironmentOutlined }
}
</script>

<style scoped>
.footer {
  background: #001529;
  color: rgba(255, 255, 255, 0.65);
  padding: 40px 50px;
  margin-top: auto; /* Прижимаем к низу */
}
.footer-title {
  color: #fff;
  font-size: 1.1em;
  margin-bottom: 15px;
}
.footer a {
  color: rgba(255, 255, 255, 0.65);
  transition: color 0.3s;
}
.footer a:hover {
  color: #1890ff;
}
</style>