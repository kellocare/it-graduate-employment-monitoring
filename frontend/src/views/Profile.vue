<template>
  <div class="page-wrapper">
    <div class="blobs-container">
      <div class="blob blob-1"></div>
      <div class="blob blob-2"></div>
      <div class="blob blob-3"></div>
    </div>

    <div class="content-container">
      <a-spin :spinning="loading" tip="Загрузка профиля...">

        <!-- === 1. ШАПКА (ФИКСИРОВАННАЯ) === -->
        <div class="glass-card main-card fade-in" :class="{ 'admin-theme': isAdmin, 'uni-theme': isUniversity }">
          <div class="bg-decoration-circle"></div>

          <div class="top-actions">
            <!-- 🔥 КНОПКА НАСТРОЙКИ СЕТКИ (ВЕРНУЛ) -->
            <button class="btn-icon-link settings-btn" @click="openLayoutSettings" title="Настроить виджеты">
               <setting-outlined />
            </button>
            <button v-if="!isEditing" class="btn-glass-edit" @click="enableEdit">
              <edit-outlined /> Редактировать
            </button>
          </div>

          <div class="avatar-column">

            <div class="avatar-stack" :class="getEquippedEffect">
              <!-- СТУДЕНТ: XP Прогресс -->
              <a-progress
                v-if="isStudent"
                type="circle"
                :percent="xpProgress"
                :width="175"
                :stroke-color="userRank.color"
                :stroke-width="6"
                class="progress-ring"
                :show-info="false"
              />
              <!-- Ранг -->
              <div v-if="isStudent" class="rank-orb" :style="{ background: userRank.color }" :title="userRank.label">
                 <component :is="getRankIcon(userRank.icon)" />
              </div>

              <!-- Кольца других ролей -->
              <div v-if="isUniversity" class="uni-ring"></div>
              <div v-if="isAdmin" class="admin-ring" :class="{ 'error-ring': systemHealth.status === 'error' }"></div>

              <div class="avatar-img-box" :class="getEquippedFrame"> <!-- Класс рамки -->
                <a-avatar :size="135" :src="getAvatarUrl(profile.avatar_url)" class="main-avatar">
                   <template #icon><user-outlined class="default-icon" /></template>
                </a-avatar>
              </div>

              <a-upload v-if="isEditing" name="avatar" :show-upload-list="false" :customRequest="handleAvatarUpload" class="avatar-upload-pos">
                  <button class="btn-mini-edit" title="Загрузить фото"><camera-outlined /></button>
              </a-upload>
            </div>

            <div class="name-block">
              <h1 class="full-name">{{ profile.last_name || 'Фамилия' }} {{ profile.first_name || 'Имя' }} {{ profile.patronymic || '' }}</h1>

              <!-- Бейджи -->
              <div class="badges-wrapper" v-if="!isStudent">
                 <div class="specialty-badge admin-badge" v-if="isAdmin"><safety-certificate-filled /> System Administrator</div>
                 <div class="specialty-badge uni-badge" v-else-if="isUniversity"><bank-filled /> {{ profile.position || 'Сотрудник ВУЗа' }}</div>
                 <div class="specialty-badge" v-else-if="profile.specialty_name || profile.position"><idcard-outlined /> {{ isEmployer ? profile.position : profile.specialty_name }}</div>
              </div>

              <!-- XP статус для студента -->
              <div class="xp-status" v-else>
                 <span :style="{ color: userRank.color, fontWeight: '800' }">{{ userRank.label }}</span>
                 <span class="xp-divider">•</span>
                 <span class="xp-text">{{ currentXp }} XP</span>
              </div>
            </div>
          </div>
        </div>

        <!-- === 2. СЕТКА ВИДЖЕТОВ === -->
        <div class="static-grid-layout">

          <!-- ЛЕВАЯ КОЛОНКА -->
          <div class="grid-column">
            <div v-for="element in layout.left" :key="element" class="widget-wrapper fade-in">

              <!-- ИНВЕНТАРЬ (НОВЫЙ ВИДЖЕТ) -->
                <div v-if="element === 'inventory' && isStudent" class="glass-card card-accent-orange">
                    <div class="card-header"><h3><gift-filled style="color: #f59e0b;" /> Мои награды</h3></div>

                    <!-- Вкладки инвентаря -->
                    <div class="inv-tabs">
                        <span :class="{active: invTab==='frames'}" @click="invTab='frames'">Рамки</span>
                        <span :class="{active: invTab==='effects'}" @click="invTab='effects'">Эффекты</span>
                        <span :class="{active: invTab==='badges'}" @click="invTab='badges'">Бейджи</span>
                    </div>

                    <div class="inv-grid custom-scroll">
                        <div v-for="item in getInventoryItems(invTab)" :key="item.id"
                             class="inv-item"
                             :class="{ 'locked': !isUnlocked(item.id), 'equipped': isEquipped(item.id, invTab) }"
                             @click="toggleEquip(item.id, getEquipType(invTab))"
                        >
                            <div class="inv-icon">
                                <lock-filled v-if="!isUnlocked(item.id)" />
                                <component :is="item.icon" v-else />
                            </div>
                            <div class="inv-name">{{ item.name }}</div>
                            <div class="inv-status" v-if="isEquipped(item.id, invTab)">Надето</div>
                        </div>
                    </div>
                </div>

               <!-- ВИДЖЕТ: ИНФОРМАЦИЯ (ЛК) -->
               <div v-if="element === 'info'" class="glass-card card-accent-purple">
                   <div class="card-header"><h3><component :is="getHeaderIcon" /> {{ isUniversity ? 'Служебная информация' : 'Личные данные' }}</h3></div>

                   <!-- РЕЖИМ ПРОСМОТРА -->
                   <div v-if="!isEditing" class="info-view scrollable-content">
                       <div class="info-group">
                           <div class="info-row"><span class="label">Email</span><span class="value">{{ profile.email }}</span></div>
                           <div class="info-row"><span class="label">Телефон</span><span class="value phone">{{ profile.phone || '—' }}</span></div>
                           <div class="info-row" v-if="profile.telegram"><span class="label">Telegram</span><span class="value highlight">@{{ profile.telegram }}</span></div>

                           <!-- Студент -->
                           <template v-if="isStudent">
                               <div class="info-row"><span class="label">ДР / Пол</span><span class="value">{{ formatDate(profile.birth_date) }} ({{ formatGender(profile.gender) }})</span></div>
                               <div class="info-row"><span class="label">Город</span><span class="value">{{ profile.city || '—' }}</span></div>
                               <div class="info-row"><span class="label">ВУЗ</span><span class="value">{{ profile.faculty || '—' }}</span></div>
                           </template>

                           <!-- ВУЗ -->
                           <template v-if="isUniversity">
                               <div class="info-row"><span class="label">ВУЗ</span><span class="value">{{ profile.university_name || 'Не указан' }}</span></div>
                               <div class="info-row"><span class="label">Отдел</span><span class="value">{{ profile.department || '—' }}</span></div>
                               <div class="info-row"><span class="label">Кабинет</span><span class="value">{{ profile.office || '—' }}</span></div>
                           </template>
                       </div>

                       <!-- Документы ВУЗа (Просмотр) -->
                       <div v-if="isUniversity && (profile.university_logo || profile.stamp_url)" class="uni-docs-preview">
                           <div class="divider"></div><h4>Документы</h4>
                           <div class="docs-row">
                               <div class="doc-preview-item" v-if="profile.university_logo"><img :src="getAvatarUrl(profile.university_logo)" class="preview-img" /><span>Лого</span></div>
                               <div class="doc-preview-item" v-if="profile.stamp_url"><img :src="getAvatarUrl(profile.stamp_url)" class="preview-img" /><span>Печать</span></div>
                           </div>
                       </div>

                       <!-- О себе / Обязанности -->
                       <div v-if="profile.about_me || isStudent || isUniversity">
                           <div class="divider"></div>
                           <div class="about-section"><h4>{{ isUniversity ? 'Обязанности' : 'О себе' }}</h4><p class="about-text">{{ profile.about_me || 'Информация не заполнена' }}</p></div>
                       </div>

                       <!-- Ссылки (Студент) -->
                       <div class="links-section" v-if="isStudent && profile.portfolio_links && profile.portfolio_links.length">
                           <h4>Портфолио</h4>
                           <div class="links-grid">
                               <a v-for="(l,i) in profile.portfolio_links" :key="i" :href="l.url" target="_blank" class="modern-link-tag"><component :is="getIconForType(l.type)" /> {{ getLabelForType(l.type) }}</a>
                           </div>
                       </div>
                   </div>

                   <!-- 🔥 РЕЖИМ РЕДАКТИРОВАНИЯ (ИСПРАВЛЕНО) -->
                   <a-form v-else layout="vertical" class="modern-form">
                       <!-- 1. Общие поля для ВСЕХ -->
                       <div class="form-row-2">
                           <a-form-item label="Фамилия"><a-input v-model:value="form.last_name" class="modern-input"/></a-form-item>
                           <a-form-item label="Имя"><a-input v-model:value="form.first_name" class="modern-input"/></a-form-item>
                       </div>

                       <!-- 2. Поля ВУЗа -->
                       <template v-if="isUniversity">
                           <a-form-item label="Название ВУЗа"><a-input v-model:value="form.university_name" class="modern-input"/></a-form-item>
                           <a-form-item label="Должность"><a-input v-model:value="form.position" class="modern-input"/></a-form-item>
                           <div class="form-row-2">
                               <a-form-item label="Отдел/Факультет"><a-input v-model:value="form.department" class="modern-input"/></a-form-item>
                               <a-form-item label="Кабинет"><a-input v-model:value="form.office" class="modern-input"/></a-form-item>
                           </div>

                           <!-- Загрузка документов ВУЗа -->
                           <div class="uploads-section">
                               <h4>Логотип и Печать</h4>
                               <div class="upload-grid">
                                  <div class="upload-box">
                                      <div class="ub-label">Лого</div>
                                      <a-upload name="logo" :show-upload-list="false" :customRequest="handleLogoUpload">
                                          <div class="upload-placeholder"><plus-outlined/></div>
                                      </a-upload>
                                  </div>
                                  <div class="upload-box">
                                      <div class="ub-label">Печать</div>
                                      <a-upload name="stamp" :show-upload-list="false" :customRequest="handleStampUpload">
                                          <div class="upload-placeholder"><plus-outlined/></div>
                                      </a-upload>
                                  </div>
                               </div>
                           </div>
                       </template>

                       <!-- 3. Поля Студента -->
                       <template v-if="isStudent">
                           <a-form-item label="Специальность">
                               <a-select v-model:value="form.specialty_id" class="modern-select">
                                   <a-select-option v-for="s in specialties" :key="s.id" :value="s.id">{{ s.name }}</a-select-option>
                               </a-select>
                           </a-form-item>
                           <div class="form-row-2">
                               <a-form-item label="Город"><a-select v-model:value="form.city" show-search :options="cityOptions" class="modern-select"/></a-form-item>
                               <a-form-item label="Год выпуска"><a-input-number v-model:value="form.graduation_year" class="modern-input" style="width:100%"/></a-form-item>
                           </div>
                       </template>

                       <!-- 4. Поля Работодателя -->
                       <template v-if="isEmployer">
                           <a-form-item label="Должность"><a-input v-model:value="form.position" class="modern-input"/></a-form-item>
                       </template>

                       <!-- 5. ОБЩИЕ КОНТАКТЫ (ТЕПЕРЬ ВИДНЫ ВСЕМ) -->
                       <div class="form-row-2" style="margin-top: 15px;">
                           <a-form-item label="Телефон" :validate-status="phoneError ? 'error' : ''" :help="phoneError">
                               <a-input v-model:value="form.phone" @change="validatePhone" class="modern-input" />
                           </a-form-item>
                           <a-form-item label="Telegram">
                               <a-input v-model:value="form.telegram" prefix="@" class="modern-input" />
                           </a-form-item>
                       </div>

                       <!-- 6. О себе / Ссылки (Студент) -->
                       <template v-if="isStudent">
                           <div class="links-editor">
                               <h4>Ссылки</h4>
                               <div v-for="(l, i) in form.portfolio_links" :key="i" class="link-edit-row">
                                   <a-select v-model:value="l.type" style="width:110px" class="modern-select">
                                       <a-select-option value="github">GitHub</a-select-option>
                                       <a-select-option value="telegram">TG</a-select-option>
                                       <a-select-option value="other">Link</a-select-option>
                                   </a-select>
                                   <a-input v-model:value="l.url" class="modern-input" />
                                   <button class="btn-icon-delete" @click="removeLink(i)"><delete-outlined/></button>
                               </div>
                               <button class="btn-add-link" @click="addLink"><plus-outlined /> Добавить</button>
                           </div>
                       </template>

                       <!-- Общее поле "О себе" -->
                       <a-form-item :label="isUniversity ? 'Обязанности' : 'О себе'" style="margin-top:15px">
                           <a-textarea v-model:value="form.about_me" :rows="4" class="modern-input"/>
                       </a-form-item>

                       <div class="edit-actions">
                           <a-button type="primary" shape="round" @click="saveProfile" :loading="saving">Сохранить</a-button>
                           <a-button shape="round" @click="cancelEdit" style="margin-left:10px">Отмена</a-button>
                       </div>
                   </a-form>
               </div>

               <!-- Виджет: ROADMAP (Студент) -->
               <div v-if="element === 'roadmap' && isStudent" class="glass-card card-accent-purple">
                   <div class="card-header">
                       <h3><compass-outlined /> Мое развитие</h3>
                       <router-link to="/roadmap" class="btn-icon-link" title="Перейти к карте"><arrow-right-outlined /></router-link>
                   </div>
                   <div v-if="roadmapList.length > 0" class="roadmap-widget-content">
                       <h4 class="roadmap-title">{{ currentRoadmapTitle }}</h4>
                       <div class="circle-wrapper">
                          <a-progress type="circle" :percent="currentRoadmapProgress" :width="100" stroke-color="#8b5cf6" />
                       </div>
                       <div class="rp-next">
                           <span>Текущая цель:</span>
                           <strong>{{ nextRoadmapStep }}</strong>
                       </div>
                   </div>
                   <div v-else class="empty-timeline">
                       Нет активных треков. <br>
                       <router-link to="/vacancies">Найти вакансию и создать трек</router-link>
                   </div>
               </div>
            </div>
          </div>

          <!-- ПРАВАЯ КОЛОНКА -->
          <div class="grid-column">
            <div v-for="element in layout.right" :key="element" class="widget-wrapper fade-in">

                <div v-if="element === 'info'" class="glass-card card-accent-purple">
                    <div class="card-header"><h3><component :is="getHeaderIcon" /> Данные</h3></div>
                    <div class="info-view"><div class="info-group"><div class="info-row"><span class="label">Email</span><span class="value">{{ profile.email }}</span></div></div></div>
                </div>

                <!-- КАРЬЕРА (Студент) -->
                <div v-if="element === 'career' && isStudent" class="glass-card card-accent-blue">
                    <div class="card-header">
                        <h3><solution-outlined /> Карьера</h3>
                        <button v-if="!showJobForm" class="btn-add-job" @click="openJobForm"><plus-outlined /></button>
                    </div>
                    <div v-if="showJobForm" class="job-form-wrapper">
                        <a-form layout="vertical">
                            <a-form-item label="Компания"><a-select v-model:value="jobForm.company_id" class="modern-select"><a-select-option v-for="c in companies" :key="c.id" :value="c.id">{{c.name}}</a-select-option></a-select></a-form-item>
                            <a-form-item label="Должность"><a-input v-model:value="jobForm.position_title" class="modern-input"/></a-form-item>
                            <div class="edit-actions"><a-button type="primary" @click="addJob">ОК</a-button><a-button type="text" @click="showJobForm=false">Х</a-button></div>
                        </a-form>
                    </div>
                    <div v-if="employmentRecords.length" class="timeline-container custom-scroll" style="max-height: 300px; overflow-y: auto;">
                        <a-timeline mode="left">
                            <a-timeline-item v-for="job in employmentRecords" :key="job.id" :color="job.is_current ? 'green' : 'blue'">
                                <div class="timeline-card">
                                    <div class="timeline-header"><div class="job-company">{{job.company_name}}</div><edit-outlined class="action-icon" @click="editJob(job)"/></div>
                                    <div class="job-pos">{{job.position_title}}</div>
                                    <div class="job-meta">{{ formatDate(job.start_date) }} — {{ job.is_current ? 'Н.в.' : formatDate(job.end_date) }}</div>
                                </div>
                            </a-timeline-item>
                        </a-timeline>
                    </div>
                    <div v-else class="empty-timeline"><div class="empty-icon-box"><folder-open-outlined /></div><p>Нет опыта</p></div>
                </div>

                <!-- РЕЗЮМЕ (Студент) -->
                <div v-if="element === 'resumes' && isStudent" class="glass-card card-accent-orange">
                    <div class="card-header">
                        <h3><file-text-outlined /> Резюме</h3>
                        <a-upload name="file" :show-upload-list="false" :customRequest="uploadResumeFile"><button class="btn-add-job"><upload-outlined /></button></a-upload>
                    </div>
                    <div v-if="resumes.length > 0" class="resume-list custom-scroll" style="max-height: 250px; overflow-y: auto;">
                        <div v-for="res in resumes" :key="res.id" class="resume-item">
                            <div class="res-icon"><file-pdf-outlined v-if="res.type==='pdf'" style="color:#ff4d4f"/><file-word-outlined v-else style="color:#1890ff"/></div>
                            <div class="res-info"><div class="res-name">{{res.filename}}</div><div class="res-date">{{formatDate(res.created_at)}}</div></div>
                            <div class="res-actions"><a :href="getFileUrl(res.file_path)" target="_blank" download class="action-icon"><download-outlined/></a><delete-outlined class="action-icon danger" @click="deleteResume(res.id)"/></div>
                        </div>
                    </div>
                    <div v-else class="empty-timeline">Нет резюме</div>
                </div>

                <!-- ИСТОРИЯ (Студент) -->
                <div v-if="element === 'history' && isStudent" class="glass-card card-accent-purple">
                    <div class="card-header"><h3><history-outlined /> Архив обучения</h3></div>
                    <div v-if="roadmapHistory.length > 0" class="history-list custom-scroll" style="max-height: 250px; overflow-y: auto;">
                        <div v-for="h in roadmapHistory" :key="h.id" class="history-item">
                            <div class="h-info">
                                <div class="h-title">{{h.role_title}}</div>
                                <div class="h-date">{{formatDate(h.completed_at)}}</div>
                            </div>
                            <div class="h-score" :class="{done: h.progress>=100}">{{h.progress}}%</div>
                        </div>
                    </div>
                    <div v-else class="empty-timeline">Архив пуст</div>
                </div>

                <!-- ВИДЖЕТЫ ВУЗА -->
                <div v-if="element === 'uni_stats' && isUniversity" class="glass-card card-accent-teal">
                    <div class="card-header"><h3><appstore-filled style="color:#0d9488"/> Обзор</h3></div>
                    <div class="uni-stats-list"><div class="u-stat"><span class="us-val">{{ uniStats?.kpi?.total || 0 }}</span><span class="us-lbl">Студентов</span></div><div class="u-stat"><span class="us-val">{{ uniStats?.kpi?.rate || 0 }}%</span><span class="us-lbl">Работают</span></div></div>
                </div>
                <div v-if="element === 'uni_reports' && isUniversity" class="glass-card card-accent-blue">
                    <div class="card-header"><h3><file-excel-outlined /> Отчеты</h3></div>
                    <div class="doc-list custom-scroll" style="max-height: 300px; overflow-y: auto;" v-if="savedReports.length">
                        <div v-for="rep in savedReports" :key="rep.id" class="doc-item"><file-excel-outlined class="doc-icon green"/><div class="doc-info"><div class="doc-name">{{rep.title}}</div><div class="doc-size">{{formatDate(rep.created_at)}}</div></div></div>
                    </div>
                    <div v-else class="empty-timeline">Нет отчетов</div>
                    <button class="btn-create-report" @click="$router.push('/university/reports')"><plus-outlined/> Центр</button>
                </div>

                <!-- АДМИН -->
                <div v-if="element === 'admin_notes' && isAdmin" class="glass-card card-accent-blue">
                    <div class="card-header"><h3>Заметки</h3></div>
                    <a-textarea v-model:value="adminNotes" :rows="6" class="admin-notes-area"/>
                    <button class="btn-icon-link" @click="saveNotes" style="margin-top:5px"><save-outlined/> Сохранить</button>
                </div>
                <div v-if="element === 'system_logs' && isAdmin" class="glass-card card-accent-orange">
                    <div class="card-header"><h3>Логи</h3></div>
                    <div class="logs-list"><div v-for="log in systemLogs" :key="log.id" class="log-item">{{log.action}}</div></div>
                </div>
            </div>
          </div>
        </div>

      </a-spin>
    </div>

    <!-- MODAL: LAYOUT SETTINGS -->
    <a-modal v-model:open="showLayoutModal" title="Настройка виджетов" @ok="saveLayoutSettings" ok-text="Сохранить" centered width="600px">
       <div class="layout-editor-container">
          <p class="layout-hint">Перетаскивайте блоки между колонками или меняйте их порядок.</p>
          <div class="le-grid">
             <div class="le-column">
                <div class="le-col-header">Левая колонка</div>
                <draggable v-model="tempLayout.left" group="widgets" item-key="toString()" class="le-drag-area" ghost-class="le-ghost">
                   <template #item="{ element }">
                      <div class="le-item">{{ getWidgetName(element) }} <drag-outlined /></div>
                   </template>
                </draggable>
             </div>
             <div class="le-column">
                <div class="le-col-header">Правая колонка</div>
                <draggable v-model="tempLayout.right" group="widgets" item-key="toString()" class="le-drag-area" ghost-class="le-ghost">
                   <template #item="{ element }">
                      <div class="le-item">{{ getWidgetName(element) }} <drag-outlined /></div>
                   </template>
                </draggable>
             </div>
          </div>
          <div class="reset-block"><a-button size="small" type="link" @click="resetToDefault">Сбросить по умолчанию</a-button></div>
       </div>
    </a-modal>

  </div>
