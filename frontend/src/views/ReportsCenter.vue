<template>
  <div class="page-wrapper">
    <div class="blobs-container">
      <div class="blob blob-1"></div>
      <div class="blob blob-2"></div>
    </div>

    <div class="content-container fade-in">

      <!-- HEADER -->
      <header class="page-header">
        <div class="header-left">
          <div class="header-titles">
            <h1>Центр отчетов</h1>
            <span class="header-subtitle">Генерация документов и аналитика</span>
          </div>
        </div>
        <div class="header-actions">
           <span class="status-text" v-if="saving"><loading-outlined /> Сохранение...</span>
           <button class="btn-secondary" @click="saveReport" :disabled="saving || generating">
             <save-outlined /> В профиль
           </button>
           <button class="btn-primary" @click="downloadPDF" :disabled="generating">
             <file-pdf-outlined /> Скачать PDF
           </button>
        </div>
      </header>

      <div class="report-workspace">

        <!-- === ЛЕВАЯ ПАНЕЛЬ: НАСТРОЙКИ === -->
        <div class="inspector-panel custom-scroll">
          <div class="mode-switcher">
            <div class="mode-btn" :class="{ active: activeTab === 'builder' }" @click="activeTab = 'builder'">
              <appstore-outlined /> Конструктор
            </div>
            <div class="mode-btn" :class="{ active: activeTab === 'ai' }" @click="activeTab = 'ai'">
              <robot-outlined /> AI Анализ
            </div>
            <div class="mode-btn" :class="{ active: activeTab === 'reg' }" @click="activeTab = 'reg'">
              <file-done-outlined /> Гос. формы
            </div>
          </div>

          <div class="inspector-content">
            <!-- 1. КОНСТРУКТОР -->
            <transition name="fade-slide" mode="out-in">
              <div v-if="activeTab === 'builder'" key="builder" class="tab-pane">
                <div class="control-section">
                   <label class="section-label">Заголовок</label>
                   <a-input v-model:value="reportTitle" class="modern-input" />
                </div>

                <div class="control-section">
                   <label class="section-label">Блоки отчета</label>
                   <div class="toggle-list">
                      <div class="toggle-item" :class="{ active: config.showIntro }" @click="config.showIntro = !config.showIntro">
                        <div class="ti-label"><align-left-outlined /> Вводная часть</div>
                        <check-circle-filled v-if="config.showIntro" class="check-icon"/>
                      </div>
                      <div class="toggle-item" :class="{ active: config.showKpi }" @click="config.showKpi = !config.showKpi">
                        <div class="ti-label"><dashboard-outlined /> Основные KPI</div>
                        <check-circle-filled v-if="config.showKpi" class="check-icon"/>
                      </div>
                      <div class="toggle-item" :class="{ active: config.showDemography }" @click="config.showDemography = !config.showDemography">
                        <div class="ti-label"><team-outlined /> Демография</div>
                        <check-circle-filled v-if="config.showDemography" class="check-icon"/>
                      </div>
                      <div class="toggle-item" :class="{ active: config.showGeo }" @click="config.showGeo = !config.showGeo">
                        <div class="ti-label"><global-outlined /> География</div>
                        <check-circle-filled v-if="config.showGeo" class="check-icon"/>
                      </div>
                      <div class="toggle-item" :class="{ active: config.showTopCompanies }" @click="config.showTopCompanies = !config.showTopCompanies">
                        <div class="ti-label"><trophy-outlined /> Топ партнеров</div>
                        <check-circle-filled v-if="config.showTopCompanies" class="check-icon"/>
                      </div>
                      <div class="toggle-item warning" :class="{ active: config.showRisks }" @click="config.showRisks = !config.showRisks">
                        <div class="ti-label"><fire-outlined /> Зона риска</div>
                        <check-circle-filled v-if="config.showRisks" class="check-icon"/>
                      </div>
                   </div>
                </div>
                <div class="control-section">
                   <label class="section-label">Выводы</label>
                   <a-textarea v-model:value="config.customText" :rows="4" class="modern-textarea" placeholder="Заключение..." />
                </div>
              </div>

              <!-- 2. AI АНАЛИТИК -->
              <div v-else-if="activeTab === 'ai'" key="ai" class="tab-pane ai-pane-styled">
                <div class="ai-promo-card">
                   <div class="ai-icon-glow"><robot-filled /></div>
                   <div class="ai-promo-text"><strong>AI Аналитик</strong><p>Нейросеть проанализирует данные и напишет отчет.</p></div>
                </div>
                <div class="control-section">
                   <label class="section-label">Цель анализа</label>
                   <a-select v-model:value="aiConfig.mode" class="modern-select-lg" style="width: 100%">
                      <a-select-option value="general">Общий обзор</a-select-option>
                      <a-select-option value="risks">Риски и проблемы</a-select-option>
                      <a-select-option value="partners">Рынок труда</a-select-option>
                   </a-select>
                </div>
                <div class="control-section">
                   <label class="section-label">Акцент на</label>
                   <a-textarea v-model:value="aiConfig.prompt" class="modern-textarea ai-textarea" placeholder="Например: Сравнить с прошлым годом..." :rows="5" />
                </div>
                <button class="btn-generate-ai" @click="generateAiContent" :disabled="aiLoading">
                   <div class="btn-content">
                     <thunderbolt-filled v-if="!aiLoading" /><loading-outlined v-else />
                     <span>{{ aiLoading ? 'Анализирую...' : 'Сгенерировать' }}</span>
                   </div>
                </button>
              </div>

              <!-- 3. ГОС ФОРМЫ -->
              <div v-else-if="activeTab === 'reg'" key="reg" class="tab-pane">
                <div class="control-section">
                   <label class="section-label">Шаблон</label>
                   <div class="forms-list-vertical">
                      <div class="form-row-item" :class="{ active: regForm.type === 'vpo1' }" @click="selectRegForm('vpo1')">
                         <div class="icon-wrap xls"><file-excel-outlined /></div>
                         <div class="form-info"><span class="fi-title">Форма ВПО-1</span><span class="fi-desc">Сводная по факультетам</span></div>
                      </div>
                      <div class="form-row-item" :class="{ active: regForm.type === 'kcst' }" @click="selectRegForm('kcst')">
                         <div class="icon-wrap doc"><file-done-outlined /></div>
                         <div class="form-info"><span class="fi-title">Мониторинг КЦСТ</span><span class="fi-desc">Детализация трудоустройства</span></div>
                      </div>
                      <div class="form-row-item" :class="{ active: regForm.type === 'army' }" @click="selectRegForm('army')">
                         <div class="icon-wrap pdf"><idcard-outlined /></div>
                         <div class="form-info"><span class="fi-title">Воинский учет</span><span class="fi-desc">Списки (мужской пол)</span></div>
                      </div>
                   </div>
                </div>
                <div class="control-section">
                   <label class="section-label">Параметры</label>
                   <div class="param-group"><span>Отчетный год</span><a-input-number v-model:value="regForm.year" class="modern-input full-width" :min="2020" :max="2030" /></div>
                </div>
                <button class="btn-generate-reg" @click="generateRegReport"><sync-outlined /> Обновить данные</button>
              </div>
            </transition>
          </div>
        </div>

        <!-- === ПРАВАЯ ПАНЕЛЬ: ПРЕВЬЮ (A4) === -->
        <div class="preview-wrapper">
           <div class="preview-toolbar">Предварительный просмотр (A4)</div>
           <div class="preview-scroll-area custom-scroll">
               <div class="sheet-container">
                   <div id="print-area" class="a4-sheet">

                      <!-- ШАПКА ДОКУМЕНТА -->
                      <div class="doc-header">
                         <div class="dh-left">
                            <img :src="universityInfo.logo" class="doc-logo" />
                            <div class="dh-text">
                               <div class="dh-uni">{{ universityInfo.name }}</div>
                               <div class="dh-dep">{{ universityInfo.department }}</div>
                            </div>
                         </div>
                         <div class="dh-right">
                            <div class="dh-date">{{ new Date().toLocaleDateString() }}</div>
                            <div class="dh-id">Исх. № {{ Math.floor(Math.random() * 10000) }}</div>
                         </div>
                      </div>

                      <div class="doc-divider"></div>
                      <h1 class="doc-title">{{ reportTitle }}</h1>

                      <!-- 1. ВВОДНАЯ / AI -->
                      <div v-if="config.showIntro || activeTab === 'ai'" class="doc-section fade-in">
                         <div v-if="aiContent" class="doc-text justified-text" v-html="renderMarkdown(aiContent)"></div>
                         <div v-else-if="config.customText" class="doc-text justified-text">{{ config.customText }}</div>
                         <div v-else class="doc-placeholder">{{ activeTab === 'ai' ? 'Нажмите "Сгенерировать"...' : 'Здесь будет вводная часть.' }}</div>
                      </div>

                      <!-- 2. KPI -->
                      <div v-if="config.showKpi && stats" class="doc-section fade-in">
                         <h3 class="sec-title">Основные показатели</h3>
                         <div class="kpi-grid">
                            <div class="kpi-box"><span class="kpi-lbl">ВЫПУСКНИКОВ</span><span class="kpi-val">{{ stats.kpi.total || 0 }}</span></div>
                            <div class="kpi-box"><span class="kpi-lbl">ТРУДОУСТРОЕНО</span><span class="kpi-val">{{ stats.kpi.rate || 0 }}%</span></div>
                            <div class="kpi-box"><span class="kpi-lbl">СР. ЗАРПЛАТА</span><span class="kpi-val">{{ formatMoney(stats.kpi.avg_salary || 0) }}</span></div>
                         </div>
                      </div>

                      <!-- 3. ДЕМОГРАФИЯ (REAL DATA) -->
                      <div v-if="config.showDemography" class="doc-section fade-in">
                        <h3 class="sec-title">Демографическая справка</h3>
                        <p class="doc-paragraph">
                           В выборку включены только пользователи с подтвержденной учетной записью.
                           Среди выпускников преобладают {{ (demoStats.female > demoStats.male) ? 'женщины' : 'мужчины' }}.
                        </p>
                        <table class="doc-table compact">
                           <thead><tr><th>Категория</th><th>Количество</th><th>% от общего</th></tr></thead>
                           <tbody>
                              <tr><td>Мужчины</td><td>{{ demoStats.male }}</td><td>{{ demoStats.malePct }}%</td></tr>
                              <tr><td>Женщины</td><td>{{ demoStats.female }}</td><td>{{ demoStats.femalePct }}%</td></tr>
                           </tbody>
                        </table>
                      </div>

                      <!-- 4. ГЕОГРАФИЯ (REAL DATA) -->
                      <div v-if="config.showGeo" class="doc-section fade-in">
                        <h3 class="sec-title">География трудоустройства</h3>
                        <p class="doc-paragraph">Топ регионов присутствия выпускников (по данным профиля):</p>
                        <ul class="doc-list">
                           <li v-for="geo in geoStats" :key="geo.city">
                               <strong>{{ geo.city }}:</strong> {{ geo.count }} чел. ({{ geo.percent }}%)
                           </li>
                           <li v-if="geoStats.length === 0">Данные о геолокации не заполнены</li>
                        </ul>
                      </div>

                      <!-- 5. ЗОНА РИСКА -->
                      <div v-if="config.showRisks && stats" class="doc-section fade-in">
                         <h3 class="sec-title">Анализ рисков</h3>
                         <div class="risk-alert-box">
                            Выявлено <strong>{{ stats.kpi.at_risk || 0 }} {{ getDeclension(stats.kpi.at_risk || 0, ['выпускник', 'выпускника', 'выпускников']) }}</strong>, находящихся в поиске работы более 6 месяцев.
                         </div>
                      </div>

                      <!-- 6. ТОП ПАРТНЕРОВ (Сортировка и фильтрация) -->
                      <div v-if="config.showTopCompanies && stats" class="doc-section fade-in">
                         <h3 class="sec-title">Ключевые работодатели</h3>
                         <table class="doc-table">
                            <thead><tr><th>Наименование организации</th><th align="right">Трудоустроено</th></tr></thead>
                            <tbody>
                               <tr v-for="comp in sortedCompanies" :key="comp.company_name">
                                  <td>{{ comp.company_name }}</td>
                                  <td align="right"><b>{{ comp.hires || 0 }}</b> чел.</td>
                               </tr>
                               <tr v-if="!sortedCompanies.length"><td colspan="2" class="text-center">Нет данных</td></tr>
                            </tbody>
                         </table>
                      </div>

                      <!-- === ГОС ФОРМЫ (РЕАЛЬНЫЕ ДАННЫЕ) === -->
                      <div v-if="activeTab === 'reg' && regForm.type" class="doc-section fade-in">

                         <!-- ВПО-1 -->
                         <template v-if="regForm.type === 'vpo1'">
                             <h3 class="sec-title">ВПО-1. Раздел 1. Сводные данные</h3>
                             <table class="doc-table strict">
                                <thead><tr><th>Факультет</th><th align="center">Выпуск</th><th align="center">Трудоустроено</th></tr></thead>
                                <tbody>
                                   <tr v-for="fac in facultyStats" :key="fac.faculty">
                                      <td>{{ fac.faculty }}</td>
                                      <td align="center">{{ fac.count }}</td>
                                      <td align="center">{{ fac.employed }}</td>
                                   </tr>
                                   <tr v-if="facultyStats.length === 0"><td colspan="3" class="text-center">Нет данных</td></tr>
                                </tbody>
                             </table>
                         </template>

                         <!-- КЦСТ (Русские имена + Статус) -->
                         <template v-if="regForm.type === 'kcst'">
                              <h3 class="sec-title">Мониторинг КЦСТ</h3>
                              <table class="doc-table strict">
                                <thead><tr><th>№</th><th>ФИО</th><th>Факультет</th><th>Статус</th></tr></thead>
                                <tbody>
                                   <tr v-for="(st, i) in validStudents.slice(0, 20)" :key="st.id">
                                       <td>{{ i + 1 }}</td>
                                       <td>{{ getFullNameRu(st) }}</td>
                                       <td>{{ st.faculty || '—' }}</td>
                                       <td>{{ getStatusLabel(st.status) }}</td>
                                   </tr>
                                   <tr v-if="validStudents.length === 0"><td colspan="4" class="text-center">Нет студентов</td></tr>
                                </tbody>
                              </table>
                         </template>

                         <!-- ВОЕНКОМАТ (Только парни + год рождения) -->
                         <template v-if="regForm.type === 'army'">
                             <h3 class="sec-title">Воинский учет (Приложение №2)</h3>
                             <p class="doc-paragraph">Список граждан мужского пола, подлежащих постановке на воинский учет.</p>
                             <table class="doc-table strict">
                                <thead><tr><th>№</th><th>ФИО</th><th>Год рожд.</th><th>Статус</th></tr></thead>
                                <tbody>
                                   <tr v-for="(st, i) in validStudents.filter(s => s.gender === 'male').slice(0, 15)" :key="st.id">
                                      <td>{{ i + 1 }}</td>
                                      <td>{{ getFullNameRu(st) }}</td>
                                      <td>{{ getBirthYear(st.birth_date) }}</td>
                                      <td>{{ getStatusLabel(st.status) }}</td>
                                   </tr>
                                   <tr v-if="!validStudents.some(s => s.gender === 'male')"><td colspan="4" class="text-center">Нет данных (мужской пол)</td></tr>
                                </tbody>
                             </table>
                         </template>
                      </div>

                      <!-- FOOTER / ПЕЧАТЬ -->
                      <div class="doc-footer">
                         <div class="sign-block">
                            <span>Руководитель:</span>
                            <div class="sign-line">________________ / {{ formattedSigner }}</div>
                         </div>
                         <div class="stamp-container">
                             <img v-if="universityInfo.stamp" :src="universityInfo.stamp" class="real-stamp" />
                             <div v-else class="stamp-placeholder">М.П.</div>
                         </div>
                      </div>

                   </div>
               </div>
           </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import api from '../axios';
