<template>
  <div class="dashboard-container">
    <header>
      <div class="welcome-text">
        <h1>📊 Мониторинг трудоустройства</h1>
        <div class="user-info" v-if="user">
          <span>Вы вошли как: <b>{{ user.email }}</b></span>
        </div>
      </div>
      <div class="actions">
        <button @click="$router.push('/profile')" class="btn-primary">👤 Мой профиль</button>
        <button @click="logout" class="btn-danger">Выйти</button>
      </div>
    </header>

    <main>
      <div v-if="loading" class="loading">Загрузка статистики...</div>

      <div v-else>
        <!-- Карточки с цифрами -->
        <div class="stats-grid">
          <div class="stat-card blue">
            <h3>Выпускников</h3>
            <div class="number">{{ stats.totalGrads }}</div>
            <div class="desc">Зарегистрировано в системе</div>
          </div>

          <div class="stat-card green">
            <h3>Трудоустроено</h3>
            <div class="number">{{ stats.employmentRate }}%</div>
            <div class="desc">{{ stats.employedCount }} чел. имеют работу</div>
          </div>

          <div class="stat-card orange">
            <h3>Средняя зарплата</h3>
            <div class="number">{{ formatMoney(stats.avgSalary) }} ₽</div>
            <div class="desc">По текущим данным</div>
          </div>
        </div>

        <!-- Топ компаний -->
        <div class="charts-section">
          <div class="card">
            <h3>🏆 Топ работодателей</h3>
            <ul class="company-list">
              <li v-for="(company, index) in stats.topCompanies" :key="index">
                <span class="rank">#{{ index + 1 }}</span>
                <span class="name">{{ company.name }}</span>
                <span class="count">{{ company.hire_count }} выпускников</span>
              </li>
            </ul>
            <div v-if="stats.topCompanies.length === 0" class="empty-text">Нет данных</div>
          </div>

          <div class="card info-card">
            <h3>ℹ️ О системе</h3>
            <p>Данная система разработана для анализа карьерного трека выпускников ИТ-направлений.</p>
            <p>Заполните свой профиль, чтобы статистика стала точнее!</p>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import api from '../axios';

export default {
  data() {
    return {
      user: null,
      stats: {
        totalGrads: 0,
        employedCount: 0,
        employmentRate: 0,
        avgSalary: 0,
        topCompanies: []
      },
      loading: true
    }
  },
  async mounted() {
    // Проверка авторизации
    const token = localStorage.getItem('token');
    if (!token) {
      this.$router.push('/login');
      return;
    }
    this.user = JSON.parse(localStorage.getItem('user'));

    // Загрузка статистики
    await this.loadStats();
  },
  methods: {
    async loadStats() {
      try {
        const response = await api.get('/analytics');
        this.stats = response.data;
      } catch (e) {
        console.error('Ошибка загрузки статистики', e);
      } finally {
        this.loading = false;
      }
    },
    logout() {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      this.$router.push('/login');
    },
    formatMoney(value) {
      return new Intl.NumberFormat('ru-RU').format(value);
    }
  }
}
</script>

<style scoped>
.dashboard-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid #eee;
}

h1 { margin: 0; font-size: 1.8em; color: #2c3e50; }

.actions button {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
  margin-left: 10px;
}
.btn-primary { background: #3498db; color: white; }
.btn-danger { background: #e74c3c; color: white; }

/* Сетка карточек */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  padding: 20px;
  border-radius: 12px;
  color: white;
  box-shadow: 0 4px 15px rgba(0,0,0,0.1);
}
.stat-card h3 { margin: 0 0 10px 0; font-size: 1em; opacity: 0.9; }
.stat-card .number { font-size: 2.5em; font-weight: bold; }
.stat-card .desc { font-size: 0.85em; opacity: 0.8; margin-top: 5px; }

.blue { background: linear-gradient(135deg, #3498db, #2980b9); }
.green { background: linear-gradient(135deg, #2ecc71, #27ae60); }
.orange { background: linear-gradient(135deg, #f39c12, #d35400); }

/* Секция с топом и инфо */
.charts-section {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;
}

.card {
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.05);
  border: 1px solid #eee;
  color: #333;
}

.company-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.company-list li {
  display: flex;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #f5f5f5;
}
.company-list li:last-child { border-bottom: none; }

.rank { color: #aaa; font-weight: bold; width: 30px; }
.name { flex-grow: 1; font-weight: bold; color: #2c3e50; }
.count { color: #3498db; font-weight: bold; }

.info-card p { color: #666; line-height: 1.5; }
</style>