</template>

<script>
import api from '../axios';
import draggable from 'vuedraggable';
import { message } from 'ant-design-vue';
import {
  UserOutlined, EditOutlined, LinkOutlined, SolutionOutlined, PlusOutlined, DeleteOutlined,
  BankOutlined, CameraOutlined, PhoneOutlined, MailOutlined, EnvironmentOutlined,
  GithubOutlined, LinkedinOutlined, CodeOutlined, MessageOutlined,
  IdcardOutlined, SafetyCertificateFilled, CheckCircleFilled,
  AppstoreFilled, FileExcelOutlined, InboxOutlined, DownloadOutlined,
  DashboardOutlined, SnippetsOutlined, SaveOutlined, SettingOutlined,
  HistoryOutlined, CompassOutlined, ArrowRightOutlined, FlagOutlined,
  FolderOpenOutlined, FileTextOutlined, UploadOutlined, FilePdfOutlined, FileWordOutlined,
  WarningOutlined, CheckCircleOutlined, UserAddOutlined, ReloadOutlined, InfoCircleOutlined, BugOutlined,
  AppstoreOutlined, DragOutlined, BankFilled,
  SmileTwoTone, RocketFilled, TrophyFilled, ThunderboltFilled, FireFilled, CrownFilled, StarOutlined,
  GiftFilled, LockFilled, SkinOutlined, ExperimentFilled, ReadFilled, StarFilled // Добавлены иконки инвентаря
} from '@ant-design/icons-vue';