import html2pdf from 'html2pdf.js';
import { message } from 'ant-design-vue';
import { marked } from 'marked';
import {
  ThunderboltFilled, FileExcelOutlined, FileDoneOutlined, FilePdfOutlined,
  RobotOutlined, SaveOutlined, LoadingOutlined, RobotFilled, AppstoreOutlined,
  DashboardOutlined, AlignLeftOutlined, TrophyOutlined, FireOutlined,
  CheckCircleFilled, SyncOutlined, IdcardOutlined, TeamOutlined, GlobalOutlined
} from '@ant-design/icons-vue';

const activeTab = ref('builder');
const reportTitle = ref('Отчет о трудоустройстве');
const loading = ref(false);
const aiLoading = ref(false);
const generating = ref(false);
const saving = ref(false);

const currentUser = ref(null);
const stats = ref(null);
const students = ref([]);

const config = reactive({
    showIntro: true, showKpi: true, showTopCompanies: true, showRisks: false,
    showDemography: false, showGeo: false, customText: ''
});
const aiConfig = reactive({ mode: 'general', prompt: '' });
const aiContent = ref('');
const regForm = reactive({ type: null, year: 2024, format: 'xlsx' });

// === COMPUTED: Фильтрация (Только подтвержденные!) ===
const validStudents = computed(() => {
    // Внимание: Проверяем поле is_verified или email_confirmed
    return students.value.filter(s => s.is_verified === true || s.is_verified === 'true' || s.email_confirmed === true);
});

