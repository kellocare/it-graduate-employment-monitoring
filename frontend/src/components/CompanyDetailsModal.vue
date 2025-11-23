<template>
  <a-modal
    :open="true"
    :footer="null"
    width="800px"
    centered
    class="premium-modal"
    @cancel="$emit('close')"
  >
    <!-- ЛОАДЕР -->
    <div v-if="loading" class="loader-container">
      <loading-outlined spin />
      <p>Загрузка профиля компании...</p>
    </div>

    <!-- КОНТЕНТ -->
    <div v-else class="modal-body">

      <!-- 1. ШАПКА С ФОНОМ -->
      <div class="modal-header-bg">
         <div class="header-content">
            <div class="company-logo">
               <img v-if="data.company.logo_url" :src="data.company.logo_url" alt="logo" />
               <bank-filled v-else />
            </div>

            <div class="company-main-info">
               <h2>{{ data.company.name || 'Без названия' }}</h2>

               <div class="meta-tags">
                 <span class="tag">
                   <environment-outlined /> {{ data.company.city || 'Город не указан' }}
                 </span>
                 <a v-if="data.company.website" :href="data.company.website" target="_blank" class="tag link">
                   <global-outlined /> Сайт компании
                 </a>
               </div>
            </div>

            <div class="trust-badge">
               <div class="score-circle" :style="{ borderColor: getScoreColor(data.company.ai_score), color: getScoreColor(data.company.ai_score) }">
                 {{ data.company.ai_score }}%
               </div>
               <span>AI Trust</span>
            </div>
         </div>
      </div>

      <!-- 2. ОСНОВНОЙ КОНТЕНТ -->
      <div class="modal-scroll-area custom-scroll">

        <!-- Описание -->
        <div class="section-block">
          <h4><info-circle-outlined /> О компании</h4>
          <p class="description-text">
            {{ data.company.description || 'Работодатель пока не добавил подробное описание деятельности компании.' }}
          </p>
        </div>

        <a-divider />

        <!-- Отзывы -->
        <div class="section-block">
           <div class="reviews-header">
              <h4><star-filled style="color: #f59e0b" /> Отзывы сотрудников <span class="count">({{ data.reviews.length }})</span></h4>
           </div>

           <!-- Форма отзыва (Только для Студентов) -->
           <div v-if="user && user.role === 'graduate'" class="write-review-card">
              <div class="rating-select">
                 <span>Ваша оценка:</span>
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
                placeholder="Поделитесь опытом собеседования или работы..."
                :rows="2"
                class="review-input"
              />
              <div class="form-actions">
                 <button class="btn-submit" @click="sendReview" :disabled="sending">
                   {{ sending ? 'Отправка...' : 'Опубликовать' }}
                 </button>
              </div>
           </div>

           <!-- Список отзывов -->
           <div class="reviews-feed">
              <div v-if="data.reviews.length === 0" class="empty-state">
                 <message-outlined style="font-size: 24px; opacity: 0.5" />
                 <p>Отзывов пока нет. Станьте первым!</p>
              </div>

              <div v-for="rev in data.reviews" :key="rev.id" class="review-card">
                 <div class="rev-avatar">
                    {{ rev.first_name?.[0]?.toUpperCase() || 'U' }}
                 </div>
                 <div class="rev-content">
                    <div class="rev-top">
                       <span class="rev-name">{{ rev.first_name }} {{ rev.last_name }}</span>
                       <div class="rev-stars-static">
                          <star-filled v-for="i in rev.rating" :key="i" style="color: #f59e0b" />
                       </div>
                       <span class="rev-date">{{ new Date(rev.created_at).toLocaleDateString() }}</span>
                    </div>
                    <p class="rev-text">{{ rev.comment }}</p>
                 </div>
              </div>
           </div>
        </div>

      </div>
    </div>
  </a-modal>
</template>

<script>
import { ref, onMounted, reactive } from 'vue';
import api from '../axios';
import { message } from 'ant-design-vue';
import {
  LoadingOutlined, BankFilled, StarFilled, EnvironmentOutlined,
  GlobalOutlined, MessageOutlined, InfoCircleOutlined
} from '@ant-design/icons-vue';

