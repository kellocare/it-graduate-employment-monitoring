<template>
  <div class="content-container fade-in-up">
    <h2><message-filled style="color:#7c3aed; margin-right:10px" /> Модерация отзывов</h2>

    <div v-if="reviews.length === 0" style="text-align:center; padding:40px; color:#9ca3af">
       Нет отзывов на проверке
    </div>

    <div class="reviews-grid">
       <div v-for="rev in reviews" :key="rev.id" class="glass-card rev-card">
          <div class="rev-meta">
             <strong>{{ rev.first_name }} {{ rev.last_name }}</strong> о компании <strong>{{ rev.company_name }}</strong>
          </div>
          <div class="rev-stars">
             <star-filled v-for="i in rev.rating" :key="i" style="color: #f59e0b" />
          </div>
          <p class="rev-text">"{{ rev.comment }}"</p>
          <div class="rev-actions">
             <button class="btn-ok" @click="moderate(rev.id, 'approved')">Одобрить</button>
             <button class="btn-no" @click="moderate(rev.id, 'rejected')">Отклонить</button>
          </div>
       </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import api from '../../axios';
import { message } from 'ant-design-vue';
import { MessageFilled, StarFilled } from '@ant-design/icons-vue';

export default {
  components: { MessageFilled, StarFilled },
  setup() {
    const reviews = ref([]);
    const load = async () => {
       try { const r = await api.get('/companies/admin/reviews'); reviews.value = r.data; } catch(e){}
    };
    const moderate = async (id, status) => {
       try {
         await api.post('/companies/admin/moderate', { id, status });
         reviews.value = reviews.value.filter(r => r.id !== id);
         message.success('Готово');
       } catch(e){}
    };
    onMounted(load);
    return { reviews, moderate };
  }
}
</script>

<style scoped>
.content-container { max-width: 800px; margin: 0 auto; }
.reviews-grid { display: grid; gap: 20px; margin-top: 20px; }
.glass-card { background: rgba(255,255,255,0.8); border-radius: 16px; padding: 20px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
.rev-meta { font-size: 0.9rem; color: #6b7280; margin-bottom: 5px; }
.rev-text { font-size: 1.1rem; font-style: italic; color: #374151; margin: 10px 0; }
.rev-actions { display: flex; gap: 10px; }
.btn-ok { background: #10b981; color: white; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; }
.btn-no { background: #ef4444; color: white; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; }
</style>