// === COMPUTED: Демография ===
const demoStats = computed(() => {
    const list = validStudents.value;
    const total = list.length || 1;
    const male = list.filter(s => s.gender === 'male').length;
    const female = list.filter(s => s.gender === 'female').length;

    return {
        male, female,
        malePct: Math.round((male / total) * 100),
        femalePct: Math.round((female / total) * 100)
    };
});

// === COMPUTED: География ===
const geoStats = computed(() => {
    const cityCounts = {};
    const list = validStudents.value;
    const total = list.length || 1;

    list.forEach(s => {
        if(s.city && s.city.length > 1) {
            // Транслитерируем город в русский для группировки
            const c = transliterateToRus(s.city.trim());
            cityCounts[c] = (cityCounts[c] || 0) + 1;
        }
    });

    return Object.entries(cityCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([city, count]) => ({
            city, count,
            percent: Math.round((count / total) * 100)
        }));
});

// === COMPUTED: Топ компаний (Сортировка) ===
const sortedCompanies = computed(() => {
    if (!stats.value?.top_companies) return [];
    // Используем hires или vacancy_count (что придет), приводим к числу
    return [...stats.value.top_companies]
        .map(c => ({
            ...c,
            hires: Number(c.hires || c.vacancy_count || 0)
        }))
        .sort((a, b) => b.hires - a.hires)
        .slice(0, 5);
});

