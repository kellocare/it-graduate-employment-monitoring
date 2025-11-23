<template>
  <div class="page-wrapper">
    <!-- Фон (Пузыри) -->
    <div class="blobs-container">
       <div class="blob blob-1"></div>
       <div class="blob blob-2"></div>
    </div>

    <div class="content-container fade-in-up">

       <!-- Кнопка Назад -->
       <div class="back-link" @click="$router.go(-1)">
          <arrow-left-outlined /> Назад к списку
       </div>

       <!-- КАРТОЧКА ПРОФИЛЯ (Тот же дизайн, что в модалке) -->
       <div class="glass-card profile-card">

          <!-- ЛОАДЕР -->
          <div v-if="loading" class="loader-container">
             <loading-outlined spin />
             <p>Загрузка данных...</p>
          </div>

          <div v-else>
             <!-- 1. ШАПКА -->
             <div class="c-header">
               <div class="c-logo">
                  <img v-if="data.company.logo_url" :src="data.company.logo_url" />
                  <bank-filled v-else />
               </div>

               <div class="c-info">
                  <h1>{{ data.company.name }}</h1>

                  <div class="c-meta">
                    <span class="meta-tag">
                      <environment-outlined /> {{ data.company.city || 'Город не указан' }}
                    </span>
                    <a v-if="data.company.website" :href="data.company.website" target="_blank" class="meta-tag link">
                      <global-outlined /> Сайт компании
                    </a>
                  </div>
               </div>

               <div class="c-score">
                  <div class="score-badge" :style="{ background: getScoreColor(data.company.ai_score) }">
                    {{ data.company.ai_score }}%
                  </div>
                  <span class="score-desc">AI Trust</span>
               </div>
             </div>

             <a-divider />

             <!-- 2. ОПИСАНИЕ -->
             <div class="c-body">
                <h4><info-circle-outlined /> О компании</h4>
                <p class="desc-text">
                  {{ data.company.description || 'Описание отсутствует.' }}
                </p>
             </div>

             <a-divider />

             <!-- 3. ОТЗЫВЫ -->
             <div class="c-reviews">
                <div class="reviews-head">
                   <h4><star-filled style="color: #f59e0b" /> Отзывы ({{ data.reviews.length }})</h4>
                </div>

                <!-- Форма отзыва -->
                <div v-if="user && user.role === 'graduate'" class="review-input-box">
                   <div class="rating-row">
                      <span>Оцените:</span>
                      <div class="stars-wrapper">
                         <star-filled
                           v-for="i in 5" :key="i"
                           :class="{ filled: form.rating >= i }"
                           @click="form.rating = i"
                         />
                      </div>
                   </div>
                   <a-textarea
                     v-model:value="form.comment"
                     placeholder="Напишите ваш отзыв..."
                     :rows="3"
                     class="review-input"
                   />
                   <div class="form-actions">
                      <button class="btn-submit" @click="sendReview" :disabled="sending">
                        {{ sending ? '...' : 'Отправить' }}
                      </button>
                   </div>
                </div>

                <!-- Список отзывов -->
                <div class="reviews-list custom-scroll">
                   <div v-if="data.reviews.length === 0" class="empty-state">
                      <message-outlined style="font-size: 24px; opacity: 0.5" />
                      <p>Нет отзывов. Будьте первым!</p>
                   </div>

                   <div v-for="rev in data.reviews" :key="rev.id" class="review-item">
                      <div class="rev-top">
                         <div class="rev-user">
                            <a-avatar size="small" style="background-color: #87d068">
                               {{ rev.first_name?.[0] || 'U' }}
                            </a-avatar>
                            <b>{{ rev.first_name }}</b>
                         </div>
                         <div class="rev-stars">
                            <star-filled v-for="i in rev.rating" :key="i" style="color:#f59e0b"/>
                         </div>
                      </div>
                      <p class="rev-text">{{ rev.comment }}</p>
                      <span class="rev-date">{{ new Date(rev.created_at).toLocaleDateString() }}</span>
                   </div>
                </div>
             </div>

          </div>
       </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, reactive } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '../axios';
import { message } from 'ant-design-vue';
import {
  ArrowLeftOutlined, LoadingOutlined, BankFilled, EnvironmentOutlined,
  GlobalOutlined, StarFilled, InfoCircleOutlined, MessageOutlined
} from '@ant-design/icons-vue';

export default {
  components: {
    ArrowLeftOutlined, LoadingOutlined, BankFilled, EnvironmentOutlined,
    GlobalOutlined, StarFilled, InfoCircleOutlined, MessageOutlined
  },
  setup() {
    const route = useRoute();
    const router = useRouter();

    // Структура данных такая же, как возвращает бэкенд getOne
    const data = ref({ company: {}, reviews: [] });
    const loading = ref(true);
    const user = ref(JSON.parse(localStorage.getItem('user')));
    const sending = ref(false);
    const form = reactive({ rating: 0, comment: '' });

    const loadData = async () => {
       try {
          // Берем ID из URL (company/:id)
          const r = await api.get(`/companies/${route.params.id}`);
          data.value = r.data;
       } catch(e) {
          message.error('Ошибка загрузки');
          router.push('/top-companies');
       }
       finally { loading.value = false; }
    };

    const sendReview = async () => {
       if(form.rating === 0) return message.warning('Поставьте оценку');
       sending.value = true;
       try {
          await api.post('/companies/review', {
             company_id: route.params.id,
             rating: form.rating,
             comment: form.comment
          });
          message.success('Отзыв отправлен на модерацию!');
          form.rating = 0; form.comment = '';
       } catch(e) { message.error('Ошибка'); }
       finally { sending.value = false; }
    };

    const getScoreColor = (s) => {
       if(s >= 80) return '#10b981';
       if(s >= 50) return '#f59e0b';
       return '#ef4444';
    };

    onMounted(loadData);
    return { data, loading, user, form, sendReview, sending, getScoreColor };
  }
}
</script>