const RUSSIAN_CITIES = ['Москва', 'Санкт-Петербург', 'Новосибирск', 'Екатеринбург', 'Казань', 'Нижний Новгород'].map(c => ({ value: c, label: c }));
const WIDGET_NAMES = {
    'info': 'Личные данные', 'career': 'Карьера', 'resumes': 'Мои резюме',
    'history': 'История обучения', 'roadmap': 'Карта развития',
    'uni_stats': 'Статистика ВУЗа', 'uni_reports': 'Отчеты ВУЗа',
    'admin_notes': 'Заметки админа', 'system_logs': 'Логи системы',
    'inventory': 'Инвентарь Наград'
};

export default {
  components: {
    draggable,
    UserOutlined, EditOutlined, LinkOutlined, SolutionOutlined, PlusOutlined, DeleteOutlined,
    BankOutlined, CameraOutlined, PhoneOutlined, MailOutlined,
    GithubOutlined, LinkedinOutlined, CodeOutlined, MessageOutlined,
    IdcardOutlined, SafetyCertificateFilled, CheckCircleFilled,
    AppstoreFilled, FileExcelOutlined, InboxOutlined, DownloadOutlined,
    DashboardOutlined, SnippetsOutlined, SaveOutlined, SettingOutlined,
    HistoryOutlined, CompassOutlined, ArrowRightOutlined, FlagOutlined,
    FolderOpenOutlined, FileTextOutlined, UploadOutlined, FilePdfOutlined, FileWordOutlined,
    WarningOutlined, CheckCircleOutlined, UserAddOutlined, ReloadOutlined, InfoCircleOutlined, BugOutlined,
    AppstoreOutlined, DragOutlined, BankFilled,
    SmileTwoTone, RocketFilled, TrophyFilled, ThunderboltFilled, FireFilled, CrownFilled, StarOutlined,
    GiftFilled, LockFilled, SkinOutlined, ExperimentFilled, ReadFilled, StarFilled
  },
  data() {
    return {
      userRole: 'graduate',
      profile: {},
      specialties: [], employmentRecords: [], companies: [], uniStats: null, savedReports: [], resumes: [],
      form: { portfolio_links: [] },
      jobForm: { id: null, company_id: null, position_title: '', salary_amount: null, start_date: '', end_date: '', is_current: true },
      loading: true, saving: false, isEditing: false, showJobForm: false, phoneError: '', cityOptions: RUSSIAN_CITIES,

      adminNotes: localStorage.getItem('admin_notes') || '',
      systemLogs: [], logsLoading: false, systemHealth: { ping: null, status: 'unknown', version: '...' },
      roadmapList: [], roadmapHistory: [],

      // Layout
      layout: { left: [], right: [] },
      showLayoutModal: false,
      tempLayout: { left: [], right: [] },
      // 🔥 ИНВЕНТАРЬ
      invTab: 'frames',
      // База всех возможных предметов
      itemsDB: {
          frames: [
              { id: 'frame_blue', name: 'Синяя искра', icon: 'ThunderboltFilled' },
              { id: 'frame_gold', name: 'Золотая рамка', icon: 'TrophyFilled' },
              { id: 'frame_neon', name: 'Неон', icon: 'ExperimentFilled' }
          ],
          effects: [
              { id: 'fire_effect', name: 'В огне', icon: 'FireFilled' },
              { id: 'snow_effect', name: 'Холод', icon: 'SkinOutlined' }
          ],
          badges: [
              { id: 'badge_top', name: 'Топ талант', icon: 'StarFilled' },
              { id: 'mentor_status', name: 'Ментор', icon: 'ReadFilled' }
          ]
      }
    };
  },
  computed: {
    isEmployer() { return this.userRole === 'employer'; },
    isStudent() { return this.userRole === 'graduate'; },
    isAdmin() { return this.userRole === 'admin'; },
    isUniversity() { return this.userRole === 'university_staff'; },

    // 🔥 СТИЛИ ТЕМЫ
    getThemeClass() {
        if (this.profile.equipped_rewards?.theme === 'theme_dark') return 'theme-dark-mode'; // Если есть темная тема
        return 'admin-theme'; // Default
    },

    // 🔥 CSS КЛАССЫ ДЛЯ РАМОК И ЭФФЕКТОВ
    getEquippedFrame() {
        const f = this.profile.equipped_rewards?.frame;
        if (f === 'frame_blue') return 'frame-blue-glow';
        if (f === 'frame_gold') return 'frame-gold-glow';
        if (f === 'frame_neon') return 'frame-neon-pulse';
        return '';
    },
    getEquippedEffect() {
        const e = this.profile.equipped_rewards?.effect;
        if (e === 'fire_effect') return 'effect-fire';
        return '';
    },

    getCardAccentClass() { return 'card-accent-purple'; },
    getHeaderIcon() { if (this.isUniversity) return 'BankOutlined'; if (this.isAdmin) return 'DashboardOutlined'; return 'UserOutlined'; },

    currentXp() {
       let total = 0;
       if (this.roadmapList && Array.isArray(this.roadmapList)) {
           this.roadmapList.forEach(track => {
               if (track.nodes) {
                   track.nodes.forEach(node => {
                       if (node.subtopics) {
                           node.subtopics.forEach(sub => {
                               if(sub.done) total += (sub.xpEarned || 50);
                           });
                       }
                   });
               }
           });
       }
       if (this.roadmapHistory && Array.isArray(this.roadmapHistory)) {
           this.roadmapHistory.forEach(historyItem => {
               let nodes = historyItem.roadmap_data;
               if (typeof nodes === 'string') {
                   try { nodes = JSON.parse(nodes); } catch(e) { nodes = []; }
               }
               if (Array.isArray(nodes)) {
                   nodes.forEach(node => {
                       if (node.subtopics) {
                           node.subtopics.forEach(sub => {
                               if (sub.done) total += (sub.xpEarned || 50);
                           });
                       }
                   });
               }
           });
       }
       return total;
    },

    userRank() {
        const xp = this.currentXp;
        if (xp < 500) return { label: 'Новичок', icon: 'seedling', color: '#10b981', min: 0, max: 500 };
        else if (xp < 1500) return { label: 'Junior', icon: 'code', color: '#3b82f6', min: 500, max: 1500 };
        else if (xp < 3000) return { label: 'Middle', icon: 'rocket', color: '#8b5cf6', min: 1500, max: 3000 };
        else if (xp < 6000) return { label: 'Senior', icon: 'thunder', color: '#f59e0b', min: 3000, max: 6000 };
        else if (xp < 10000) return { label: 'Lead', icon: 'fire', color: '#ef4444', min: 6000, max: 10000 };
        else return { label: 'Guru', icon: 'crown', color: '#722ed1', min: 10000, max: 50000 };
    },
    xpProgress() {
        const rank = this.userRank;
        const current = this.currentXp - rank.min;
        const target = rank.max - rank.min;
        if (target <= 0) return 100;
        return Math.min(Math.round((current / target) * 100), 100);
    },

    // Умный поиск активного трека
    activeTrack() {
        if (!this.roadmapList || this.roadmapList.length === 0) return null;
        let track = this.roadmapList.find(t => t.id === this.profile.activeRoadmapId);
        if (!track) track = this.roadmapList[this.roadmapList.length - 1];
        return track;
    },

    currentRoadmapProgress() {
        if (!this.activeTrack) return 0;
        return this.getTrackProgress(this.activeTrack);
    },

    currentRoadmapTitle() {
        return this.activeTrack ? this.activeTrack.role : 'Мое развитие';
    },

    nextRoadmapStep() {
        if(!this.activeTrack || !this.activeTrack.nodes) return 'Старт';
        const nodes = this.activeTrack.nodes;
        for (const node of nodes) {
            if (node.subtopics && node.subtopics.length > 0) {
                const notDoneSub = node.subtopics.find(s => !s.done);
                if (notDoneSub) return notDoneSub.label;
            } else if (node.data && !node.data.done) {
                return node.data.label;
            }
        }
        return 'Все пройдено!';
    },

    completionRate() { if (!this.isStudent) return 100; let score=0; if(this.profile.first_name) score++; if(this.profile.last_name) score++; if(this.profile.specialty_id) score++; if(this.profile.city) score++; if(this.employmentRecords.length) score++; return Math.round((score/5)*100); }
  },
  async mounted() {
    const u = JSON.parse(localStorage.getItem('user') || '{}');
    this.userRole = u.role || 'graduate';
    this.initLayout();
    await this.loadData();
    if (this.isStudent) { await Promise.all([this.loadSpecialties(), this.loadEmployment(), this.loadCompanies(), this.loadResumes(), this.loadRoadmapData(), this.loadRoadmapHistory()]); }
    if (this.isUniversity) { this.loadUniStats(); this.loadReports(); }
    if (this.isAdmin) { this.checkSystemHealth(); this.loadSystemLogs(); }
    this.loading = false;
  },
  methods: {
    initLayout() { const saved = localStorage.getItem(`profile_layout_${this.userRole}`); if (saved) this.layout = JSON.parse(saved); else this.resetLayout(); },

    // 🔥 ИСПРАВЛЕННЫЙ МЕТОД
    resetLayout() {
        if (this.isAdmin) this.layout = { left: ['info', 'admin_notes'], right: ['admin_metrics', 'system_logs'] };
        else if (this.isUniversity) this.layout = { left: ['info'], right: ['uni_stats', 'uni_reports'] };
        else if (this.isStudent) this.layout = { left: ['info', 'inventory', 'roadmap'], right: ['career', 'resumes', 'history'] };
        else this.layout = { left: ['info'], right: [] };
        this.saveLayout();
    },

    openLayoutSettings() { this.tempLayout = JSON.parse(JSON.stringify(this.layout)); this.showLayoutModal = true; },
    saveLayoutSettings() { this.layout = JSON.parse(JSON.stringify(this.tempLayout)); localStorage.setItem(`profile_layout_${this.userRole}`, JSON.stringify(this.layout)); this.showLayoutModal = false; message.success('Вид сохранен'); },

    // 🔥 ИСПРАВЛЕННЫЙ МЕТОД
    resetToDefault() {
        if (this.isAdmin) this.tempLayout = { left: ['info', 'admin_notes'], right: ['admin_metrics', 'system_logs'] };
        else if (this.isUniversity) this.tempLayout = { left: ['info'], right: ['uni_stats', 'uni_reports'] };
        else if (this.isStudent) this.tempLayout = { left: ['info', 'inventory', 'roadmap'], right: ['career', 'resumes', 'history'] };
        else this.tempLayout = { left: ['info'], right: [] };
    },

    getWidgetName(id) { return WIDGET_NAMES[id] || id; },

    // 🔥 ИНВЕНТАРЬ МЕТОДЫ
    getInventoryItems(tab) { return this.itemsDB[tab] || []; },
    isUnlocked(itemId) {
        return (this.profile.unlocked_rewards || []).includes(itemId);
    },
    isEquipped(itemId, tab) {
        const type = this.getEquipType(tab);
        return this.profile.equipped_rewards?.[type] === itemId;
    },
    getEquipType(tab) {
        if (tab === 'frames') return 'frame';
        if (tab === 'effects') return 'effect';
        return 'badge';
    },
    async toggleEquip(itemId, type) {
        if (!this.isUnlocked(itemId)) return message.warn('Сначала достигните нужного уровня!');
        const isWearing = this.profile.equipped_rewards?.[type] === itemId;
        const newItem = isWearing ? null : itemId;
        try {
            if (!this.profile.equipped_rewards) this.profile.equipped_rewards = {};
            if (newItem) this.profile.equipped_rewards[type] = newItem;
            else delete this.profile.equipped_rewards[type];
            await api.post(this.isEmployer ? '/recruiters/equip' : '/graduates/equip', { type, itemId: newItem });
            message.success(isWearing ? 'Снято' : 'Надето');
        } catch (e) { message.error('Ошибка сохранения'); }
    },

    async loadRoadmapData() {
        try {
            const r = await api.get('/chat/roadmap');
            if (r.data) {
                if (r.data.list && Array.isArray(r.data.list)) {
                    this.roadmapList = r.data.list;
                    if (r.data.activeId) this.profile.activeRoadmapId = r.data.activeId;
                } else if (Array.isArray(r.data)) {
                    this.roadmapList = [{ id: 'legacy', role: 'My Roadmap', nodes: r.data }];
                } else if (r.data.nodes) {
                    this.roadmapList = [{ id: 'legacy', role: r.data.role || 'My Roadmap', nodes: r.data.nodes }];
                }
            }
        } catch(e) { console.error("Roadmap Load Error:", e); }
    },

    getTrackProgress(track) {
        if(!track || !track.nodes || track.nodes.length === 0) return 0;
        let total = 0;
        let done = 0;
        track.nodes.forEach(node => {
            if (node.subtopics && node.subtopics.length > 0) {
                total += node.subtopics.length;
                done += node.subtopics.filter(s => s.done).length;
            } else {
                total++;
                if (node.data?.done || node.done) done++;
            }
        });
        if (total === 0) return 0;
        return Math.round((done / total) * 100);
    },
    getRankIcon(name) { const map = { 'seedling':'SmileTwoTone', 'code':'CodeOutlined', 'rocket':'RocketFilled', 'thunder':'ThunderboltFilled', 'fire':'FireFilled', 'crown':'CrownFilled' }; return map[name] || 'StarOutlined'; },

    async loadData() { try { let url = '/graduates/me'; if (this.isEmployer) url = '/recruiters/me'; if (this.isUniversity) url = '/university/me'; if (this.isAdmin) url = '/admin/me'; const r = await api.get(url); this.profile = r.data; if (!this.profile.portfolio_links) this.profile.portfolio_links = []; if (typeof this.profile.portfolio_links === 'string') { try { this.profile.portfolio_links = JSON.parse(this.profile.portfolio_links); } catch(e) { this.profile.portfolio_links = []; } } if (this.profile.birth_date) this.profile.birth_date = this.profile.birth_date.split('T')[0]; } catch (e) { if(this.isAdmin) this.profile = { first_name:'Admin', last_name:'Root', email:'root@local' }; } },
    enableEdit() { this.form = JSON.parse(JSON.stringify(this.profile)); if(this.form.birth_date) this.form.birth_date = this.form.birth_date.split('T')[0]; if(!this.form.portfolio_links) this.form.portfolio_links = []; this.isEditing = true; },
    cancelEdit() { this.isEditing = false; },
    async saveProfile() { this.saving = true; try { let url = '/graduates/me'; if (this.isEmployer) url = '/recruiters/me'; if (this.isUniversity) url = '/university/me'; if (this.isAdmin) { this.isEditing=false; return message.success('Saved'); } const r = await api.put(url, this.form); this.profile = {...this.profile, ...r.data}; if(this.profile.birth_date && this.profile.birth_date.includes('T')) this.profile.birth_date = this.profile.birth_date.split('T')[0]; if (this.isStudent && this.form.specialty_id) { const s = this.specialties.find(i => i.id === this.form.specialty_id); if(s) { this.profile.specialty_code = s.code; this.profile.specialty_name = s.name; } } message.success('Обновлено'); this.isEditing = false; } catch(e) { message.error('Ошибка'); } finally { this.saving = false; } },
    async handleAvatarUpload({ file }) { await this.genericUpload(file, '/graduates/avatar', 'avatar_url'); },
    async handleLogoUpload({ file }) { await this.genericUpload(file, '/university/logo', 'university_logo'); },
    async handleStampUpload({ file }) { await this.genericUpload(file, '/university/stamp', 'stamp_url'); },
    async genericUpload(file, url, fieldName) { const formData = new FormData(); const formField = fieldName === 'avatar_url' ? 'avatar' : 'file'; if(fieldName === 'avatar_url' && this.isUniversity) url = '/university/avatar'; formData.append(formField, file); try { const r = await api.post(url, formData); const newUrl = r.data[fieldName] || r.data.avatar_url || r.data.university_logo || r.data.stamp_url; this.profile[fieldName] = newUrl; this.form[fieldName] = newUrl; message.success('Загружено'); } catch(e) { message.error('Ошибка'); } },
    getAvatarUrl(url) { return url ? `http://localhost:4000${url}` : null; },
    getFileUrl(path) { return `http://localhost:4000${path}`; },
    formatDate(d) { return d ? new Date(d).toLocaleDateString() : '—'; },
    formatGender(g) { return g === 'male' ? 'Мужской' : (g === 'female' ? 'Женский' : '—'); },
    formatEducation(e) { const map = { bachelor:'Бакалавр', master:'Магистр', specialist:'Специалитет' }; return map[e] || e || '—'; },
    formatMoney(val) { return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(val); },
    addLink() { this.form.portfolio_links.push({ type: 'github', url: '' }); },
    removeLink(index) { this.form.portfolio_links.splice(index, 1); },
    getIconForType(type) { const map = { github: 'GithubOutlined', linkedin: 'LinkedinOutlined', telegram: 'MessageOutlined' }; return map[type] || 'LinkOutlined'; },
    getLabelForType(type) { const map = { github: 'GitHub', telegram: 'TG' }; return map[type] || 'Ссылка'; },
    async loadSpecialties() { try { const r = await api.get('/dict/specialties'); this.specialties = r.data; } catch(e){} },
    async loadEmployment() { try { const r = await api.get('/employment'); this.employmentRecords = r.data; } catch(e){} },
    async loadCompanies() { try { const r = await api.get('/dict/companies'); this.companies = r.data; } catch(e){} },
    async loadResumes() { try { const r = await api.get('/resumes'); this.resumes = r.data; } catch(e){} },
    async loadUniStats() { try { const r = await api.get('/university/stats'); this.uniStats = r.data; } catch(e){} },
    async loadReports() { try { const r = await api.get('/university/reports'); this.savedReports = r.data; } catch(e){} },
    async loadRoadmapHistory() { try { const r = await api.get('/chat/roadmap/history'); this.roadmapHistory = r.data; } catch(e){} },
    async checkSystemHealth() { try { await api.get('/news?limit=1'); this.systemHealth = { ping: 50, status: 'ok', version: 'v1.2' }; } catch (e) { this.systemHealth.status='error'; } },
    async loadSystemLogs() { try { const r = await api.get('/admin/logs'); this.systemLogs = r.data.slice(0, 10); } catch(e){} },
    saveNotes() { localStorage.setItem('admin_notes', this.adminNotes); message.success('Сохранено'); },
    openJobForm() { this.jobForm = { id: null, company_id: null, position_title: '', salary_amount: null, start_date: '', end_date: '', is_current: true }; this.showJobForm = true; },
    editJob(item) { this.jobForm = { ...item, start_date: item.start_date?.split('T')[0], end_date: item.end_date?.split('T')[0] }; this.showJobForm = true; },
    async addJob() { if (!this.jobForm.company_id) return message.warning('Компания?'); try { if (this.jobForm.id) await api.put(`/employment/${this.jobForm.id}`, this.jobForm); else await api.post('/employment', this.jobForm); this.showJobForm = false; this.loadEmployment(); } catch(e){ message.error('Ошибка'); } },
    async deleteJob(id) { try { await api.delete(`/employment/${id}`); this.loadEmployment(); } catch(e){} },
    async uploadResumeFile({ file }) { const fd = new FormData(); fd.append('file', file); try { await api.post('/resumes', fd, {headers:{'Content-Type':'multipart/form-data'}}); this.loadResumes(); } catch(e){} },
    async deleteResume(id) { try { await api.delete(`/resumes/${id}`); this.loadResumes(); } catch(e){} }
  }
};
</script>