// === COMPUTED: Данные Вуза ===
const universityInfo = computed(() => {
    const profile = currentUser.value?.fullProfile || {};
    return {
        name: profile.university_name || 'TECH UNIVERSITY',
        department: profile.department || 'Центр карьеры',
        logo: profile.university_logo ? `http://localhost:4000${profile.university_logo}` : 'https://cdn-icons-png.flaticon.com/512/2231/2231649.png',
        stamp: profile.stamp_url ? `http://localhost:4000${profile.stamp_url}` : null
    };
});

// === COMPUTED: Подписант ===
const formattedSigner = computed(() => {
    const u = currentUser.value?.fullProfile || {};
    if (u.last_name && u.first_name) {
        // Транслитерируем для отчета
        const ln = transliterateToRus(u.last_name);
        const fn = transliterateToRus(u.first_name);
        const pt = u.patronymic ? transliterateToRus(u.patronymic) : '';
        const initials = `${fn[0]}.${pt ? pt[0] + '.' : ''}`;
        return `${ln} ${initials}`;
    }
    return 'Фамилия И.О.';
});

const facultyStats = computed(() => {
    if (!stats.value?.charts?.faculties) return [];
    return stats.value.charts.faculties.map(f => ({
        faculty: f.faculty,
        count: f.count,
        employed: Math.round(f.count * (stats.value.kpi.rate / 100))
    }));
});

