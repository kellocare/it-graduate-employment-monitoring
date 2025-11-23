<template>
  <a-modal
    :visible="true"
    title="✏️ Редактирование вакансии"
    @cancel="$emit('close')"
    @ok="saveChanges"
    :confirmLoading="saving"
    width="600px"
  >
    <!-- Лоадер при открытии -->
    <div v-if="loading" style="text-align: center; padding: 40px;">
      <a-spin size="large" />
    </div>

    <!-- Форма редактирования -->
    <a-form v-else layout="vertical">

      <a-alert
        message="Исправление замечаний"
        description="После сохранения вакансия может снова отправиться на модерацию."
        type="info"
        show-icon
        style="margin-bottom: 20px"
      />

      <a-form-item label="Название должности">
        <a-input v-model:value="form.title" />
      </a-form-item>

      <div style="display: flex; gap: 15px;">
        <a-form-item label="Зарплата от (₽)" style="flex: 1">
          <a-input-number v-model:value="form.salary_min" style="width: 100%" :min="0" />
        </a-form-item>
        <a-form-item label="До (₽)" style="flex: 1">
          <a-input-number v-model:value="form.salary_max" style="width: 100%" :min="0" />
        </a-form-item>
      </div>

      <a-form-item label="Описание вакансии">
        <a-textarea
          v-model:value="form.description"
          :rows="6"
          placeholder="Опишите требования и задачи..."
        />
      </a-form-item>

      <a-form-item label="Контактный Email">
        <a-input v-model:value="form.contact_email" />
      </a-form-item>

    </a-form>
  </a-modal>
</template>

<script>
import { ref, onMounted, reactive } from 'vue';
import api from '../axios.js'; // Путь к твоему axios
import { message } from 'ant-design-vue';

export default {
  props: ['vacancyId'],
  emits: ['close', 'saved'],
  setup(props, { emit }) {
    const loading = ref(true);
    const saving = ref(false);

    const form = reactive({
      title: '',
      description: '',
      salary_min: 0,
      salary_max: 0,
      contact_email: ''
    });

    // 1. Загружаем текущие данные вакансии
    const loadVacancy = async () => {
      try {
        // Нам нужен эндпоинт получения одной вакансии.
        // Если его нет, можно использовать getMyVacancies и фильтровать,
        // но лучше сделать router.get('/vacancies/:id')
        const res = await api.get(`/vacancies/${props.vacancyId}`);

        // Заполняем форму
        Object.assign(form, res.data);
      } catch (e) {
        message.error('Не удалось загрузить вакансию');
        emit('close');
      } finally {
        loading.value = false;
      }
    };

    // 2. Сохраняем изменения
    const saveChanges = async () => {
      if (!form.title || !form.description) {
        return message.warning('Заполните обязательные поля');
      }

      saving.value = true;
      try {
        // Вызываем метод updateVacancy (который мы писали в контроллере)
        await api.put(`/vacancies/${props.vacancyId}`, {
          ...form
          // status: 'pending' // Можно принудительно сбросить статус на бэке или здесь
        });

        emit('saved'); // Успех
      } catch (e) {
        message.error('Ошибка сохранения');
      } finally {
        saving.value = false;
      }
    };

    onMounted(loadVacancy);

    return { form, loading, saving, saveChanges };
  }
}
</script>