<style scoped>
/* СТИЛИ (БЕЗ ИЗМЕНЕНИЙ) */
.rank-orb { position: absolute; bottom: 0; right: 10px; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 1.2rem; border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.15); z-index: 20; transition: transform 0.3s; }
.rank-orb:hover { transform: scale(1.1); }
.xp-status { margin-top: 8px; font-size: 0.95rem; background: rgba(255,255,255,0.6); padding: 4px 12px; border-radius: 20px; display: inline-block; border: 1px solid rgba(0,0,0,0.05); backdrop-filter: blur(5px); }
.xp-divider { margin: 0 6px; color: #cbd5e1; }
.xp-text { color: #64748b; font-weight: 600; }

.timeline-card { background: white; border-radius: 12px; padding: 14px 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.03); border: 1px solid #f0f0f0; margin-bottom: 10px; display: flex; flex-direction: column; gap: 5px; }
.timeline-header { display: flex; justify-content: space-between; align-items: center; }
.job-company { font-weight: 800; font-size: 1rem; color: #1e293b; }
.job-pos { color: #3b82f6; font-weight: 600; font-size: 0.9rem; }
.job-meta { font-size: 0.8rem; color: #9ca3af; display: flex; justify-content: space-between; margin-top: 4px; }
.timeline-actions { display: flex; gap: 8px; }

.resume-list { display: flex; flex-direction: column; gap: 10px; margin-top: 15px; }
.resume-item { display: flex; align-items: center; gap: 12px; background: white; padding: 12px 16px; border-radius: 12px; border: 1px solid #f0f0f0; box-shadow: 0 2px 8px rgba(0,0,0,0.02); transition: 0.2s; }
.resume-item:hover { border-color: #1890ff; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
.res-icon { font-size: 1.8rem; }
.res-info { flex: 1; overflow: hidden; }
.res-name { font-weight: 600; color: #374151; font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.res-date { font-size: 0.75rem; color: #9ca3af; }
.res-actions { display: flex; gap: 8px; }

.history-list { display: flex; flex-direction: column; gap: 10px; margin-top: 15px; }
.history-item { display: flex; justify-content: space-between; align-items: center; background: white; padding: 12px 16px; border-radius: 12px; border: 1px solid #f0f0f0; box-shadow: 0 2px 8px rgba(0,0,0,0.02); transition: 0.2s; }
.history-item:hover { border-color: #8b5cf6; transform: translateX(5px); }
.h-title { font-weight: 700; color: #374151; font-size: 0.95rem; }
.h-date { font-size: 0.75rem; color: #9ca3af; margin-top: 2px; }
.h-score { font-weight: 800; color: #6366f1; background: #e0e7ff; padding: 4px 10px; border-radius: 8px; font-size: 0.85rem; }
.h-score.done { color: #059669; background: #d1fae5; }

/* СТАТИЧНАЯ СЕТКА (БЕЗ DRAG) */
.static-grid-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 25px; align-items: start; margin-top: 20px; width: 100%; }
@media (max-width: 900px) { .static-grid-layout { grid-template-columns: 1fr; } }
.grid-column { display: flex; flex-direction: column; gap: 20px; width: 100%; }

.page-wrapper { min-height: 90vh; background: #f3f4f6; display: flex; justify-content: center; padding: 30px 20px; position: relative; }
.blobs-container { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 0; pointer-events: none; }
.blob { position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.5; }
.blob-1 { background: #a855f7; width: 400px; height: 400px; top: -100px; left: -100px; }
.blob-2 { background: #3b82f6; width: 300px; height: 300px; bottom: -50px; right: -50px; }
.blob-3 { background: #2dd4bf; width: 250px; height: 250px; top: 30%; left: 40%; opacity: 0.3; }
.content-container { width: 100%; max-width: 1200px; position: relative; z-index: 1; }
.glass-card { background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(20px); border: 1px solid white; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); padding: 25px; transition: transform 0.2s; }
.main-card { text-align: center; padding-bottom: 35px; }
.avatar-column { display: flex; flex-direction: column; align-items: center; }
.avatar-stack { position: relative; width: 170px; height: 170px; margin-bottom: 20px; }
.progress-ring { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
.avatar-img-box { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 135px; height: 135px; border-radius: 50%; background: white; display: flex; justify-content: center; align-items: center; box-shadow: 0 0 15px rgba(0,0,0,0.05); }
.main-avatar { background-color: #f3f4f6; border: 4px solid #fff; }
.full-name { font-size: 2rem; font-weight: 800; color: #111827; margin: 0 0 10px; }
.badges-wrapper { display: flex; justify-content: center; gap: 8px; flex-wrap: wrap; }
.specialty-badge { display: inline-flex; align-items: center; justify-content: center; gap: 8px; background: #e0f2fe; color: #0284c7; padding: 6px 18px; border-radius: 30px; font-weight: 700; font-size: 1rem; min-width: 150px; }
.admin-badge { background: #111827 !important; color: #f3f4f6 !important; }
.uni-badge { background: #0f766e !important; color: #ccfbf1 !important; }
.empty { background: #f3f4f6; color: #9ca3af; }
.top-actions { position: absolute; top: 25px; right: 25px; z-index: 5; display: flex; gap: 10px; }
.btn-glass-edit { background: rgba(255,255,255,0.6); border: 1px solid #e5e7eb; padding: 10px 20px; border-radius: 14px; cursor: pointer; font-weight: 600; color: #4b5563; }
.settings-btn { background: rgba(255,255,255,0.6); border: none; width: 36px; height: 36px; border-radius: 50%; cursor: pointer; color: #6b7280; display: flex; align-items: center; justify-content: center; }
.settings-btn:hover { background: white; color: #1890ff; }
.btn-mini-edit { width: 36px; height: 36px; border-radius: 50%; background: #1890ff; color: white; border: 3px solid white; cursor: pointer; box-shadow: 0 4px 10px rgba(0,0,0,0.15); border: none; }
.avatar-upload-pos { position: absolute; bottom: 5px; right: 5px; z-index: 10; }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid rgba(0,0,0,0.06); padding-bottom: 10px; }
.card-header h3 { margin: 0; color: #1f2937; font-weight: 800; display: flex; align-items: center; gap: 12px; font-size: 1.2rem; }
.info-row { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed #e5e7eb; padding: 8px 0; }
.label { color: #6b7280; font-size: 0.9rem; font-weight: 500; }
.value { font-weight: 700; color: #111827; text-align: right; }
.value.highlight { color: #3b82f6; }
.divider { height: 1px; background: #e5e7eb; margin: 20px 0; }
.about-section h4 { font-size: 0.95rem; font-weight: 700; color: #374151; margin-bottom: 8px; }
.about-text { color: #4b5563; line-height: 1.6; white-space: pre-line; font-size: 0.95rem; }
.links-grid { display: flex; flex-wrap: wrap; gap: 8px; }
.modern-link-tag { background: white; border: 1px solid #e5e7eb; padding: 6px 12px; border-radius: 10px; color: #4b5563; font-weight: 600; text-decoration: none; display: flex; align-items: center; gap: 6px; font-size: 0.85rem; }
.uni-docs-preview .docs-row { display: flex; gap: 15px; justify-content: center; }
.preview-img { width: 50px; height: 50px; object-fit: contain; border: 1px solid #e2e8f0; border-radius: 8px; padding: 5px; background: white; }
.doc-preview-item { display: flex; flex-direction: column; align-items: center; font-size: 0.75rem; color: #64748b; }
.form-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
.modern-input, .modern-select { border-radius: 8px; padding: 6px 11px; }
.link-edit-row { display: flex; gap: 10px; margin-bottom: 12px; }
.btn-icon-delete { background: #fee2e2; border: none; color: #ef4444; width: 32px; height: 32px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.btn-add-link { width: 100%; border: 1px dashed #d1d5db; background: white; padding: 6px; border-radius: 8px; cursor: pointer; color: #6b7280; }
.uploads-section { background: #f8fafc; padding: 15px; border-radius: 12px; border: 1px dashed #cbd5e1; margin-top: 15px; }
.upload-grid { display: flex; gap: 15px; } .upload-placeholder { width: 70px; height: 70px; border: 2px dashed #e2e8f0; border-radius: 10px; display: flex; align-items: center; justify-content: center; cursor: pointer; background: white; color: #9ca3af; margin: 0 auto; } .ub-label { font-size: 0.8rem; text-align: center; margin-bottom: 5px; color: #64748b; }
.edit-actions { display: flex; gap: 10px; margin-top: 20px; }
.roadmap-multi-list { display: flex; flex-direction: column; gap: 8px; }
.rm-track-item { display: flex; align-items: center; justify-content: space-between; background: white; padding: 12px 16px; border-radius: 12px; border: 1px solid #e5e7eb; }
.rm-track-info { flex: 1; }
.rm-role { font-weight: 700; color: #374151; font-size: 0.95rem; }
.rm-status { font-size: 0.75rem; color: #9ca3af; margin-top: 2px; }
.rm-next { font-size: 0.75rem; color: #6b7280; margin-top: 2px; font-style: italic; }
.rm-track-chart { margin-left: 10px; }
.btn-icon-link { border: none; background: none; color: #9ca3af; cursor: pointer; font-size: 1.2rem; transition: 0.2s; display: flex; align-items: center; }
.btn-icon-link:hover { color: #1890ff; transform: translateX(3px); }
.btn-add-job { background: #eff6ff; border: none; color: #2563eb; width: 30px; height: 30px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.job-form-wrapper { background: #f9fafb; padding: 15px; border-radius: 12px; border: 1px solid #e5e7eb; margin-bottom: 15px; }
.action-icon { cursor: pointer; color: #94a3b8; margin-left: 8px; transition: 0.2s; } .action-icon:hover { color: #1890ff; } .action-icon.danger:hover { color: #ef4444; }
.empty-timeline { text-align: center; color: #9ca3af; padding: 15px; font-size: 0.9rem; }
.empty-icon-box { font-size: 2rem; color: #e5e7eb; margin-bottom: 10px; }
.uni-stats-list { display: flex; justify-content: space-between; padding: 10px 0; }
.u-stat { text-align: center; flex: 1; } .us-val { font-size: 1.4rem; font-weight: 800; color: #0f766e; }
.doc-list { display: flex; flex-direction: column; gap: 8px; margin-top: 10px; }
.doc-item { display: flex; align-items: center; gap: 8px; padding: 8px; background: #f8fafc; border-radius: 8px; font-size: 0.9rem; font-weight: 600; color: #334155; }
.doc-icon { font-size: 1.2rem; }
.doc-info { flex: 1; }
.btn-create-report { width: 100%; margin-top: 15px; background: #eff6ff; color: #2563eb; border: 1px dashed #2563eb; padding: 10px; border-radius: 10px; cursor: pointer; font-weight: 600; transition: 0.2s; }
.fade-in { animation: fadeIn 0.7s cubic-bezier(0.2, 0.8, 0.2, 1); }
@keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
.card-accent-purple { border-top: 4px solid #a855f7; }
.card-accent-blue { border-top: 4px solid #3b82f6; }
.card-accent-teal { border-top: 4px solid #0d9488; }
.card-accent-orange { border-top: 4px solid #f97316; }
.scrollable-content { max-height: 500px; overflow-y: auto; padding-right: 5px; }
.layout-editor-container { padding: 20px; }
.le-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
.le-column { background: #f9fafb; padding: 15px; border-radius: 12px; border: 1px solid #e5e7eb; }
.le-col-header { font-weight: 700; margin-bottom: 10px; color: #6b7280; text-align: center; }
.le-drag-area { min-height: 200px; display: flex; flex-direction: column; gap: 8px; }
.le-item { background: white; padding: 10px; border-radius: 8px; border: 1px solid #e5e7eb; cursor: move; display: flex; justify-content: space-between; align-items: center; font-weight: 600; color: #374151; }
.le-ghost { opacity: 0.5; background: #e6f7ff; border: 1px dashed #1890ff; }
.reset-block { text-align: center; margin-top: 15px; }
.custom-scroll::-webkit-scrollbar { width: 6px; }
.custom-scroll::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 10px; }
.roadmap-widget-content { text-align: center; padding: 15px 0; }
.roadmap-title { font-size: 1rem; font-weight: 700; color: #374151; margin-bottom: 15px; }
.circle-wrapper { margin: 0 auto 15px; width: 100px; }
.rp-next { font-size: 0.9rem; color: #6b7280; }
.rp-next strong { color: #8b5cf6; display: block; margin-top: 2px; }
/* === СТИЛИ ИНВЕНТАРЯ === */
.inv-tabs { display: flex; gap: 10px; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
.inv-tabs span { cursor: pointer; padding: 5px 12px; border-radius: 20px; font-size: 0.9rem; color: #6b7280; font-weight: 600; transition: 0.2s; }
.inv-tabs span.active { background: #e0e7ff; color: #4f46e5; }
.inv-tabs span:hover { background: #f3f4f6; }

.inv-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 10px; max-height: 200px; overflow-y: auto; }
.inv-item { background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 10px; text-align: center; cursor: pointer; transition: 0.2s; position: relative; overflow: hidden; }
.inv-item:hover { transform: translateY(-2px); box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
.inv-item.locked { opacity: 0.5; cursor: not-allowed; background: #f9fafb; }
.inv-item.equipped { border-color: #10b981; background: #ecfdf5; }

.inv-icon { font-size: 1.8rem; color: #4f46e5; margin-bottom: 5px; }
.inv-name { font-size: 0.7rem; font-weight: 600; color: #374151; line-height: 1.2; }
.inv-status { font-size: 0.6rem; color: #10b981; font-weight: 700; margin-top: 2px; }

/* 🔥 ВИЗУАЛЬНЫЕ ЭФФЕКТЫ ДЛЯ АВАТАРА 🔥 */

/* Синяя рамка */
.frame-blue-glow .main-avatar { border: 4px solid #3b82f6; box-shadow: 0 0 15px #3b82f6; }

/* Золотая рамка */
.frame-gold-glow .main-avatar { border: 4px solid #fbbf24; box-shadow: 0 0 20px #fbbf24, inset 0 0 10px #fbbf24; animation: gold-pulse 2s infinite; }
@keyframes gold-pulse { 0% { box-shadow: 0 0 10px #fbbf24; } 50% { box-shadow: 0 0 25px #fbbf24; } 100% { box-shadow: 0 0 10px #fbbf24; } }

/* Неон */
.frame-neon-pulse .main-avatar { border: 4px solid #d946ef; box-shadow: 0 0 10px #d946ef, 0 0 20px #a855f7; }

/* Эффект Огня (на контейнере avatar-stack) */
.effect-fire::before {
    content: ''; position: absolute; bottom: -10px; left: 50%; transform: translateX(-50%);
    width: 100%; height: 80%;
    background: radial-gradient(circle, rgba(249, 115, 22, 0.6) 0%, transparent 70%);
    filter: blur(20px); z-index: 0; animation: fire-flicker 0.1s infinite;
}
@keyframes fire-flicker { 0% { opacity: 0.8; transform: translateX(-50%) scale(1); } 50% { opacity: 1; transform: translateX(-50%) scale(1.05); } 100% { opacity: 0.9; transform: translateX(-50%) scale(1); } }

/* Темная тема (класс вешается на .main-card) */
.theme-dark-mode { background: #111827 !important; border-color: #374151 !important; color: white !important; }
.theme-dark-mode .full-name { color: white !important; }

</style>