// === HELPERS: Транслитерация ===
const transliterateToRus = (text) => {
    if (!text) return '';
    // Если уже кириллица - возвращаем
    if (/[а-яА-ЯёЁ]/.test(text)) return text;

    const ru = {
        'a': 'а', 'b': 'б', 'c': 'ц', 'd': 'д', 'e': 'е', 'f': 'ф',
        'g': 'г', 'h': 'х', 'i': 'и', 'j': 'й', 'k': 'к', 'l': 'л',
        'm': 'м', 'n': 'н', 'o': 'о', 'p': 'п', 'q': 'к', 'r': 'р',
        's': 'с', 't': 'т', 'u': 'у', 'v': 'в', 'w': 'в', 'x': 'кс',
        'y': 'ы', 'z': 'з', 'sh': 'ш', 'ch': 'ч', 'zh': 'ж', 'yu': 'ю', 'ya': 'я'
    };

    let res = text.toLowerCase();
    // Сначала сложные сочетания
    res = res.replace(/sh/g, 'ш').replace(/ch/g, 'ч').replace(/zh/g, 'ж').replace(/yu/g, 'ю').replace(/ya/g, 'я');

    return res.split('').map(char => ru[char] || char).join('').replace(/^\w/, c => c.toUpperCase());
};

const getFullNameRu = (st) => {
    const ln = transliterateToRus(st.last_name);
    const fn = transliterateToRus(st.first_name);
    // patronymic может не быть, но если есть - тоже переводим
    const pt = st.patronymic ? transliterateToRus(st.patronymic) : '';
    return `${ln} ${fn} ${pt}`.trim();
};

