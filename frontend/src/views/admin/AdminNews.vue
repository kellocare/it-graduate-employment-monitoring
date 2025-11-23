<template>
  <div class="content-container fade-in-up">
    <div class="page-header">
      <h2><read-outlined class="icon-purple" /> Управление новостями</h2>
      <a-button type="primary" @click="showModal = true"><plus-outlined /> Добавить новость</a-button>
    </div>

    <div class="news-grid">
      <div v-for="item in newsList" :key="item.id" class="glass-card news-item">
        <div class="news-img" :style="{ backgroundImage: `url(${item.image_url || 'https://via.placeholder.com/300'})` }"></div>
        <div class="news-content">
          <h4>{{ item.title }}</h4>
          <p>{{ item.content.substring(0, 100) }}...</p>
          <div class="news-footer">
            <small>{{ new Date(item.created_at).toLocaleDateString() }}</small>
            <a-popconfirm title="Удалить?" @confirm="deleteNews(item.id)">
              <button class="btn-del"><delete-outlined /></button>
            </a-popconfirm>
          </div>
        </div>
      </div>
    </div>

    <!-- Модалка создания -->
    <a-modal v-model:visible="showModal" title="Новая публикация" @ok="createNews">
      <a-form layout="vertical">
        <a-form-item label="Заголовок"><a-input v-model:value="form.title" /></a-form-item>
        <a-form-item label="Ссылка на картинку"><a-input v-model:value="form.image_url" placeholder="https://..." /></a-form-item>
        <a-form-item label="Текст"><a-textarea v-model:value="form.content" :rows="4" /></a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import api from '../../axios';
import { message } from 'ant-design-vue';
import { ReadOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons-vue';

export default {
  components: { ReadOutlined, PlusOutlined, DeleteOutlined },
  setup() {
    const newsList = ref([]);
    const showModal = ref(false);
    const form = ref({ title: '', content: '', image_url: '' });

    const loadNews = async () => {
        try {
    // Обращаемся к публичному роуту, который мы только что создали
          const r = await api.get('/news');
          newsList.value = r.data;
        } catch(e) {
          console.error(e);
        }
    };

    const createNews = async () => {
      if (!form.value.title) return message.warning('Заполните заголовок');
      try {
        await api.post('/admin/news', form.value);
        message.success('Опубликовано');
        showModal.value = false;
        form.value = { title: '', content: '', image_url: '' };
        loadNews();
      } catch(e) { message.error('Ошибка'); }
    };

    const deleteNews = async (id) => {
      try { await api.delete(`/admin/news/${id}`); loadNews(); message.success('Удалено'); } catch(e){}
    };

    onMounted(loadNews);
    return { newsList, showModal, form, createNews, deleteNews };
  }
}
</script>

<style scoped>
.content-container { max-width: 1000px; margin: 0 auto; }
.page-header { display: flex; justify-content: space-between; margin-bottom: 20px; }
.news-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
.glass-card { background: rgba(255,255,255,0.8); border-radius: 16px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); transition: 0.3s; }
.glass-card:hover { transform: translateY(-5px); }
.news-img { height: 150px; background-size: cover; background-position: center; }
.news-content { padding: 15px; }
.news-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 10px; color: #9ca3af; }
.btn-del { border: none; background: #fee2e2; color: #ef4444; border-radius: 6px; cursor: pointer; padding: 5px 10px; }
.icon-purple { color: #7c3aed; margin-right: 10px; }
.fade-in-up { animation: fadeInUp 0.5s ease forwards; }
@keyframes fadeInUp { from {opacity:0; transform:translateY(20px);} to {opacity:1; transform:translateY(0);} }
</style>