<style scoped>
/* Layout */
.page-wrapper { min-height: 100vh; background: #f3f4f6; padding: 40px 20px; display: flex; justify-content: center; position: relative; }
.blobs-container { position: fixed; top:0; left:0; width:100%; height:100%; z-index:0; }
.blob { position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.5; }
.blob-1 { width: 400px; height: 400px; background: #a855f7; top: -10%; left: -10%; }
.blob-2 { width: 500px; height: 500px; background: #3b82f6; bottom: -10%; right: -10%; }

.content-container { max-width: 900px; width: 100%; position: relative; z-index: 1; }

/* Back Button */
.back-link { cursor: pointer; margin-bottom: 20px; font-weight: 600; color: #6b7280; display: inline-flex; align-items: center; gap: 8px; transition: 0.2s; font-size: 1rem; }
.back-link:hover { color: #374151; transform: translateX(-5px); }

/* Card */
.glass-card { background: rgba(255,255,255,0.85); backdrop-filter: blur(20px); border-radius: 24px; padding: 40px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); border: 1px solid white; }
.loader-container { text-align: center; padding: 50px; font-size: 1.2rem; color: #6b7280; display: flex; flex-direction: column; gap: 10px; }

/* Header */
.c-header { display: flex; gap: 25px; align-items: center; margin-bottom: 10px; }
.c-logo { width: 100px; height: 100px; background: #eef2ff; border-radius: 20px; display: flex; align-items: center; justify-content: center; font-size: 3rem; color: #6366f1; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); flex-shrink: 0; }
.c-logo img { width: 100%; height: 100%; object-fit: cover; }

.c-info { flex: 1; }
.c-info h1 { margin: 0 0 10px 0; font-size: 2.2rem; color: #1f2937; }
.c-meta { display: flex; gap: 15px; flex-wrap: wrap; }
.meta-tag { background: #f1f5f9; padding: 6px 14px; border-radius: 10px; color: #64748b; display: flex; align-items: center; gap: 6px; font-size: 0.9rem; }
.meta-tag.link { color: #6366f1; text-decoration: none; cursor: pointer; transition: 0.2s; }
.meta-tag.link:hover { background: #e0e7ff; }

.c-score { text-align: center; }
.score-badge { padding: 8px 16px; border-radius: 14px; color: white; font-weight: 800; font-size: 1.4rem; margin-bottom: 4px; }
.score-desc { font-size: 0.75rem; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; }

/* Body */
.c-body h4 { font-size: 1.2rem; font-weight: 700; color: #334155; margin-bottom: 15px; display: flex; align-items: center; gap: 8px; }
.desc-text { line-height: 1.7; color: #475569; white-space: pre-wrap; font-size: 1rem; }

/* Reviews */
.c-reviews { background: #f8fafc; padding: 25px; border-radius: 20px; border: 1px solid #e2e8f0; }
.reviews-head h4 { font-size: 1.2rem; margin: 0 0 20px 0; }

.review-input-box { background: white; padding: 20px; border-radius: 16px; border: 1px solid #e5e7eb; margin-bottom: 25px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
.rating-row { display: flex; align-items: center; gap: 10px; margin-bottom: 15px; font-weight: 600; color: #475569; }
.stars-wrapper { font-size: 1.4rem; color: #cbd5e1; cursor: pointer; }
.stars-wrapper .filled { color: #f59e0b; }
.review-input { border-radius: 10px; margin-bottom: 15px; border-color: #cbd5e1; }
.form-actions { display: flex; justify-content: flex-end; }
.btn-submit { background: #6366f1; color: white; border: none; padding: 10px 25px; border-radius: 10px; font-weight: 600; cursor: pointer; transition: 0.2s; }
.btn-submit:hover { background: #4f46e5; }
.btn-submit:disabled { opacity: 0.6; }

.reviews-list { max-height: 400px; overflow-y: auto; padding-right: 5px; }
.empty-state { text-align: center; padding: 40px; color: #94a3b8; }
.review-item { background: white; padding: 20px; border-radius: 16px; margin-bottom: 15px; border: 1px solid #e5e7eb; }
.rev-top { display: flex; justify-content: space-between; margin-bottom: 8px; }
.rev-user { display: flex; align-items: center; gap: 10px; font-weight: 700; color: #334155; }
.rev-text { color: #475569; line-height: 1.5; font-size: 0.95rem; margin-bottom: 8px; }
.rev-date { font-size: 0.8rem; color: #9ca3af; }

.custom-scroll::-webkit-scrollbar { width: 6px; }
.custom-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
.fade-in-up { animation: fadeInUp 0.6s ease forwards; }
@keyframes fadeInUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
</style>