const getBirthYear = (dateStr) => {
    if(!dateStr) return '—';
    return new Date(dateStr).getFullYear();
};

const getStatusLabel = (s) => {
    const map = { 'employed': 'Работает', 'search': 'В поиске', 'army': 'Армия', 'study': 'Учится', 'maternity': 'Декрет' };
    return map[s] || s || 'Неизвестно';
};

const getDeclension = (number, titles) => {
    const cases = [2, 0, 1, 1, 1, 2];
    return titles[(number % 100 > 4 && number % 100 < 20) ? 2 : cases[(number % 10 < 5) ? number % 10 : 5]];
};

const formatMoney = (v) => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(v);
const renderMarkdown = (text) => marked.parse(text);

// === ACTIONS ===
const loadData = async () => {
  try {
    const userStr = localStorage.getItem('user');
    if(userStr) currentUser.value = JSON.parse(userStr);

    try {
        const profRes = await api.get('/university/me');
        currentUser.value.fullProfile = profRes.data;
    } catch(e) {}

    const [statsRes, studRes] = await Promise.all([
       api.get('/university/stats'),
       api.get('/university/students')
    ]);
    stats.value = statsRes.data;
    students.value = studRes.data;

  } catch (e) {
    message.error('Ошибка загрузки данных');
  }
};

const generateAiContent = async () => {
  aiLoading.value = true;
  try {
    const total = stats.value?.kpi?.total || 0;
    const rate = stats.value?.kpi?.rate || 0;
    const promptText = `ВУЗ: ${universityInfo.value.name}. Всего выпускников: ${total}, Трудоустроено: ${rate}%. Напиши ${aiConfig.mode} отчет. ${aiConfig.prompt}`;
    const res = await api.post('/chat/send', { message: promptText, mode: 'vacancy' });
    aiContent.value = res.data.content || res.data;
    config.showIntro = true;
  } catch (e) { message.error('AI ошибка'); } finally { aiLoading.value = false; }
};

const selectRegForm = (type) => {
    regForm.type = type;
    activeTab.value = 'reg';
    const names = { vpo1: 'Отчет ВПО-1', kcst: 'Мониторинг КЦСТ', army: 'Военный учет' };
    reportTitle.value = `${names[type]} (${regForm.year})`;
    // Сброс
    config.showKpi = false; config.showTopCompanies = false; config.showRisks = false; config.showIntro = false;
    config.showDemography = false; config.showGeo = false;
};

