<template>
  <div class="page-wrapper">

    <!-- ФОНОВЫЕ ПУЗЫРИ -->
    <div class="blobs-container">
      <div class="blob blob-1"></div>
      <div class="blob blob-2"></div>
    </div>

    <div class="auth-container fade-in-up">
      <div class="glass-card auth-card">

        <div class="auth-header">
          <div class="logo-icon"><rocket-filled /></div>
          <h2>{{ isLogin ? 'С возвращением' : 'Создание аккаунта' }}</h2>
          <p>{{ isLogin ? 'Введите данные для входа' : 'Присоединяйтесь к платформе' }}</p>
        </div>

        <a-form layout="vertical" @submit.prevent="handleSubmit" class="auth-form" :model="form">

          <!-- ПЕРЕКЛЮЧАТЕЛЬ РОЛИ (ТОЛЬКО РЕГИСТРАЦИЯ) -->
          <transition name="slide-fade">
            <div v-if="!isLogin" class="role-selector">
              <span class="role-label">Тип аккаунта:</span>
              <a-radio-group v-model:value="form.role" button-style="solid" size="middle">
                <a-radio-button value="graduate"><idcard-outlined /> Студент</a-radio-button>
                <a-radio-button value="employer"><bank-outlined /> HR</a-radio-button>
                <!-- НОВАЯ КНОПКА -->
                <a-radio-button value="university_staff"><read-outlined /> ВУЗ</a-radio-button>
              </a-radio-group>
            </div>
          </transition>

          <!-- ДИНАМИЧЕСКИЕ ПОЛЯ -->
          <transition name="slide-fade">
            <div v-if="!isLogin">

               <!-- ИМЯ И ФАМИЛИЯ (Для Студентов И Сотрудников ВУЗа) -->
               <a-row :gutter="12" v-if="['graduate', 'university_staff'].includes(form.role)">
                 <a-col :span="12">
                   <a-form-item
                     label="Имя"
                     name="first_name"
                     :rules="[{ required: true, message: 'Введите имя', trigger: 'blur' }]"
                   >
                     <a-input
                       v-model:value="form.first_name"
                       placeholder="Иван"
                       class="styled-input"
                       :status="firstNameError ? 'error' : ''"
                     />
                   </a-form-item>
                 </a-col>
                 <a-col :span="12">
                   <a-form-item
                     label="Фамилия"
                     name="last_name"
                     :rules="[{ required: true, message: 'Введите фамилию', trigger: 'blur' }]"
                   >
                     <a-input
                       v-model:value="form.last_name"
                       placeholder="Иванов"
                       class="styled-input"
                       :status="lastNameError ? 'error' : ''"
                     />
                   </a-form-item>
                 </a-col>
               </a-row>

               <!-- ПОЛЕ ВЫБОРА ВУЗА (Только для Сотрудников ВУЗа) -->
               <a-form-item
                 v-if="form.role === 'university_staff'"
                 label="Выберите ВУЗ"
                 name="university"
                 :rules="[{ required: true, message: 'Выберите университет', trigger: 'change' }]"
               >
                 <a-select
                   v-model:value="form.university_name"
                   show-search
                   placeholder="Начните вводить название..."
                   class="styled-select"
                   :status="universityError ? 'error' : ''"
                   :options="universityOptions"
                   :filter-option="filterUniversityOption"
                 >
                   <template #suffixIcon><read-outlined /></template>
                 </a-select>
               </a-form-item>

               <!-- НАЗВАНИЕ КОМПАНИИ (Только для HR) -->
               <a-form-item
                 v-if="form.role === 'employer'"
                 label="Название компании"
                 name="first_name"
                 :rules="[{ required: true, message: 'Введите название компании', trigger: 'blur' }]"
               >
                 <a-input
                   v-model:value="form.first_name"
                   placeholder="Например: ООО Техно"
                   class="styled-input"
                   :status="companyNameError ? 'error' : ''"
                 >
                   <template #prefix><bank-outlined class="field-icon" /></template>
                 </a-input>
               </a-form-item>
            </div>
          </transition>

          <!-- EMAIL -->
          <a-form-item
            label="Email"
            name="email"
            :rules="[
              { required: true, message: 'Введите email', trigger: 'blur' },
              { type: 'email', message: 'Введите корректный email', trigger: 'blur' }
            ]"
          >
            <a-input
              v-model:value="form.email"
              placeholder="email@example.com"
              class="styled-input"
              :status="emailError ? 'error' : ''"
            >
              <template #prefix><mail-outlined class="field-icon" /></template>
            </a-input>
          </a-form-item>

          <!-- ПАРОЛЬ -->
          <a-form-item
            label="Пароль"
            name="password"
            :rules="[
              { required: true, message: 'Введите пароль', trigger: 'blur' },
              { min: 6, message: 'Пароль должен быть не менее 6 символов', trigger: 'blur' }
            ]"
          >
            <a-input-password
              v-model:value="form.password"
              placeholder="••••••••"
              class="styled-input"
              @change="checkPasswordStrength"
              :status="passwordError ? 'error' : ''"
            >
              <template #prefix><lock-outlined class="field-icon" /></template>
            </a-input-password>

            <div v-if="!isLogin && form.password" class="password-info">
              <div class="strength-bar-bg">
                 <div class="strength-bar" :style="{ width: passwordStrength + '%', background: passwordColor }"></div>
              </div>
              <small :style="{ color: passwordColor }">{{ passwordMessage }}</small>
            </div>
          </a-form-item>

          <!-- CAPTCHA -->
          <div class="captcha-wrapper" v-if="!isLogin">
             <vue-hcaptcha
                sitekey="10000000-ffff-ffff-ffff-000000000001"
                @verify="onCaptchaVerify"
             />
          </div>

          <!-- ЮРИДИЧЕСКИЕ ГАЛОЧКИ -->
          <div v-if="!isLogin" class="legal-checks">
            <a-form-item
              class="mb-5"
              name="agreedToTerms"
              :rules="[{ validator: validateTerms, trigger: 'change' }]"
            >
              <a-checkbox v-model:checked="form.agreedToTerms">
                Согласен на <a @click.prevent="termsVisible = true" class="link">обработку персональных данных</a>
              </a-checkbox>
            </a-form-item>

            <a-form-item class="mb-5">
              <a-checkbox v-model:checked="form.subscribeToNews">
                Получать новости и вакансии на почту
              </a-checkbox>
            </a-form-item>
          </div>

          <div v-if="isLogin" class="forgot-pass">
            <a href="#" class="link-muted">Забыли пароль?</a>
          </div>

          <a-button type="primary" block html-type="submit" :loading="loading" class="btn-submit" size="large">
            {{ isLogin ? 'Войти' : 'Создать аккаунт' }}
          </a-button>
        </a-form>

        <div class="divider"><span>или через соцсети</span></div>

        <div class="social-buttons">
          <button class="btn-social google" @click="socialLogin('google')">
             <google-outlined /> Google
          </button>
          <button class="btn-social github" @click="socialLogin('github')">
             <github-outlined /> GitHub
          </button>
        </div>

        <div class="switch-mode">
          <span class="text-muted">{{ isLogin ? 'Еще нет аккаунта?' : 'Уже зарегистрированы?' }}</span>
          <a @click="toggleMode" class="link-bold">{{ isLogin ? 'Регистрация' : 'Вход' }}</a>
        </div>

      </div>
    </div>

    <!-- МОДАЛКА (Оставлена без изменений, код сокращен для удобства) -->
    <a-modal v-model:open="termsVisible" title="Согласие на обработку персональных данных" width="90%" :footer="null" centered>
       <div class="terms-content custom-scroll">
         <!-- Контент соглашения... -->
         <p>Текст соглашения...</p>
         <div class="terms-actions">
           <a-button @click="termsVisible = false">Отклонить</a-button>
           <a-button type="primary" @click="acceptTerms">Принимаю</a-button>
         </div>
       </div>
    </a-modal>

  </div>
