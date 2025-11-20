<template>
  <div class="login-container">
    <a-card class="auth-card" :title="isLogin ? 'Вход в систему' : 'Регистрация'">

      <a-form layout="vertical" @submit.prevent="handleSubmit">
        <!-- Поля ввода (как было) -->
        <template v-if="!isLogin">
           <a-row :gutter="16">
             <a-col :span="12"><a-form-item label="Имя"><a-input v-model:value="form.first_name" /></a-form-item></a-col>
             <a-col :span="12"><a-form-item label="Фамилия"><a-input v-model:value="form.last_name" /></a-form-item></a-col>
           </a-row>
        </template>

        <a-form-item label="Email">
          <a-input v-model:value="form.email" placeholder="email@example.com" />
        </a-form-item>
        <a-form-item label="Пароль">
          <a-input-password v-model:value="form.password" />
        </a-form-item>

        <a-button type="primary" block html-type="submit" :loading="loading">
          {{ isLogin ? 'Войти' : 'Зарегистрироваться' }}
        </a-button>
      </a-form>

      <div class="divider">или войти через</div>

      <div class="social-buttons">
        <a-button block @click="socialLogin('google')">
           <google-outlined /> Google
        </a-button>
        <a-button block @click="socialLogin('github')">
           <github-outlined /> GitHub
        </a-button>
      </div>

      <div class="switch-mode">
        {{ isLogin ? 'Нет аккаунта?' : 'Уже есть аккаунт?' }}
        <a @click="isLogin = !isLogin">{{ isLogin ? 'Зарегистрироваться' : 'Войти' }}</a>
      </div>
    </a-card>
  </div>
</template>

<script>
import api from '../axios';
import { message } from 'ant-design-vue';
import { GoogleOutlined, GithubOutlined } from '@ant-design/icons-vue';
import { useRoute, useRouter } from 'vue-router';

export default {
  components: {GoogleOutlined, GithubOutlined},
  data() {
    return {
      isLogin: true,
      loading: false,
      form: {email: '', password: '', first_name: '', last_name: ''}
    }
  },
  mounted() {
    const route = useRoute();
    const { token, user, error, activated, isNew } = route.query; // <--- Достаем isNew

    if (activated) message.success('Аккаунт подтвержден! Теперь вы можете войти.');
    if (error) message.error('Ошибка входа через соцсеть');

    if (token && user) {
        localStorage.setItem('token', token);
        localStorage.setItem('user', decodeURIComponent(user));

        message.success('Добро пожаловать!');

        // ЕСЛИ НОВЫЙ ПОЛЬЗОВАТЕЛЬ -> Редирект в профиль с параметром edit=true
        if (isNew === 'true') {
             window.location.href = '/profile?mode=edit&welcome=true';
        } else {
             // Если старый -> Просто в профиль
             window.location.href = '/profile';
        }
    }
  },
  methods: {
    async handleSubmit() {
      this.loading = true;
      try {
        if (this.isLogin) {
          const r = await api.post('/auth/login', this.form);

          localStorage.setItem('token', r.data.token);
          localStorage.setItem('user', JSON.stringify(r.data.user));

          message.success('Вход выполнен');

          setTimeout(() => {
             window.location.href = '/profile';
          }, 100);

        } else {
          await api.post('/auth/registration', { ...this.form, role: 'graduate' });
          message.info('Письмо для подтверждения отправлено на почту!');
          this.isLogin = true;
        }
      } catch (e) {
        message.error(e.response?.data?.message || 'Ошибка');
      } finally {
        this.loading = false;
      }
    },
    socialLogin(provider) {
      window.location.href = `http://localhost:4000/api/auth/${provider}`;
    }
  }
};
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 80vh;
}

.auth-card {
  width: 400px;
  border-radius: 10px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.divider {
  text-align: center;
  color: #999;
  margin: 20px 0;
  font-size: 0.9em;
}

.social-buttons {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.switch-mode {
  text-align: center;
  margin-top: 10px;
}
</style>