const downloadPDF = () => {
    const element = document.getElementById('print-area');
    generating.value = true;
    const opt = { margin: 10, filename: `${reportTitle.value}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };
    html2pdf().set(opt).from(element).save().then(() => { generating.value = false; message.success('Скачано'); });
};

const generateRegReport = () => {
    loading.value = true;
    setTimeout(() => { loading.value = false; message.success('Данные обновлены'); }, 800);
};

const saveReport = async () => {
    saving.value = true;
    try { await api.post('/university/reports', { title: reportTitle.value, type: 'custom', format: 'pdf' }); message.success('Сохранено'); }
    catch(e) { message.error('Ошибка'); } finally { saving.value = false; }
};

onMounted(loadData);
</script>

<style scoped>
/* GENERAL LAYOUT */
.page-wrapper { min-height: 100vh; padding: 20px; background: #f3f4f6; position: relative; font-family: 'Inter', sans-serif; display: flex; justify-content: center; }
.blobs-container { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 0; pointer-events: none; }
.blob { position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.5; }
.blob-1 { background: #c4b5fd; width: 400px; height: 400px; top: -100px; left: -100px; }
.blob-2 { background: #bfdbfe; width: 300px; height: 300px; bottom: 0; right: 0; }
.content-container { position: relative; z-index: 1; width: 100%; max-width: 1400px; display: flex; flex-direction: column; height: 92vh; }

/* HEADER */
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; background: transparent; padding: 10px 0; }
.header-titles h1 { font-size: 2.2rem; font-weight: 800; color: #1f2937; margin: 0; line-height: 1.1; letter-spacing: -1px; }
.header-subtitle { font-size: 1rem; color: #4b5563; font-weight: 500; }
.header-actions { display: flex; gap: 10px; align-items: center; }
.status-text { font-size: 0.85rem; color: #6b7280; margin-right: 10px; }
.btn-primary { background: #2563eb; color: white; border: none; padding: 12px 24px; border-radius: 12px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 0.95rem; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2); transition: 0.2s; }
.btn-primary:hover { background: #1d4ed8; transform: translateY(-1px); }
.btn-secondary { background: white; border: 1px solid #e5e7eb; color: #374151; padding: 12px 24px; border-radius: 12px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: 0.2s; font-size: 0.95rem; }
.btn-secondary:hover { background: #f9fafb; border-color: #d1d5db; }

/* MAIN GRID */
.report-workspace { display: grid; grid-template-columns: 360px 1fr; gap: 25px; height: 100%; overflow: hidden; }

/* LEFT PANEL (INSPECTOR) */
.inspector-panel { background: white; border-radius: 18px; border: 1px solid #e5e7eb; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.03); }
.mode-switcher { display: flex; border-bottom: 1px solid #e5e7eb; padding: 6px; background: #f8fafc; gap: 6px; }
.mode-btn { flex: 1; text-align: center; padding: 12px; font-size: 0.85rem; font-weight: 600; color: #64748b; cursor: pointer; border-radius: 10px; transition: 0.2s; display: flex; flex-direction: column; align-items: center; gap: 6px; }
.mode-btn:hover { background: rgba(0,0,0,0.03); }
.mode-btn.active { background: white; color: #2563eb; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.inspector-content { padding: 25px; overflow-y: auto; flex: 1; }
.section-label { display: block; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.6px; color: #94a3b8; font-weight: 800; margin-bottom: 12px; }
.control-section { margin-bottom: 20px; }
.toggle-list { display: flex; flex-direction: column; gap: 10px; }
.toggle-item { display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; border: 1px solid #f1f5f9; border-radius: 14px; cursor: pointer; transition: 0.2s; font-size: 0.95rem; color: #475569; font-weight: 500; }
.toggle-item:hover { border-color: #e2e8f0; background: #f8fafc; }
.toggle-item.active { border-color: #bfdbfe; background: #eff6ff; color: #1e40af; font-weight: 600; }
.toggle-item .ti-label { display: flex; align-items: center; gap: 12px; }
.toggle-item.warning.active { border-color: #fecaca; background: #fef2f2; color: #991b1b; }

/* AI Panel */
.ai-pane-styled { gap: 20px; display: flex; flex-direction: column; }
.ai-promo-card { background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%); border-radius: 14px; padding: 20px; display: flex; align-items: flex-start; gap: 16px; border: 1px solid #ddd6fe; }
.ai-icon-glow { width: 44px; height: 44px; background: white; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #7c3aed; font-size: 1.4rem; box-shadow: 0 4px 10px rgba(124, 58, 237, 0.15); flex-shrink: 0; }
.btn-generate-ai { width: 100%; border: none; background: transparent; cursor: pointer; margin-top: 10px; }
.btn-generate-ai .btn-content { background: linear-gradient(135deg, #8b5cf6, #6366f1); color: white; padding: 16px; border-radius: 14px; font-weight: 700; font-size: 1rem; display: flex; align-items: center; justify-content: center; gap: 10px; box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3); transition: transform 0.2s; }
.btn-generate-ai:hover .btn-content { transform: translateY(-2px); }

/* Forms List */
.forms-list-vertical { display: flex; flex-direction: column; gap: 12px; }
.form-row-item { padding: 14px; background: white; border: 1px solid #e5e7eb; border-radius: 12px; cursor: pointer; font-weight: 600; color: #374151; display: flex; align-items: center; gap: 15px; transition: 0.2s; }
.form-row-item.active { background: #eff6ff; border-color: #2563eb; }
.icon-wrap { width: 42px; height: 42px; display: flex; align-items: center; justify-content: center; border-radius: 10px; font-size: 1.3rem; }
.icon-wrap.xls { background: #dcfce7; color: #166534; } .icon-wrap.doc { background: #dbeafe; color: #1e40af; } .icon-wrap.pdf { background: #fee2e2; color: #991b1b; }
.btn-generate-reg { width: 100%; padding: 14px; background: #0f172a; color: white; border: none; border-radius: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; }

.modern-input, .modern-select, .modern-textarea { border-radius: 10px; width: 100%; padding: 8px; }

/* PREVIEW (RIGHT) */
.preview-wrapper { display: flex; flex-direction: column; height: 100%; background: #e2e8f0; border-radius: 18px; border: 1px solid #cbd5e1; overflow: hidden; }
.preview-toolbar { background: #cbd5e1; padding: 10px; text-align: center; font-size: 0.75rem; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 1.5px; border-bottom: 1px solid #94a3b8; }
.preview-scroll-area { flex: 1; overflow-y: auto; display: flex; justify-content: center; padding: 40px; }
.sheet-container { width: 210mm; }

/* A4 SHEET (CLASSIC STYLE RESTORED) */
.a4-sheet {
    width: 100%;
    min-height: 297mm;
    background: white;
    box-shadow: 0 20px 60px rgba(0,0,0,0.15);
    padding: 20mm;
    color: #000;
    font-family: 'Times New Roman', Times, serif;
    font-size: 12pt;
    line-height: 1.5;
}

/* Document Styles */
.doc-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; }
.doc-logo { height: 70px; width: auto; max-width: 160px; object-fit: contain; }
.dh-uni { font-weight: bold; font-size: 15pt; text-transform: uppercase; font-family: Arial, sans-serif; line-height: 1.1; margin-bottom: 4px; }
.dh-dep { font-size: 11pt; color: #444; font-family: Arial, sans-serif; }
.dh-right { text-align: right; font-size: 11pt; color: #444; }

.doc-divider { border-bottom: 2px solid #000; margin-bottom: 35px; }
.doc-title { text-align: center; font-size: 20pt; font-weight: bold; margin-bottom: 35px; text-transform: uppercase; letter-spacing: 1px; }

.doc-section { margin-bottom: 35px; width: 100%; }
.sec-title { font-size: 14pt; font-weight: bold; border-bottom: 1px solid #000; margin-bottom: 15px; padding-bottom: 5px; font-family: Arial, sans-serif; }
.doc-paragraph { text-align: justify; margin-bottom: 10px; font-family: 'Times New Roman', serif; font-size: 12pt; }
.doc-list { list-style-type: disc; padding-left: 20px; margin-bottom: 10px; font-family: 'Times New Roman', serif; font-size: 12pt; }
.doc-placeholder { color: #ccc; font-style: italic; text-align: center; padding: 25px; border: 1px dashed #cbd5e1; background: #f8fafc; font-family: Arial; }

.kpi-grid { display: flex; justify-content: space-between; gap: 20px; margin-bottom: 10px; }
.kpi-box { flex: 1; border: 2px solid #000; padding: 15px; text-align: center; }
.kpi-lbl { display: block; font-size: 10pt; text-transform: uppercase; font-weight: bold; letter-spacing: 0.5px; font-family: Arial; margin-bottom: 5px; }
.kpi-val { display: block; font-size: 18pt; font-weight: bold; font-family: Arial; }

.risk-alert-box { border: 2px solid #b91c1c; padding: 20px; color: #b91c1c; background: #fff5f5; font-weight: 500; font-family: Arial; font-size: 11pt; text-align: justify; }

/* Tables */
.doc-table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11pt; font-family: 'Times New Roman', serif; }
.doc-table th, .doc-table td { border: 1px solid #000; padding: 8px 10px; }
.doc-table th { background: #f0f0f0; font-weight: bold; text-align: left; font-family: Arial, sans-serif; }
.doc-table.strict th { text-align: center; background: #e5e5e5; }
.doc-table.compact td, .doc-table.compact th { padding: 5px 10px; }
.text-center { text-align: center; }

.doc-footer { margin-top: 80px; display: flex; justify-content: space-between; align-items: flex-end; }
.sign-line { margin-top: 40px; border-top: 1px solid #000; display: inline-block; width: 300px; padding-top: 8px; font-size: 11pt; font-family: Arial; }

/* Stamp */
.stamp-container { position: relative; width: 140px; height: 140px; display: flex; justify-content: center; align-items: center; }
.stamp-placeholder { width: 120px; height: 120px; border: 3px dashed #ccc; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #ccc; font-weight: bold; transform: rotate(-15deg); font-family: Arial; font-size: 10pt; }
.real-stamp { width: 100%; height: 100%; object-fit: contain; transform: rotate(-10deg); opacity: 0.85; }

.fade-in { animation: fadeIn 0.5s ease-out; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
.custom-scroll::-webkit-scrollbar { width: 6px; }
.custom-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
</style>