</template>

<script>
import api from '../axios';
import { message } from 'ant-design-vue';
import {
  GoogleOutlined, GithubOutlined, RocketFilled,
  MailOutlined, LockOutlined, BankOutlined,
  IdcardOutlined, ReadOutlined // <-- Добавлен импорт иконки
} from '@ant-design/icons-vue';
import { useRoute } from 'vue-router';
import VueHcaptcha from '@hcaptcha/vue3-hcaptcha';

export default {
  components: {
    GoogleOutlined, GithubOutlined, RocketFilled,
    MailOutlined, LockOutlined, BankOutlined, IdcardOutlined, ReadOutlined,
    VueHcaptcha
  },
  data() {
    return {
      isLogin: true,
      loading: false,
      termsVisible: false,

      passwordStrength: 0,
      passwordColor: '#e5e7eb',
      passwordMessage: '',
      captchaToken: null,

      // Флаги ошибок
      firstNameError: false,
      lastNameError: false,
      companyNameError: false,
      universityError: false, // <-- Новая ошибка
      emailError: false,
      passwordError: false,

      form: {
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        university_name: undefined, // <-- Поле для вуза
        role: 'graduate',
        agreedToTerms: false,
        subscribeToNews: true
      },

      // Список ВУЗов (можно вынести в отдельный файл или грузить с бэка)
      universityOptions: [
        { value: 'MGU', label: 'МГУ им. Ломоносова' },
        { value: 'BMSTU', label: 'МГТУ им. Баумана' },
        { value: 'HSE', label: 'НИУ ВШЭ' },
        { value: 'MIPT', label: 'МФТИ' },
        { value: 'ITMO', label: 'ИТМО' },
        { value: 'MEPHI', label: 'НИЯУ МИФИ' },
        { value: 'SPBU', label: 'СПбГУ' },
        { value: 'URFU', label: 'УрФУ' },
        { value: 'KFU', label: 'КФУ' },
        { value: 'NSU', label: 'НГУ' },
        { value: 'Other', label: 'Другой ВУЗ' }
      ]
    }
  },
  mounted() {
    const route = useRoute();
    const { token, user, error, activated, isNew } = route.query;

    if (activated) message.success('Аккаунт подтвержден! Теперь вы можете войти.');
    if (error) message.error('Ошибка входа через соцсеть');

    if (token && user) {
        this.handleAuthSuccess({ token, user: JSON.parse(decodeURIComponent(user)) });
    }
  },
  methods: {
    toggleMode() {
      this.isLogin = !this.isLogin;
      this.form.agreedToTerms = false;
      this.captchaToken = null;
      this.resetErrors();
    },

    resetErrors() {
      this.firstNameError = false;
      this.lastNameError = false;
      this.companyNameError = false;
      this.universityError = false;
      this.emailError = false;
      this.passwordError = false;
    },

    acceptTerms() {
      this.form.agreedToTerms = true;
      this.termsVisible = false;
      message.success('Согласие принято');
    },

    onCaptchaVerify(token) {
      this.captchaToken = token;
    },

    validateTerms(rule, value) {
      if (!value) return Promise.reject('Необходимо принять соглашение');
      return Promise.resolve();
    },

    // Фильтр для поиска в выпадающем списке
    filterUniversityOption(input, option) {
      return option.label.toLowerCase().indexOf(input.toLowerCase()) >= 0;
    },

    validateForm() {
      this.resetErrors();

      if (!this.form.email || !this.form.email.includes('@')) {
        this.emailError = true;
        return false;
      }

      if (!this.form.password || this.form.password.length < 6) {
        this.passwordError = true;
        return false;
      }

      if (!this.isLogin) {
        // Логика для Студента ИЛИ Сотрудника ВУЗа (нужны имя и фамилия)
        if (['graduate', 'university_staff'].includes(this.form.role)) {
          if (!this.form.first_name?.trim()) {
            this.firstNameError = true;
            return false;
          }
          if (!this.form.last_name?.trim()) {
            this.lastNameError = true;
            return false;
          }

          // Доп проверка для ВУЗа
          if (this.form.role === 'university_staff' && !this.form.university_name) {
             this.universityError = true;
             message.error('Выберите университет из списка');
             return false;
          }
        }
        // Логика для HR
        else if (this.form.role === 'employer') {
          if (!this.form.first_name?.trim()) {
            this.companyNameError = true;
            return false;
          }
        }

        if (!this.form.agreedToTerms) {
          message.warning('Примите соглашение!');
          return false;
        }
      }
      return true;
    },

    checkPasswordStrength() {
       // ... (код проверки пароля оставил тем же, он нормальный)
       const val = this.form.password;
       if(!val) { this.passwordStrength = 0; return; }
       this.passwordStrength = Math.min(val.length * 10, 100);
       if(val.length > 8) { this.passwordColor = '#52c41a'; this.passwordMessage = 'Хороший'; }
       else { this.passwordColor = '#faad14'; this.passwordMessage = 'Средний'; }
    },

    async handleSubmit() {
      if (!this.validateForm()) return;

      this.loading = true;
      try {
        if (this.isLogin) {
          const r = await api.post('/auth/login', { email: this.form.email, password: this.form.password });
          this.handleAuthSuccess(r.data);
        } else {
          // Отправляем данные регистрации
          await api.post('/auth/registration', {
            ...this.form,
            captchaToken: this.captchaToken
          });
          message.info('Письмо подтверждения отправлено!');
          this.isLogin = true;
          this.resetErrors();
        }
      } catch (e) {
        message.error(e.response?.data?.message || 'Ошибка');
      } finally {
        this.loading = false;
      }
    },

    handleAuthSuccess(data) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        message.success('Вход выполнен');

        // Редирект в зависимости от роли
        setTimeout(() => {
             const role = data.user.role;
             if (role === 'employer') window.location.href = '/employer';
             else if (role === 'admin') window.location.href = '/admin';
             else if (role === 'university_staff') window.location.href = '/university/dashboard'; // <-- Редирект для вуза
             else window.location.href = '/profile';
        }, 500);
    },

    socialLogin(provider) {
      window.location.href = `http://localhost:4000/api/auth/${provider}`;
    }
  }
};
</script>

