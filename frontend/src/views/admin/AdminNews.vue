<template>
  <div class="content-container fade-in-up">

    <!-- ЗАГОЛОВОК -->
    <div class="page-header">
      <h2><read-outlined class="icon-purple" /> Управление новостями</h2>
      <a-button type="primary" @click="openCreateModal"><plus-outlined /> Добавить новость</a-button>
    </div>

    <!-- СПИСОК НОВОСТЕЙ -->
    <div class="news-grid">
      <div v-for="item in newsList" :key="item.id" class="glass-card news-item">
        <!-- Картинка -->
        <div class="news-img" :style="{ backgroundImage: `url(${item.image_url || 'https://via.placeholder.com/300'})` }"></div>

        <!-- Контент -->
        <div class="news-content">
          <h4>{{ item.title }}</h4>
          <p class="news-preview">{{ item.content.length > 100 ? item.content.substring(0, 100) + '...' : item.content }}</p>

          <div class="news-footer">
            <small class="date-badge">{{ new Date(item.created_at).toLocaleDateString() }}</small>

            <div class="actions">
              <!-- Кнопка Редактировать -->
              <button class="btn-action edit" @click="openEditModal(item)" title="Редактировать">
                <edit-outlined />
              </button>

              <!-- Кнопка Удалить -->
              <a-popconfirm title="Удалить эту новость?" @confirm="deleteNews(item.id)" ok-text="Да" cancel-text="Нет">
                <button class="btn-action del" title="Удалить">
                  <delete-outlined />
                </button>
              </a-popconfirm>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- МОДАЛКА (ОБЩАЯ ДЛЯ СОЗДАНИЯ И РЕДАКТИРОВАНИЯ) -->
    <!-- Используем v-model:open для Ant Design Vue 3.x, если у вас старая версия - используйте v-model:visible -->
    <a-modal
      v-model:open="showModal"
      :title="isEditing ? 'Редактирование новости' : 'Новая публикация'"
      @ok="handleSave"
      ok-text="Сохранить"
      cancel-text="Отмена"
    >
      <a-form layout="vertical" class="news-form">
        <a-form-item label="Заголовок">
          <a-input v-model:value="form.title" placeholder="Введите заголовок" />
        </a-form-item>

        <a-form-item label="Ссылка на изображение">
          <a-input v-model:value="form.image_url" placeholder="https://..." />
        </a-form-item>

        <!-- Предпросмотр картинки в модалке -->
        <div v-if="form.image_url" class="img-preview" :style="{ backgroundImage: `url(${form.image_url})` }"></div>

        <a-form-item label="Текст новости">
          <a-textarea v-model:value="form.content" :rows="6" placeholder="Основной текст..." />
        </a-form-item>
      </a-form>
    </a-modal>

  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import api from '../../axios';
import { message } from 'ant-design-vue';
import { ReadOutlined, PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons-vue';

export default {
  components: { ReadOutlined, PlusOutlined, DeleteOutlined, EditOutlined },
  setup() {
    const newsList = ref([]);
    const showModal = ref(false);
    const isEditing = ref(false); // Флаг режима
    const currentId = ref(null);  // ID редактируемой новости

    const form = ref({ title: '', content: '', image_url: '' });

    // Загрузка новостей
    const loadNews = async () => {
        try {
          const r = await api.get('/news'); // Публичный роут или /admin/news если есть
          newsList.value = r.data;
        } catch(e) {
          console.error(e);
        }
    };

    // Открыть модалку для СОЗДАНИЯ
    const openCreateModal = () => {
      isEditing.value = false;
      currentId.value = null;
      form.value = { title: '', content: '', image_url: '' };
      showModal.value = true;
    };

    // Открыть модалку для РЕДАКТИРОВАНИЯ
    const openEditModal = (item) => {
      isEditing.value = true;
      currentId.value = item.id;
      // Копируем данные, чтобы не менять карточку в реальном времени до сохранения
      form.value = {
        title: item.title,
        content: item.content,
        image_url: item.image_url
      };
      showModal.value = true;
    };

    // Общая функция сохранения
    const handleSave = async () => {
      if (!form.value.title) return message.warning('Заполните заголовок');
      if (!form.value.content) return message.warning('Напишите текст новости');

      try {
        if (isEditing.value) {
          // --- ЛОГИКА ОБНОВЛЕНИЯ (PUT) ---
          await api.put(`/admin/news/${currentId.value}`, form.value);
          message.success('Новость обновлена');
        } else {
          // --- ЛОГИКА СОЗДАНИЯ (POST) ---
          await api.post('/admin/news', form.value);
          message.success('Новость опубликована');
        }

        showModal.value = false;
        loadNews(); // Обновляем список
      } catch(e) {
        message.error('Ошибка при сохранении');
      }
    };

    const deleteNews = async (id) => {
      try {
        await api.delete(`/admin/news/${id}`);
        loadNews();
        message.success('Удалено');
      } catch(e){
        message.error('Ошибка удаления');
      }
    };

    onMounted(loadNews);

    return {
      newsList, showModal, form,
      isEditing,
      openCreateModal, openEditModal, handleSave, deleteNews
    };
  }
}
</script>

<style scoped>
.content-container { max-width: 1000px; margin: 0 auto; }
.page-header { display: flex; justify-content: space-between; margin-bottom: 25px; align-items: center; }
.icon-purple { color: #7c3aed; margin-right: 10px; }

/* Сетка новостей */
.news-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 25px; }

/* Карточка */
.glass-card {
  background: rgba(255,255,255,0.7);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.6);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 15px rgba(0,0,0,0.03);
  transition: 0.3s;
  display: flex;
  flex-direction: column;
}
.glass-card:hover { transform: translateY(-5px); box-shadow: 0 10px 25px rgba(0,0,0,0.08); }

.news-img { height: 160px; background-size: cover; background-position: center; border-bottom: 1px solid rgba(0,0,0,0.05); }

.news-content { padding: 18px; flex: 1; display: flex; flex-direction: column; }
.news-content h4 { font-weight: 700; color: #1f2937; margin-bottom: 8px; font-size: 1.1rem; }
.news-preview { color: #6b7280; font-size: 0.9rem; line-height: 1.5; flex: 1; margin-bottom: 15px; }

/* Футер карточки */
.news-footer { display: flex; justify-content: space-between; align-items: center; border-top: 1px dashed #e5e7eb; padding-top: 12px; }
.date-badge { background: #f3f4f6; padding: 4px 8px; border-radius: 6px; color: #9ca3af; font-size: 0.75rem; }

.actions { display: flex; gap: 8px; }

/* Кнопки действий */
.btn-action {
  border: none;
  width: 32px; height: 32px;
  border-radius: 8px;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: 0.2s;
}
.btn-action.edit { background: #eff6ff; color: #3b82f6; }
.btn-action.edit:hover { background: #2563eb; color: white; }

.btn-action.del { background: #fef2f2; color: #ef4444; }
.btn-action.del:hover { background: #ef4444; color: white; }

/* Предпросмотр в модалке */
.img-preview {
  width: 100%;
  height: 150px;
  border-radius: 8px;
  background-size: cover;
  background-position: center;
  margin-bottom: 20px;
  border: 1px solid #e5e7eb;
}

.fade-in-up { animation: fadeInUp 0.5s ease forwards; }
@keyframes fadeInUp { from {opacity:0; transform:translateY(20px);} to {opacity:1; transform:translateY(0);} }
</style>