export default {
  props: ['companyId'],
  emits: ['close'],
  components: {
    LoadingOutlined, BankFilled, StarFilled, EnvironmentOutlined,
    GlobalOutlined, MessageOutlined, InfoCircleOutlined
  },
  setup(props, { emit }) {
    const data = ref(null);
    const loading = ref(true);
    const sending = ref(false);
    const user = ref(null);
    const form = reactive({ rating: 0, comment: '' });

    const loadData = async () => {
       const userData = localStorage.getItem('user');
       if(userData) user.value = JSON.parse(userData);

       try {
         const r = await api.get(`/companies/${props.companyId}`);
         data.value = r.data;
       } catch(e) {
         console.error(e);
         message.error('Не удалось загрузить данные');
         emit('close');
       } finally {
         loading.value = false;
       }
    };

    const sendReview = async () => {
       if(form.rating === 0) return message.warning('Поставьте оценку (звездочки)');
       if(!form.comment.trim()) return message.warning('Напишите комментарий');

       sending.value = true;
       try {
         await api.post('/companies/review', {
             company_id: props.companyId,
             rating: form.rating,
             comment: form.comment
         });
         message.success('Отзыв отправлен на модерацию!');
         form.rating = 0;
         form.comment = '';
       } catch(e) {
         message.error(e.response?.data?.message || 'Ошибка отправки');
       } finally {
         sending.value = false;
       }
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
/* УБИРАЕМ default padding */
:deep(.ant-modal-body) { padding: 0; }

.loader-container { text-align: center; padding: 60px; font-size: 1.1rem; color: #6b7280; display: flex; flex-direction: column; gap: 10px; justify-content: center; }

/* HEADER */
.modal-header-bg {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  padding: 30px;
  border-bottom: 1px solid #e2e8f0;
  border-radius: 8px 8px 0 0;
}
.header-content { display: flex; align-items: center; gap: 20px; }

.company-logo {
  width: 80px; height: 80px; flex-shrink: 0;
  background: white; border-radius: 16px;
  display: flex; align-items: center; justify-content: center;
  font-size: 2.5rem; color: #6366f1; overflow: hidden;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}
.company-logo img { width: 100%; height: 100%; object-fit: cover; }

.company-main-info { flex: 1; }
.company-main-info h2 { margin: 0 0 8px 0; font-size: 1.8rem; color: #1f2937; line-height: 1.2; }

.meta-tags { display: flex; gap: 10px; flex-wrap: wrap; }
.tag {
  background: white; padding: 4px 10px; border-radius: 8px;
  font-size: 0.85rem; color: #64748b; border: 1px solid #e2e8f0;
  display: flex; align-items: center; gap: 6px;
}
.tag.link { color: #6366f1; text-decoration: none; font-weight: 500; transition: 0.2s; }
.tag.link:hover { border-color: #6366f1; }

/* SCORE */
.trust-badge { text-align: center; }
.score-circle {
  width: 50px; height: 50px; border-radius: 50%;
  border: 4px solid #10b981; color: #10b981;
  display: flex; align-items: center; justify-content: center;
  font-weight: 800; font-size: 1rem; margin: 0 auto;
}
.trust-badge span { font-size: 0.7rem; color: #94a3b8; font-weight: 600; text-transform: uppercase; margin-top: 4px; display: block; }

/* BODY SCROLL AREA */
.modal-scroll-area { max-height: 500px; overflow-y: auto; padding: 25px 30px; }

.section-block h4 { font-size: 1.1rem; font-weight: 700; color: #334155; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
.description-text { line-height: 1.6; color: #475569; white-space: pre-line; font-size: 0.95rem; }

/* REVIEWS */
.reviews-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.count { color: #94a3b8; font-weight: 400; }

/* FORM */
.write-review-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 15px; margin-bottom: 25px; }
.rating-select { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; font-weight: 600; color: #475569; }
.stars-wrapper { font-size: 1.3rem; color: #cbd5e1; cursor: pointer; }
.stars-wrapper .filled { color: #f59e0b; }
.review-input { border-radius: 8px; margin-bottom: 10px; border-color: #cbd5e1; }
.form-actions { display: flex; justify-content: flex-end; }
.btn-submit { background: #6366f1; color: white; border: none; padding: 8px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: 0.2s; }
.btn-submit:hover { background: #4f46e5; }
.btn-submit:disabled { opacity: 0.6; cursor: not-allowed; }

/* REVIEW LIST */
.empty-state { text-align: center; padding: 30px; color: #9ca3af; border: 2px dashed #e2e8f0; border-radius: 12px; }
.empty-state p { margin-top: 5px; }

.review-card { display: flex; gap: 15px; margin-bottom: 20px; border-bottom: 1px solid #f1f5f9; padding-bottom: 20px; }
.review-card:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
.rev-avatar { width: 40px; height: 40px; background: #8b5cf6; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0; }
.rev-content { flex: 1; }
.rev-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.rev-name { font-weight: 700; color: #334155; font-size: 0.95rem; }
.rev-stars-static { color: #f59e0b; font-size: 0.85rem; margin-left: 8px; }
.rev-date { font-size: 0.75rem; color: #94a3b8; margin-left: auto; }
.rev-text { color: #475569; line-height: 1.5; font-size: 0.9rem; }

.custom-scroll::-webkit-scrollbar { width: 5px; }
.custom-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
</style>