<style scoped>
/* Дополнительные стили для селекта */
.styled-select {
  width: 100%;
}
:deep(.ant-select-selector) {
  border-radius: 10px !important;
  height: 42px !important;
  display: flex;
  align-items: center;
  border-color: #e5e7eb !important;
}
/* Остальные стили те же, что и у тебя в файле */
.page-wrapper { position: relative; width: 100%; min-height: 100vh; background: #f0f2f5; display: flex; justify-content: center; align-items: center; overflow: hidden; }
.blobs-container { position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 0; }
.blob { position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.5; }
.blob-1 { width: 400px; height: 400px; background: #a855f7; top: -50px; left: -50px; }
.blob-2 { width: 350px; height: 350px; background: #3b82f6; bottom: -50px; right: -50px; }
.auth-container { position: relative; z-index: 10; width: 100%; max-width: 420px; padding: 20px; }
.glass-card { background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.6); border-radius: 24px; padding: 40px 30px; box-shadow: 0 20px 40px rgba(0,0,0,0.08); }
.auth-header { text-align: center; margin-bottom: 30px; }
.logo-icon { width: 60px; height: 60px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 30px; color: white; margin: 0 auto 15px; box-shadow: 0 10px 20px rgba(99, 102, 241, 0.3); }
.auth-header h2 { margin: 0; color: #1f2937; font-weight: 800; }
.auth-header p { margin: 5px 0 0; color: #6b7280; }
.styled-input { border-radius: 10px; padding: 10px 12px; font-size: 0.95rem; border: 1px solid #e5e7eb; background: rgba(255,255,255,0.8); transition: 0.3s; }
.styled-input:focus { border-color: #8b5cf6; box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1); background: white; }
.field-icon { color: #9ca3af; }
.role-selector { text-align: center; margin-bottom: 20px; background: #f9fafb; padding: 10px; border-radius: 12px; }
.role-label { display: block; margin-bottom: 8px; font-size: 0.85rem; color: #6b7280; }
.password-info { margin-top: 8px; }
.strength-bar-bg { height: 4px; background: #e5e7eb; border-radius: 2px; overflow: hidden; margin-bottom: 4px; }
.strength-bar { height: 100%; transition: width 0.3s ease, background 0.3s ease; }
.password-info small { font-size: 0.75rem; transition: color 0.3s; }
.captcha-wrapper { display: flex; justify-content: center; margin-bottom: 20px; }
.legal-checks { margin-bottom: 20px; }
.mb-5 { margin-bottom: 5px; }
.link { color: #6366f1; text-decoration: underline; cursor: pointer; }
.btn-submit { height: 45px; border-radius: 12px; font-weight: 700; font-size: 1rem; background: linear-gradient(135deg, #6366f1, #4f46e5); border: none; box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3); }
.btn-submit:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(99, 102, 241, 0.4); }
.divider { display: flex; align-items: center; color: #9ca3af; margin: 25px 0; font-size: 0.85rem; }
.divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: #e5e7eb; }
.divider span { padding: 0 10px; }
.social-buttons { display: flex; gap: 15px; margin-bottom: 25px; }
.btn-social { flex: 1; padding: 10px; border-radius: 12px; border: 1px solid #e5e7eb; background: white; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; font-weight: 600; color: #374151; transition: 0.2s; }
.btn-social:hover { border-color: #6366f1; color: #6366f1; background: #f5f3ff; }
.switch-mode { text-align: center; font-size: 0.9rem; }
.text-muted { color: #6b7280; }
.link-bold { color: #6366f1; font-weight: 700; cursor: pointer; margin-left: 5px; }
.link-muted { color: #9ca3af; font-size: 0.85rem; float: right; margin-top: -15px; margin-bottom: 15px; }
.fade-in-up { opacity: 0; animation: fadeInUp 0.6s ease-out forwards; }
@keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
.slide-fade-enter-active, .slide-fade-leave-active { transition: all 0.3s ease; }
.slide-fade-enter-from, .slide-fade-leave-to { transform: translateY(-10px); opacity: 0; }
</style>