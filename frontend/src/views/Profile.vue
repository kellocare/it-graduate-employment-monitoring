<template>
  <div class="page-wrapper" :class="getThemeClass">

    <!-- === ФОНОВЫЕ ЭФФЕКТЫ === -->
    <div v-if="currentTheme === 'theme_matrix'" class="theme-bg-layer matrix-bg-rain">
      <span v-for="i in 50" :key="i" :style="{ left: Math.random() * 100 + '%', animationDuration: Math.random() * 2 + 1 + 's', animationDelay: Math.random() * 5 + 's', fontSize: Math.random() * 20 + 10 + 'px' }">
        {{ Math.random() > 0.5 ? '1' : '0' }}
      </span>
    </div>

    <div v-if="currentTheme === 'theme_gold'" class="theme-bg-layer gold-bg-dust">
      <div v-for="i in 30" :key="'dust-'+i" class="gold-particle" :style="{ top: Math.random() * 100 + '%', left: Math.random() * 100 + '%' }">✦</div>
      <div v-for="i in 15" :key="'bar-'+i" class="gold-bar" :style="{ top: Math.random() * 100 + '%', left: Math.random() * 100 + '%', animationDelay: i + 's' }"></div>
    </div>

    <div v-if="currentTheme === 'theme_dark'" class="theme-bg-layer dark-bg-stars">
      <div v-for="i in 40" :key="'star-'+i" class="dark-star" :style="getDarkStarStyle(i)"></div>
    </div>

    <div class="blobs-container" v-if="!currentTheme">
      <div class="blob blob-1"></div>
      <div class="blob blob-2"></div>
      <div class="blob blob-3"></div>
    </div>

    <div class="content-container">
      <a-spin :spinning="loading" tip="Загрузка профиля...">

        <!-- === 1. ШАПКА === -->
        <div class="glass-card main-card fade-in" :class="{ 'admin-theme': isAdmin, 'uni-theme': isUniversity }">
          <div class="bg-decoration-circle"></div>

          <div class="top-actions">
            <button class="btn-icon-link settings-btn" @click="openLayoutSettings" title="Настроить виджеты">
               <setting-outlined />
            </button>
            <button v-if="!isEditing" class="btn-glass-edit" @click="enableEdit">
              <edit-outlined /> Редактировать
            </button>
          </div>

          <div class="avatar-column">
            <div class="avatar-stack">
              <!-- XP Прогресс (Студент) -->
              <a-progress v-if="isStudent" type="circle" :percent="xpProgress" :width="175" :stroke-color="userRank.color" :stroke-width="6" class="progress-ring" :show-info="false" />
              <!-- XP Прогресс (Остальные - декоративный круг) -->
              <div v-else class="progress-ring-decorative"></div>

              <!-- Ранг (Студент) -->
              <div v-if="isStudent" class="rank-orb" :style="{ background: userRank.color }" :title="userRank.label">
                 <component :is="getRankIcon(userRank.icon)" />
              </div>

              <!-- ЭФФЕКТЫ -->
              <div class="effects-container">
                  <div v-if="currentEffect === 'effect_confetti'" class="confetti-wrapper">
                      <div v-for="n in 30" :key="n" class="confetti-piece" :style="getConfettiStyle(n)"></div>
                  </div>
                  <div v-if="currentEffect === 'effect_snow'" class="snow-wrapper">
                      <div v-for="n in 25" :key="n" class="snowflake" :style="getSnowStyle(n)">❄</div>
                  </div>
                  <div v-if="currentEffect === 'effect_fire'" class="fire-wrapper">
                      <div class="fire-flame"></div><div class="fire-flame"></div><div class="fire-flame"></div>
                  </div>
                  <div v-if="currentEffect === 'effect_lightning'" class="lightning-wrapper">
                      <svg viewBox="0 0 200 200" class="lightning-bolt left-bolt"><path d="M50,0 L10,80 L60,80 L20,200 L90,100 L50,100 Z" /></svg>
                      <svg viewBox="0 0 200 200" class="lightning-bolt right-bolt"><path d="M150,0 L190,80 L140,80 L180,200 L110,100 L150,100 Z" /></svg>
                  </div>
              </div>

              <!-- Аватар + Рамка -->
              <div class="avatar-img-box" :class="getEquippedFrame">
                <div v-if="currentEffect === 'effect_matrix'" class="matrix-overlay">
                    <div class="matrix-code-line">010101</div>
                    <div class="matrix-code-line" style="animation-delay: 0.5s">101010</div>
                    <div class="matrix-code-line" style="animation-delay: 1s">001100</div>
                    <div class="matrix-code-line" style="animation-delay: 0.2s">110011</div>
                </div>

                <a-avatar :size="135" :src="getAvatarUrl(profile.avatar_url)" class="main-avatar">
                   <template #icon><user-outlined class="default-icon" /></template>
                </a-avatar>

                <div v-if="profile.equipped_rewards?.frame === 'frame_royal'" class="royal-crown-container">
                    <svg viewBox="0 0 512 512" width="70" height="70" class="floating-crown">
                        <path fill="#ffd700" stroke="#b45309" stroke-width="10" d="M112,238l-96,96l240,168l240-168l-96-96l-72,112l-72-168l-72,168Z"/>
                        <circle fill="#ef4444" cx="112" cy="238" r="20"/><circle fill="#ef4444" cx="400" cy="238" r="20"/><circle fill="#3b82f6" cx="256" cy="180" r="25"/>
                    </svg>
                </div>
              </div>

              <a-upload v-if="isEditing" name="avatar" :show-upload-list="false" :customRequest="handleAvatarUpload" class="avatar-upload-pos">
                  <button class="btn-mini-edit" title="Загрузить фото"><camera-outlined /></button>
              </a-upload>
            </div>

            <div class="name-block">
              <h1 class="full-name">{{ profile.last_name || 'Фамилия' }} {{ profile.first_name || 'Имя' }} {{ profile.patronymic || '' }}</h1>

              <!-- Бейджи из инвентаря -->
              <div class="equipped-badges" v-if="activeBadges.length > 0">
                 <div v-for="badge in activeBadges" :key="badge.id" class="equipped-badge-item" :class="badge.id">
                    <component :is="badge.icon" /> {{ badge.name }}
                 </div>
              </div>

              <!-- Ролевые Бейджи (Восстановлены) -->
              <div class="badges-wrapper" v-if="!isStudent">
                 <div class="specialty-badge admin-badge" v-if="isAdmin"><safety-certificate-filled /> System Administrator</div>
                 <div class="specialty-badge uni-badge" v-else-if="isUniversity"><bank-filled /> Сотрудник ВУЗа</div>
                 <div class="specialty-badge" v-else-if="isEmployer"><idcard-outlined /> Работодатель</div>
              </div>

              <div class="xp-status" v-if="isStudent">
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

              <!-- ИНВЕНТАРЬ (Только студент) -->
                <div v-if="element === 'inventory' && isStudent" class="glass-card card-accent-orange">
                    <div class="card-header"><h3><gift-filled style="color: #f59e0b;" /> Мои награды</h3></div>
                    <div class="inv-tabs">
                        <span :class="{active: invTab==='frames'}" @click="invTab='frames'">Рамки</span>
                        <span :class="{active: invTab==='effects'}" @click="invTab='effects'">Эффекты</span>
                        <span :class="{active: invTab==='badges'}" @click="invTab='badges'">Бейджи ({{ (profile.equipped_rewards?.badges || []).length }}/2)</span>
                        <span :class="{active: invTab==='themes'}" @click="invTab='themes'">Темы</span>
                    </div>
                    <div class="inv-grid custom-scroll">
                        <div v-for="item in getInventoryItems(invTab)" :key="item.id"
                             class="inv-item"
                             :class="{ 'locked': !isUnlocked(item.id), 'equipped': isEquipped(item.id, invTab) }"
                             @click="toggleEquip(item.id, getEquipType(invTab))"
                        >
                            <div class="inv-item-status-icon" v-if="isEquipped(item.id, invTab)"><check-circle-filled /></div>
                            <div class="inv-icon">
                                <lock-filled v-if="!isUnlocked(item.id)" />
                                <component :is="item.icon" v-else />
                            </div>
                            <div class="inv-name">{{ item.name }}</div>
                        </div>
                    </div>
                </div>

               <!-- ИНФОРМАЦИЯ -->
               <div v-if="element === 'info'" class="glass-card card-accent-purple">
                   <div class="card-header"><h3><component :is="getHeaderIcon" /> {{ isUniversity ? 'Служебная информация' : (isAdmin ? 'Данные администратора' : 'Личные данные') }}</h3></div>

                   <!-- VIEW MODE -->
                   <div v-if="!isEditing" class="info-view scrollable-content">
                       <div class="info-grid">
                           <!-- ОБЩИЕ -->
                           <div class="info-cell">
                               <span class="label">Email</span>
                               <span class="value">{{ profile.email || 'Не указан' }}</span>
                           </div>
                           <div class="info-cell">
                               <span class="label">Телефон</span>
                               <span class="value phone">{{ profile.phone || '—' }}</span>
                           </div>

                           <!-- СТУДЕНТ -->
                           <template v-if="isStudent">
                               <div class="info-cell"><span class="label">Дата рождения</span><span class="value">{{ formatDate(profile.birth_date) }}</span></div>
                               <div class="info-cell"><span class="label">Пол</span><span class="value">{{ formatGender(profile.gender) }}</span></div>
                               <div class="info-cell"><span class="label">Город</span><span class="value">{{ profile.city || '—' }}</span></div>
                               <div class="info-cell"><span class="label">Telegram</span><span class="value highlight">{{ profile.telegram ? '@'+profile.telegram : '—' }}</span></div>
                               <div class="info-cell full-width"><span class="label">Учебное заведение / Факультет</span><span class="value">{{ profile.faculty || '—' }}</span></div>
                           </template>

                           <!-- РАБОТОДАТЕЛЬ -->
                           <template v-if="isEmployer">
                               <div class="info-cell"><span class="label">Компания</span><span class="value">{{ profile.company_name || 'Не указана' }}</span></div>
                               <div class="info-cell"><span class="label">Должность</span><span class="value">{{ profile.position || '—' }}</span></div>
                               <div class="info-cell"><span class="label">Статус найма</span><span class="value info-text">{{ profile.hiring_status || 'Не указан' }}</span></div>
                               <div class="info-cell"><span class="label">Telegram</span><span class="value highlight">{{ profile.telegram ? '@'+profile.telegram : '—' }}</span></div>
                           </template>

                           <!-- СОТРУДНИК ВУЗА -->
                           <template v-if="isUniversity">
                               <div class="info-cell full-width"><span class="label">Учебное заведение</span><span class="value">{{ profile.university_name || '—' }}</span></div>
                               <div class="info-cell"><span class="label">Должность</span><span class="value">{{ profile.position || '—' }}</span></div>
                               <div class="info-cell"><span class="label">Кафедра</span><span class="value">{{ profile.department || '—' }}</span></div>
                               <div class="info-cell"><span class="label">Статус семестра</span><span class="value warning-text">{{ profile.semester_status || 'Активный' }}</span></div>
                               <!-- ЛОГО И ПЕЧАТЬ В VIEW MODE -->
                               <div class="info-cell full-width" v-if="profile.university_logo || profile.stamp_url">
                                   <span class="label">Документы ВУЗа</span>
                                   <div class="docs-preview-row">
                                       <div v-if="profile.university_logo" class="doc-mini"><img :src="getAvatarUrl(profile.university_logo)" alt="Logo"><span>Лого</span></div>
                                       <div v-if="profile.stamp_url" class="doc-mini"><img :src="getAvatarUrl(profile.stamp_url)" alt="Stamp"><span>Печать</span></div>
                                   </div>
                               </div>
                           </template>

                           <!-- АДМИН -->
                           <template v-if="isAdmin">
                               <div class="info-cell"><span class="label">Роль</span><span class="value" style="color: #ef4444;">Superuser</span></div>
                               <div class="info-cell"><span class="label">Telegram</span><span class="value highlight">{{ profile.telegram ? '@'+profile.telegram : '—' }}</span></div>
                           </template>
                       </div>

                       <div class="about-section" v-if="profile.about_me">
                           <h4>О себе / Описание</h4>
                           <p class="about-text">{{ profile.about_me }}</p>
                       </div>
                   </div>

                   <!-- EDIT MODE -->
                   <a-form v-else layout="vertical" class="modern-form">
                       <div class="form-row-2">
                           <a-form-item label="Фамилия"><a-input v-model:value="form.last_name" class="modern-input"/></a-form-item>
                           <a-form-item label="Имя"><a-input v-model:value="form.first_name" class="modern-input"/></a-form-item>
                       </div>
                       <a-form-item label="Отчество"><a-input v-model:value="form.patronymic" class="modern-input"/></a-form-item>

                       <!-- СТУДЕНТ -->
                       <template v-if="isStudent">
                           <div class="form-row-2">
                               <a-form-item label="Дата рождения"><a-date-picker v-model:value="form.birth_date" value-format="YYYY-MM-DD" style="width: 100%" class="modern-input" /></a-form-item>
                               <a-form-item label="Пол"><a-select v-model:value="form.gender" class="modern-select"><a-select-option value="male">Мужской</a-select-option><a-select-option value="female">Женский</a-select-option></a-select></a-form-item>
                           </div>
                           <a-form-item label="Специальность"><a-select v-model:value="form.specialty_id" class="modern-select"><a-select-option v-for="s in specialties" :key="s.id" :value="s.id">{{ s.name }}</a-select-option></a-select></a-form-item>
                           <div class="form-row-2">
                               <a-form-item label="Город"><a-select v-model:value="form.city" show-search :options="cityOptions" class="modern-select"/></a-form-item>
                               <a-form-item label="Год выпуска"><a-input-number v-model:value="form.graduation_year" class="modern-input" style="width:100%"/></a-form-item>
                           </div>
                       </template>

                       <!-- РАБОТОДАТЕЛЬ -->
                       <template v-if="isEmployer">
                           <a-form-item label="Компания">
                               <!-- Если компаний нет в списке, даем возможность ввести текст или выбрать -->
                               <a-select v-if="companies.length" v-model:value="form.company_id" class="modern-select" placeholder="Выберите компанию">
                                   <a-select-option v-for="c in companies" :key="c.id" :value="c.id">{{ c.name }}</a-select-option>
                               </a-select>
                               <a-input v-else v-model:value="form.company_name" placeholder="Введите название компании" class="modern-input" />
                           </a-form-item>
                           <a-form-item label="Должность"><a-input v-model:value="form.position" class="modern-input"/></a-form-item>
                           <a-form-item label="Статус найма">
                               <a-select v-model:value="form.hiring_status" class="modern-select">
                                   <a-select-option value="active">Активный поиск</a-select-option>
                                   <a-select-option value="passive">Пассивный поиск</a-select-option>
                                   <a-select-option value="closed">Набор закрыт</a-select-option>
                               </a-select>
                           </a-form-item>
                       </template>

                       <!-- СОТРУДНИК ВУЗА -->
                       <template v-if="isUniversity">
                           <a-form-item label="Название ВУЗа"><a-input v-model:value="form.university_name" class="modern-input"/></a-form-item>
                           <div class="form-row-2">
                               <a-form-item label="Должность"><a-input v-model:value="form.position" class="modern-input"/></a-form-item>
                               <a-form-item label="Кафедра"><a-input v-model:value="form.department" class="modern-input"/></a-form-item>
                           </div>
                           <a-form-item label="Статус семестра">
                               <a-select v-model:value="form.semester_status" class="modern-select">
                                   <a-select-option value="study">Учебный процесс</a-select-option>
                                   <a-select-option value="session">Сессия</a-select-option>
                                   <a-select-option value="vacation">Каникулы</a-select-option>
                               </a-select>
                           </a-form-item>
                           <!-- ЗАГРУЗКА ДОКУМЕНТОВ -->
                           <div class="uploads-section">
                               <div class="upload-label">Файлы ВУЗа:</div>
                               <div class="upload-row">
                                   <a-upload name="logo" :show-upload-list="false" :customRequest="handleLogoUpload">
                                       <a-button size="small"><upload-outlined /> Логотип</a-button>
                                   </a-upload>
                                   <a-upload name="stamp" :show-upload-list="false" :customRequest="handleStampUpload">
                                       <a-button size="small"><upload-outlined /> Печать</a-button>
                                   </a-upload>
                               </div>
                           </div>
                       </template>

                       <div class="form-row-2">
                           <a-form-item label="Телефон"><a-input v-model:value="form.phone" class="modern-input" /></a-form-item>
                           <a-form-item label="Telegram"><a-input v-model:value="form.telegram" prefix="@" class="modern-input" /></a-form-item>
                       </div>

                       <a-form-item label="О себе">
                           <a-textarea v-model:value="form.about_me" :rows="4" class="modern-input"/>
                       </a-form-item>

                       <div class="edit-actions">
                           <a-button type="primary" shape="round" @click="saveProfile(false)" :loading="saving">Сохранить</a-button>
                           <a-button shape="round" @click="cancelEdit" style="margin-left:10px">Отмена</a-button>
                       </div>
                   </a-form>
               </div>

               <!-- ROADMAP -->
               <div v-if="element === 'roadmap' && isStudent" class="glass-card card-accent-purple">
                   <div class="card-header">
                       <h3><compass-outlined /> Мое развитие</h3>
                       <router-link to="/roadmap" class="btn-icon-link" title="Перейти к карте"><arrow-right-outlined /></router-link>
                   </div>

                   <div v-if="roadmapList.length > 0" class="roadmap-widget-content roadmap-enhanced">
                       <div class="roadmap-card-bg"></div>
                       <h4 class="roadmap-title">{{ currentRoadmapTitle }}</h4>

                       <div class="circle-wrapper enhanced-circle">
                          <a-progress type="circle" :percent="currentRoadmapProgress" :width="110"
                                      stroke-color="{ '0%': '#8b5cf6', '100%': '#3b82f6' }"
                                      :stroke-width="8" />
                       </div>

                       <div class="rp-next">
                           <span><flag-outlined /> Текущая цель:</span>
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

                <!-- КАРЬЕРА -->
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

                <!-- РЕЗЮМЕ -->
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

                <!-- ИСТОРИЯ -->
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

            </div>
          </div>
        </div>

      </a-spin>
    </div>

    <!-- MODAL -->
    <a-modal v-model:open="showLayoutModal" title="Настройка виджетов" @ok="saveLayoutSettings" ok-text="Сохранить" centered width="600px">
        <div class="layout-editor-container">
            <div class="le-grid">
             <div class="le-column"><div class="le-col-header">Левая колонка</div><draggable v-model="tempLayout.left" group="widgets" item-key="toString()" class="le-drag-area" ghost-class="le-ghost"><template #item="{ element }"><div class="le-item">{{ getWidgetName(element) }} <drag-outlined /></div></template></draggable></div>
             <div class="le-column"><div class="le-col-header">Правая колонка</div><draggable v-model="tempLayout.right" group="widgets" item-key="toString()" class="le-drag-area" ghost-class="le-ghost"><template #item="{ element }"><div class="le-item">{{ getWidgetName(element) }} <drag-outlined /></div></template></draggable></div>
            </div>
            <div class="reset-block"><a-button size="small" type="link" @click="resetToDefault">Сбросить по умолчанию</a-button></div>
        </div>
    </a-modal>
  </div>
</template>

<script>
import api from '../axios';
import draggable from 'vuedraggable';
import {message} from 'ant-design-vue';
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
  GiftFilled, LockFilled, SkinOutlined, ExperimentFilled, ReadFilled, StarFilled, BlockOutlined,
  BgColorsOutlined, EyeInvisibleOutlined, BuildFilled, GoldOutlined, SketchOutlined, RobotOutlined
} from '@ant-design/icons-vue';

const RUSSIAN_CITIES = ['Москва', 'Санкт-Петербург', 'Новосибирск', 'Екатеринбург', 'Казань', 'Нижний Новгород'].map(c => ({
  value: c,
  label: c
}));
const WIDGET_NAMES = {
  'info': 'Личные данные',
  'career': 'Карьера',
  'resumes': 'Мои резюме',
  'history': 'История обучения',
  'roadmap': 'Карта развития',
  'inventory': 'Инвентарь Наград'
};

export default {
  components: {
    draggable,
    UserOutlined,
    EditOutlined,
    LinkOutlined,
    SolutionOutlined,
    PlusOutlined,
    DeleteOutlined,
    BankOutlined,
    CameraOutlined,
    PhoneOutlined,
    MailOutlined,
    GithubOutlined,
    LinkedinOutlined,
    CodeOutlined,
    MessageOutlined,
    IdcardOutlined,
    SafetyCertificateFilled,
    CheckCircleFilled,
    AppstoreFilled,
    FileExcelOutlined,
    InboxOutlined,
    DownloadOutlined,
    DashboardOutlined,
    SnippetsOutlined,
    SaveOutlined,
    SettingOutlined,
    HistoryOutlined,
    CompassOutlined,
    ArrowRightOutlined,
    FlagOutlined,
    FolderOpenOutlined,
    FileTextOutlined,
    UploadOutlined,
    FilePdfOutlined,
    FileWordOutlined,
    WarningOutlined,
    CheckCircleOutlined,
    UserAddOutlined,
    ReloadOutlined,
    InfoCircleOutlined,
    BugOutlined,
    AppstoreOutlined,
    DragOutlined,
    BankFilled,
    SmileTwoTone,
    RocketFilled,
    TrophyFilled,
    ThunderboltFilled,
    FireFilled,
    CrownFilled,
    StarOutlined,
    GiftFilled,
    LockFilled,
    SkinOutlined,
    ExperimentFilled,
    ReadFilled,
    StarFilled,
    BlockOutlined,
    BgColorsOutlined,
    EyeInvisibleOutlined,
    BuildFilled,
    GoldOutlined,
    SketchOutlined,
    RobotOutlined
  },
  data() {
    return {
      userRole: 'graduate',
      profile: {},
      specialties: [], employmentRecords: [], companies: [], uniStats: null, savedReports: [], resumes: [],
      form: {portfolio_links: []},
      jobForm: {
        id: null,
        company_id: null,
        position_title: '',
        salary_amount: null,
        start_date: '',
        end_date: '',
        is_current: true
      },
      loading: true, saving: false, isEditing: false, showJobForm: false, phoneError: '', cityOptions: RUSSIAN_CITIES,
      adminNotes: localStorage.getItem('admin_notes') || '',
      systemLogs: [],
      roadmapList: [], roadmapHistory: [],
      layout: {left: [], right: []},
      showLayoutModal: false,
      tempLayout: {left: [], right: []},
      invTab: 'frames',

      itemsDB: {
        frames: [
          {id: 'frame_blue', name: 'Синяя рамка', icon: 'BlockOutlined'},
          {id: 'frame_green', name: 'Эко-рамка', icon: 'BlockOutlined'},
          {id: 'frame_gold', name: 'Золотая рамка', icon: 'TrophyFilled'},
          {id: 'frame_red', name: 'Рамка агрессора', icon: 'BlockOutlined'},
          {id: 'frame_neon', name: 'Кибер-рамка', icon: 'ThunderboltFilled'},
          {id: 'frame_royal', name: 'Королевская', icon: 'CrownFilled'}
        ],
        effects: [
          {id: 'effect_confetti', name: 'Конфетти', icon: 'SmileTwoTone'},
          {id: 'effect_snow', name: 'Холод', icon: 'SkinOutlined'},
          {id: 'effect_fire', name: 'В огне', icon: 'FireFilled'},
          {id: 'effect_lightning', name: 'Молнии', icon: 'ThunderboltFilled'},
          {id: 'effect_matrix', name: 'Матрица', icon: 'CodeOutlined'}
        ],
        badges: [
          {id: 'badge_fast', name: 'Быстрый старт', icon: 'RocketFilled'},
          {id: 'badge_book', name: 'Теоретик', icon: 'ReadFilled'},
          {id: 'badge_puzzle', name: 'Problem Solver', icon: 'BuildFilled'},
          {id: 'badge_top', name: 'Топ талант', icon: 'StarFilled'},
          {id: 'badge_star', name: 'Суперзвезда', icon: 'StarOutlined'},
          {id: 'badge_guru', name: 'Гуру кода', icon: 'ExperimentFilled'},
          {id: 'crown_animated', name: 'VIP Корона', icon: 'CrownFilled'}
        ],
        themes: [
          {id: 'theme_dark', name: 'Тёмная тема', icon: 'EyeInvisibleOutlined'},
          {id: 'theme_matrix', name: 'Матрица', icon: 'CodeOutlined'},
          {id: 'theme_gold', name: 'Лакшери', icon: 'GoldOutlined'}
        ]
      }
    };
  },
  computed: {
    isEmployer() {
      return this.userRole === 'employer';
    },
    isStudent() {
      return this.userRole === 'graduate';
    },
    isAdmin() {
      return this.userRole === 'admin';
    },
    isUniversity() {
      return this.userRole === 'university_staff';
    },

    currentTheme() {
      return this.profile.equipped_rewards?.theme;
    },
    currentEffect() {
      return this.profile.equipped_rewards?.effect;
    },

    getThemeClass() {
      const t = this.currentTheme;
      if (t === 'theme_dark') return 'theme-dark-mode';
      if (t === 'theme_matrix') return 'theme-matrix-mode';
      if (t === 'theme_gold') return 'theme-gold-mode';
      return '';
    },

    getEquippedFrame() {
      const f = this.profile.equipped_rewards?.frame;
      if (!f) return '';
      if (f === 'frame_neon') return 'frame-cyber';
      if (f === 'frame_red') return 'frame-red';
      return f.replace('_', '-');
    },

    activeBadges() {
      const equippedIds = this.profile.equipped_rewards?.badges || [];
      return this.itemsDB.badges.filter(b => equippedIds.includes(b.id));
    },

    getCardAccentClass() {
      return 'card-accent-purple';
    },
    getHeaderIcon() {
      if (this.isUniversity) return 'BankOutlined';
      if (this.isAdmin) return 'DashboardOutlined';
      return 'UserOutlined';
    },

    currentXp() {
      let total = 0;
      if (this.roadmapList) this.roadmapList.forEach(track => {
        if (track.nodes) track.nodes.forEach(n => {
          if (n.subtopics) n.subtopics.forEach(s => {
            if (s.done) total += (s.xpEarned || 50);
          });
        });
      });
      if (this.roadmapHistory) this.roadmapHistory.forEach(h => {
        let nodes = [];
        try {
          nodes = JSON.parse(h.roadmap_data);
        } catch (e) {
        }
        if (nodes) nodes.forEach(n => {
          if (n.subtopics) n.subtopics.forEach(s => {
            if (s.done) total += (s.xpEarned || 50);
          });
        });
      });
      return total;
    },

    userRank() {
      const xp = this.currentXp;
      if (xp < 500) return {label: 'Новичок', icon: 'seedling', color: '#10b981', min: 0, max: 500};
      else if (xp < 1500) return {label: 'Junior', icon: 'code', color: '#3b82f6', min: 500, max: 1500};
      else if (xp < 3000) return {label: 'Middle', icon: 'rocket', color: '#8b5cf6', min: 1500, max: 3000};
      else if (xp < 6000) return {label: 'Senior', icon: 'thunder', color: '#f59e0b', min: 3000, max: 6000};
      else if (xp < 10000) return {label: 'Lead', icon: 'fire', color: '#ef4444', min: 6000, max: 10000};
      else return {label: 'Guru', icon: 'crown', color: '#722ed1', min: 10000, max: 50000};
    },
    xpProgress() {
      const rank = this.userRank;
      return Math.min(Math.round(((this.currentXp - rank.min) / (rank.max - rank.min)) * 100), 100);
    },

    activeTrack() {
      if (!this.roadmapList || !this.roadmapList.length) return null;
      return this.roadmapList.find(t => t.id === this.profile.activeRoadmapId) || this.roadmapList[this.roadmapList.length - 1];
    },
    currentRoadmapProgress() {
      return this.activeTrack ? this.getTrackProgress(this.activeTrack) : 0;
    },
    currentRoadmapTitle() {
      return this.activeTrack ? this.activeTrack.role : 'Мое развитие';
    },
    nextRoadmapStep() {
      if (!this.activeTrack?.nodes) return 'Старт';
      for (const n of this.activeTrack.nodes) {
        if (n.subtopics?.some(s => !s.done)) return n.subtopics.find(s => !s.done).label;
      }
      return 'Все пройдено!';
    }
  },
  async mounted() {
    // 1. Сначала берем роль из локального хранилища (чтобы интерфейс не прыгал)
    const u = JSON.parse(localStorage.getItem('user') || '{}');
    this.userRole = u.role || 'graduate';

    // 2. Инициализируем лейаут. Если он битый - сбросится.
    this.initLayout();

    // 3. Загружаем данные профиля
    await this.loadData();

    // 4. ВАЖНО: Если API вернул другую роль (например, мы зашли как админ, а в storage был студент),
    // обновляем роль и ПЕРЕГРУЖАЕМ лейаут под новую роль.
    if (this.profile.role && this.profile.role !== this.userRole) {
        this.userRole = this.profile.role;
        this.initLayout(); // Перезагрузка виджетов под новую роль
    }

    // 5. Загружаем данные для конкретных ролей
    if (this.isStudent) {
        await Promise.all([this.loadSpecialties(), this.loadEmployment(), this.loadCompanies(), this.loadResumes(), this.loadRoadmapData(), this.loadRoadmapHistory()]);
    }
    if (this.isUniversity) { this.loadUniStats(); this.loadReports(); }
    if (this.isEmployer) { this.loadCompanies(); }
    if (this.isAdmin) { this.checkSystemHealth(); this.loadSystemLogs(); }

    this.loading = false;
  },
  methods: {
    initLayout() {
      const key = `profile_layout_${this.userRole}`;
      const saved = localStorage.getItem(key);
      let needsReset = false;

      if (saved) {
        try {
          this.layout = JSON.parse(saved);

          // ПРОВЕРКА 1: Если массивы вообще пустые (нет виджетов)
          if ((!this.layout.left || this.layout.left.length === 0) &&
              (!this.layout.right || this.layout.right.length === 0)) {
             needsReset = true;
          }

          // ПРОВЕРКА 2: Если студент, но нет главных виджетов
          if (this.isStudent && !this.layout.left.includes('info')) needsReset = true;

          // ПРОВЕРКА 3: Если админ, но нет админских виджетов
          if (this.isAdmin && !this.layout.left.includes('info')) needsReset = true;

        } catch (e) {
          needsReset = true;
        }
      } else {
        needsReset = true;
      }

      if (needsReset) {
        console.log('Layout is broken or empty. Resetting to default...');
        this.resetLayout();
      }
    },

    resetLayout() {
        // Жестко задаем виджеты по умолчанию для каждой роли
        if (this.isAdmin) {
            this.layout = { left: ['info', 'admin_notes'], right: ['admin_metrics', 'system_logs'] };
        } else if (this.isUniversity) {
            this.layout = { left: ['info'], right: ['uni_stats', 'uni_reports'] };
        } else if (this.isStudent) {
            this.layout = { left: ['info', 'inventory', 'roadmap'], right: ['career', 'resumes', 'history'] };
        } else if (this.isEmployer) {
            this.layout = { left: ['info'], right: [] }; // Для работодателя пока так
        } else {
            // Fallback
            this.layout = { left: ['info'], right: [] };
        }
        this.saveLayoutSettings();
    },
    resetLayout() {
      if (this.isAdmin) this.layout = {left: ['info', 'admin_notes'], right: ['admin_metrics', 'system_logs']};
      else if (this.isUniversity) this.layout = {left: ['info'], right: ['uni_stats', 'uni_reports']};
      else if (this.isStudent) this.layout = {
        left: ['info', 'inventory', 'roadmap'],
        right: ['career', 'resumes', 'history']
      };
      else this.layout = {left: ['info'], right: []};
      this.saveLayoutSettings();
    },
    openLayoutSettings() {
      this.tempLayout = JSON.parse(JSON.stringify(this.layout));
      this.showLayoutModal = true;
    },
    saveLayoutSettings() {
      this.layout = JSON.parse(JSON.stringify(this.tempLayout));
      localStorage.setItem(`profile_layout_${this.userRole}`, JSON.stringify(this.layout));
      this.showLayoutModal = false;
      message.success('Вид сохранен');
    },
    resetToDefault() {
      this.resetLayout();
    },
    getWidgetName(id) {
      return WIDGET_NAMES[id] || id;
    },

    getInventoryItems(tab) {
      return this.itemsDB[tab] || [];
    },
    isUnlocked(itemId) {
      return (this.profile.unlocked_rewards || []).includes(itemId);
    },
    isEquipped(itemId, tab) {
      if (tab === 'badges') {
        return (this.profile.equipped_rewards?.badges || []).includes(itemId);
      }
      const type = this.getEquipType(tab);
      return this.profile.equipped_rewards?.[type] === itemId;
    },
    getEquipType(tab) {
      if (tab === 'frames') return 'frame';
      if (tab === 'effects') return 'effect';
      if (tab === 'themes') return 'theme';
      return 'badge';
    },
    // === СОХРАНЕНИЕ БЕЙДЖЕЙ ===
    async toggleEquip(itemId, type) {
      if (!this.isUnlocked(itemId)) return message.warn('Сначала достигните нужного уровня!');
      if (!this.profile.equipped_rewards) this.profile.equipped_rewards = {};

      // 1. Копируем профиль
      this.form = JSON.parse(JSON.stringify(this.profile));
      if (!this.form.first_name) this.form.first_name = '';
      if (!this.form.last_name) this.form.last_name = '';

      if (type === 'badge') {
        let badges = [...(this.profile.equipped_rewards.badges || [])];

        if (badges.includes(itemId)) {
          badges = badges.filter(b => b !== itemId);
        } else {
          if (badges.length >= 2) return message.warn('Максимум 2 бейджа!');
          badges.push(itemId);
        }

        this.profile.equipped_rewards.badges = badges;
        this.form.equipped_rewards = this.profile.equipped_rewards;
        await this.saveProfile(true);
        return;
      }

      const isWearing = this.profile.equipped_rewards[type] === itemId;
      const newItem = isWearing ? null : itemId;
      this.profile.equipped_rewards[type] = newItem;

      await this.syncEquip(type, newItem);
    },
    // === УЛУЧШЕННОЕ СОХРАНЕНИЕ (ДЛЯ ВСЕХ РОЛЕЙ) ===
    async saveProfile(silent = false) {
      if (!silent) this.saving = true;
      try {
        // Очистка обязательных полей от null
        if (!this.form.first_name) this.form.first_name = '';
        if (!this.form.last_name) this.form.last_name = '';

        this.form.equipped_rewards = this.profile.equipped_rewards;

        // Выбор правильного эндпоинта
        let endpoint = '/graduates/me';
        if (this.isEmployer) endpoint = '/recruiters/me';
        if (this.isUniversity) endpoint = '/university/me';
        if (this.isAdmin) endpoint = '/admin/me';

        const r = await api.put(endpoint, this.form);
        this.profile = {...this.profile, ...r.data};
        if (!silent) {
          message.success('Сохранено');
          this.isEditing = false;
        }
      } catch (e) {
        console.error(e);
        // Если админ, не показываем ошибку 500, так как таблицы может не быть
        if (this.isAdmin) {
          message.warn('Данные обновлены локально (Admin API ограничен)');
          this.profile = {...this.profile, ...this.form};
          this.isEditing = false;
        } else {
          message.error('Ошибка сохранения');
        }
      } finally {
        if (!silent) this.saving = false;
      }
    },
    async syncEquip(type, value) {
      try {
        // Для админа и ВУЗа пока нет магазина, но логику оставим безопасной
        let endpoint = '/graduates/equip';
        if (this.isEmployer) endpoint = '/recruiters/equip';

        if (this.isStudent || this.isEmployer) {
          await api.post(endpoint, {type, itemId: value});
          message.success('Сохранено');
        }
      } catch (e) {
        message.error('Ошибка сохранения');
      }
    },

    // --- ЭФФЕКТЫ ---
    getConfettiStyle(n) {
      const angle = Math.random() * 360;
      const distance = 60 + Math.random() * 80;
      const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ffd700'];
      return {
        '--dir-x': Math.cos(angle * Math.PI / 180) * distance + 'px',
        '--dir-y': Math.sin(angle * Math.PI / 180) * distance + 'px',
        backgroundColor: colors[n % colors.length],
        animationDelay: (Math.random() * 0.2) + 's',
        left: '50%',
        top: '50%'
      };
    },
    getSnowStyle(n) {
      return {
        left: (Math.random() * 100) + '%',
        animationDelay: '-' + (Math.random() * 5) + 's',
        animationDuration: (Math.random() * 3 + 4) + 's',
        opacity: Math.random() * 0.6 + 0.4,
        fontSize: (Math.random() * 12 + 10) + 'px'
      };
    },
    getDarkStarStyle(n) {
      return {
        top: Math.random() * 100 + '%',
        left: Math.random() * 100 + '%',
        animationDuration: (Math.random() * 2 + 1.5) + 's',
        animationDelay: Math.random() * 2 + 's',
        opacity: Math.random()
      };
    },
    // ---------------

    async loadRoadmapData() {
      try {
        const r = await api.get('/chat/roadmap');
        this.roadmapList = r.data.list || [{id: 'l', nodes: r.data.nodes || []}];
        if (r.data.activeId) this.profile.activeRoadmapId = r.data.activeId;
      } catch (e) {
      }
    },
    getTrackProgress(track) {
      let t = 0, d = 0;
      track.nodes?.forEach(n => {
        if (n.subtopics) {
          t += n.subtopics.length;
          d += n.subtopics.filter(s => s.done).length;
        } else {
          t++;
          if (n.done) d++;
        }
      });
      return t === 0 ? 0 : Math.round((d / t) * 100);
    },
    getRankIcon(name) {
      const map = {
        'seedling': 'SmileTwoTone',
        'code': 'CodeOutlined',
        'rocket': 'RocketFilled',
        'thunder': 'ThunderboltFilled',
        'fire': 'FireFilled',
        'crown': 'CrownFilled'
      };
      return map[name] || 'StarOutlined';
    },
    async loadData() {
      try {
        const r = await api.get(this.isAdmin ? '/admin/me' : (this.isUniversity ? '/university/me' : (this.isEmployer ? '/recruiters/me' : '/graduates/me')));
        this.profile = r.data || {}; // FIX: Fallback object
        if (typeof this.profile.portfolio_links === 'string') this.profile.portfolio_links = JSON.parse(this.profile.portfolio_links);
        if (this.profile.birth_date) this.profile.birth_date = this.profile.birth_date.split('T')[0];

        if (!this.profile.equipped_rewards) this.profile.equipped_rewards = {};
        if (!this.profile.equipped_rewards.badges) this.profile.equipped_rewards.badges = [];
      } catch (e) {
      }
    },
    enableEdit() {
      this.form = JSON.parse(JSON.stringify(this.profile));
      if (!this.form.portfolio_links) this.form.portfolio_links = [];
      if (!this.form.first_name) this.form.first_name = '';
      if (!this.form.last_name) this.form.last_name = '';
      this.isEditing = true;
    },
    cancelEdit() {
      this.isEditing = false;
    },

    async handleAvatarUpload({file}) {
      await this.genericUpload(file, '/graduates/avatar', 'avatar_url');
    },
    async handleLogoUpload({file}) {
      await this.genericUpload(file, '/university/logo', 'university_logo');
    },
    async handleStampUpload({file}) {
      await this.genericUpload(file, '/university/stamp', 'stamp_url');
    },
    async genericUpload(file, url, field) {
      const fd = new FormData();
      fd.append(field === 'avatar_url' ? 'avatar' : 'file', file);
      try {
        const r = await api.post(url, fd);
        this.profile[field] = r.data[field] || r.data.avatar_url;
        this.form[field] = this.profile[field];
        message.success('Загружено');
      } catch (e) {
      }
    },
    getAvatarUrl(u) {
      return u ? `http://localhost:4000${u}` : null;
    },
    getFileUrl(p) {
      return `http://localhost:4000${p}`;
    },
    formatDate(d) {
      return d ? new Date(d).toLocaleDateString() : '—';
    },
    formatGender(g) {
      return g === 'male' ? 'Мужской' : (g === 'female' ? 'Женский' : '—');
    },
    addLink() {
      this.form.portfolio_links.push({type: 'github', url: ''});
    },
    removeLink(i) {
      this.form.portfolio_links.splice(i, 1);
    },
    getIconForType(t) {
      return ({github: 'GithubOutlined', telegram: 'MessageOutlined'})[t] || 'LinkOutlined';
    },
    getLabelForType(t) {
      return ({github: 'GitHub', telegram: 'TG'})[t] || 'Ссылка';
    },
    async loadSpecialties() {
      try {
        const r = await api.get('/dict/specialties');
        this.specialties = r.data;
      } catch (e) {
      }
    },
    async loadEmployment() {
      try {
        const r = await api.get('/employment');
        this.employmentRecords = r.data;
      } catch (e) {
      }
    },
    async loadCompanies() {
      try {
        const r = await api.get('/dict/companies');
        this.companies = r.data;
      } catch (e) {
      }
    },
    async loadResumes() {
      try {
        const r = await api.get('/resumes');
        this.resumes = r.data;
      } catch (e) {
      }
    },
    async loadUniStats() {
      try {
        const r = await api.get('/university/stats');
        this.uniStats = r.data;
      } catch (e) {
      }
    },
    async loadReports() {
      try {
        const r = await api.get('/university/reports');
        this.savedReports = r.data;
      } catch (e) {
      }
    },
    async loadRoadmapHistory() {
      try {
        const r = await api.get('/chat/roadmap/history');
        this.roadmapHistory = r.data;
      } catch (e) {
      }
    },
    async checkSystemHealth() {
      this.systemHealth = {status: 'ok'};
    },
    async loadSystemLogs() {
      try {
        const r = await api.get('/admin/logs');
        this.systemLogs = r.data.slice(0, 10);
      } catch (e) {
      }
    },
    saveNotes() {
      localStorage.setItem('admin_notes', this.adminNotes);
      message.success('Сохранено');
    },
    openJobForm() {
      this.jobForm = {id: null, is_current: true};
      this.showJobForm = true;
    },
    editJob(j) {
      this.jobForm = {...j};
      this.showJobForm = true;
    },
    async addJob() {
      try {
        if (this.jobForm.id) await api.put(`/employment/${this.jobForm.id}`, this.jobForm); else await api.post('/employment', this.jobForm);
        this.showJobForm = false;
        this.loadEmployment();
      } catch (e) {
      }
    },
    async uploadResumeFile({file}) {
      const fd = new FormData();
      fd.append('file', file);
      await api.post('/resumes', fd);
      this.loadResumes();
    },
    async deleteResume(id) {
      await api.delete(`/resumes/${id}`);
      this.loadResumes();
    }
  }
};
</script>

<style scoped>
/* =======================================================
   БАЗОВЫЕ СТИЛИ (FIX ПАДДИНГОВ И ФУТЕРА)
   ======================================================= */
.page-wrapper {
  min-height: 100vh;
  background: #f3f4f6;
  display: flex;
  justify-content: center;
  padding: 30px 20px 0 20px;
  position: relative;
  overflow-x: hidden;
  font-family: 'Inter', sans-serif;
  box-sizing: border-box;
}

/* ФОНЫ ТЕМ (FIXED) */
.theme-bg-layer {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
}

.blobs-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
}

.blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.5;
}

.blob-1 {
  background: #a855f7;
  width: 400px;
  height: 400px;
  top: -100px;
  left: -100px;
}

.blob-2 {
  background: #3b82f6;
  width: 300px;
  height: 300px;
  bottom: -50px;
  right: -50px;
}

.blob-3 {
  background: #2dd4bf;
  width: 250px;
  height: 250px;
  top: 30%;
  left: 40%;
  opacity: 0.3;
}

.content-container {
  width: 100%;
  max-width: 1200px;
  position: relative;
  z-index: 1;
  margin-bottom: 0;
}

/* Основные карточки */
.glass-card {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px);
  border: 1px solid white;
  border-radius: 24px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.05);
  padding: 25px;
  transition: all 0.3s ease;
}

.main-card {
  text-align: center;
  padding-bottom: 35px;
  margin-bottom: 25px;
  position: relative;
  overflow: visible;
}

/* Шапка карточки */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  padding-bottom: 12px;
}

.card-header h3 {
  margin: 0;
  color: #1f2937;
  font-weight: 800;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 1.25rem;
}

/* Кнопки управления */
.top-actions {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 50;
  display: flex;
  gap: 8px;
}

.btn-glass-edit {
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid #e5e7eb;
  padding: 8px 16px;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 600;
  color: #4b5563;
  transition: 0.2s;
}

.btn-glass-edit:hover {
  background: white;
  color: #2563eb;
  transform: translateY(-2px);
}

.settings-btn {
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid #e5e7eb;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  cursor: pointer;
  color: #6b7280;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: 0.2s;
}

.settings-btn:hover {
  color: #2563eb;
  transform: rotate(90deg);
}

/* Аватар блок */
.avatar-column {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
}

.avatar-stack {
  position: relative;
  width: 180px;
  height: 180px;
  margin-bottom: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.progress-ring {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 2;
  pointer-events: none;
}

.progress-ring-decorative {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 4px solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.05);
  z-index: 2;
  pointer-events: none;
}

/* Контейнер картинки аватара */
.avatar-img-box {
  position: relative;
  width: 135px;
  height: 135px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 5;
  background: #fff;
  transition: 0.3s;
}

.main-avatar {
  z-index: 6;
  border: 4px solid #fff;
  transition: 0.3s;
}

/* Загрузка фото */
.avatar-upload-pos {
  position: absolute;
  bottom: 5px;
  left: 5px;
  z-index: 100;
}

.btn-mini-edit {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: #2563eb;
  color: white;
  border: 2px solid white;
  cursor: pointer;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: 0.2s;
}

.btn-mini-edit:hover {
  transform: scale(1.1);
  background: #1d4ed8;
}

/* Ранг Орб */
.rank-orb {
  position: absolute;
  bottom: 5px;
  right: 15px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.3rem;
  border: 3px solid white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 20;
  transition: transform 0.3s;
}

.rank-orb:hover {
  transform: scale(1.1) rotate(10deg);
}

/* Инфо о пользователе */
.name-block {
  text-align: center;
  z-index: 10;
  position: relative;
}

.full-name {
  font-size: 1.8rem;
  font-weight: 800;
  color: #111827;
  margin: 0 0 8px;
  letter-spacing: -0.5px;
}

.xp-status {
  margin-top: 10px;
  font-size: 0.9rem;
  background: rgba(255, 255, 255, 0.7);
  padding: 5px 15px;
  border-radius: 20px;
  display: inline-flex;
  align-items: center;
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.xp-divider {
  margin: 0 8px;
  color: #cbd5e1;
}

/* Сетка виджетов */
.static-grid-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 25px;
  align-items: start;
  margin-top: 20px;
}

@media (max-width: 900px) {
  .static-grid-layout {
    grid-template-columns: 1fr;
  }
}

.grid-column {
  display: flex;
  flex-direction: column;
  gap: 25px;
}

.widget-wrapper {
  width: 100%;
}

/* Анимация появления */
.fade-in {
  animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Инфо поля */
.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
  margin-bottom: 20px;
}

.info-cell {
  display: flex;
  flex-direction: column;
  background: #f8fafc;
  padding: 10px;
  border-radius: 10px;
}

.info-cell.full-width {
  grid-column: span 2;
}

.label {
  color: #6b7280;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}

.value {
  font-weight: 700;
  color: #1f2937;
  font-size: 0.95rem;
}

.modern-link-tag {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  padding: 6px 12px;
  border-radius: 8px;
  color: #374151;
  font-weight: 600;
  text-decoration: none;
  font-size: 0.85rem;
  transition: 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.modern-link-tag:hover {
  border-color: #2563eb;
  color: #2563eb;
  background: #eff6ff;
}

.info-view .value.highlight {
  color: #2563eb;
}

.about-section h4, .links-section h4 {
  font-size: 0.9rem;
  font-weight: 700;
  color: #4b5563;
  margin-bottom: 10px;
  margin-top: 15px;
}

.about-text {
  color: #374151;
  font-size: 0.9rem;
  line-height: 1.5;
  white-space: pre-line;
}

/* Uploads */
.uploads-section {
  background: #f9fafb;
  padding: 10px;
  border-radius: 8px;
  border: 1px dashed #e5e7eb;
  margin-top: 10px;
}

.upload-label {
  font-size: 0.8rem;
  color: #6b7280;
  margin-bottom: 8px;
  font-weight: 600;
}

.upload-row {
  display: flex;
  gap: 10px;
}

.docs-preview-row {
  display: flex;
  gap: 10px;
  margin-top: 5px;
}

.doc-mini {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 0.7rem;
  color: #9ca3af;
}

.doc-mini img {
  width: 40px;
  height: 40px;
  object-fit: contain;
  border: 1px solid #e5e7eb;
  background: white;
  border-radius: 4px;
  margin-bottom: 2px;
}

/* Акценты карточек */
.card-accent-purple {
  border-top: 4px solid #a855f7;
}

.card-accent-blue {
  border-top: 4px solid #3b82f6;
}

.card-accent-orange {
  border-top: 4px solid #f97316;
}

/* === ИНВЕНТАРЬ === */
.inv-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  padding: 4px;
  background: #f3f4f6;
  border-radius: 12px;
  overflow-x: auto;
}

.inv-tabs span {
  cursor: pointer;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 0.85rem;
  color: #6b7280;
  font-weight: 600;
  transition: all 0.2s;
  white-space: nowrap;
  flex: 1;
  text-align: center;
}

.inv-tabs span:hover {
  color: #111827;
  background: rgba(255, 255, 255, 0.5);
}

.inv-tabs span.active {
  background: white;
  color: #2563eb;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
}

.inv-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
  gap: 12px;
  max-height: 250px;
  overflow-y: auto;
  padding: 2px;
}

.inv-item {
  background: white;
  border: 1px solid #f3f4f6;
  border-radius: 16px;
  padding: 15px 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.inv-item:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.06);
  border-color: #bfdbfe;
}

.inv-item.equipped {
  border: 2px solid #2563eb;
  background: #eff6ff;
}

.inv-item.locked {
  opacity: 0.6;
  grayscale: 1;
  cursor: not-allowed;
}

.inv-item-status-icon {
  position: absolute;
  top: 5px;
  right: 5px;
  color: #2563eb;
  font-size: 1rem;
}

.inv-icon {
  font-size: 2rem;
  color: #4b5563;
  transition: 0.2s;
}

.inv-item:hover .inv-icon {
  transform: scale(1.1);
  color: #2563eb;
}

.inv-name {
  font-size: 0.75rem;
  font-weight: 600;
  color: #4b5563;
  text-align: center;
  line-height: 1.2;
}

/* Бейджи (Восстановлены стили) */
.equipped-badges {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.equipped-badge-item {
  padding: 6px 14px;
  border-radius: 20px;
  font-weight: 700;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  background: white;
  color: #374151;
  border: 1px solid #e5e7eb;
}

.badges-wrapper {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.specialty-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px;
  border-radius: 30px;
  font-weight: 700;
  font-size: 0.9rem;
  background: #e0f2fe;
  color: #0284c7;
}

.admin-badge {
  background: #374151 !important;
  color: #f3f4f6 !important;
}

.uni-badge {
  background: #059669 !important;
  color: #fff !important;
}

/* Цвета бейджей */
.badge_top, .badge_star, .crown_animated {
  background: linear-gradient(135deg, #fbbf24, #d97706);
  color: white;
  border: none;
}

.badge_guru, .badge_puzzle {
  background: linear-gradient(135deg, #8b5cf6, #6d28d9);
  color: white;
  border: none;
}

.badge_fast, .badge_rocket {
  background: linear-gradient(135deg, #f87171, #dc2626);
  color: white;
  border: none;
}

.badge_book {
  background: linear-gradient(135deg, #60a5fa, #2563eb);
  color: white;
  border: none;
}

/* Карьера и Резюме */
.timeline-card, .resume-item, .history-item {
  background: white;
  border-radius: 12px;
  border: 1px solid #f0f0f0;
  padding: 12px 16px;
  margin-bottom: 10px;
  transition: 0.2s;
  display: flex;
  flex-direction: column;
}

.timeline-card:hover, .resume-item:hover, .history-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.job-company {
  font-weight: 800;
  color: #1e293b;
  font-size: 1rem;
}

.job-pos {
  color: #3b82f6;
  font-weight: 600;
  font-size: 0.9rem;
  margin-top: 2px;
}

.job-meta {
  font-size: 0.8rem;
  color: #9ca3af;
  margin-top: 4px;
  display: flex;
  justify-content: space-between;
}

.btn-add-job {
  background: #eff6ff;
  border: none;
  color: #2563eb;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* === РЕЗЮМЕ === */
.resume-item {
  flex-direction: row;
  align-items: center;
  gap: 12px;
}

.res-info {
  flex: 1;
  overflow: hidden;
}

.res-name {
  font-weight: 600;
  color: #374151;
  font-size: 0.95rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.res-date {
  font-size: 0.75rem;
  color: #9ca3af;
}

.res-actions {
  display: flex;
  gap: 16px;
}

.history-item {
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
}

.h-title {
  font-weight: 700;
  color: #374151;
  font-size: 0.95rem;
}

.h-date {
  font-size: 0.75rem;
  color: #9ca3af;
}

.h-score {
  font-weight: 800;
  color: #6366f1;
  background: #e0e7ff;
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 0.85rem;
}

.h-score.done {
  color: #059669;
  background: #d1fae5;
}

/* Roadmap Widget Styles (ENHANCED) */
.roadmap-widget-content {
  text-align: center;
  padding: 10px 0;
  position: relative;
}

.roadmap-enhanced {
  padding: 20px;
  border-radius: 16px;
  background: white;
  box-shadow: 0 4px 20px rgba(139, 92, 246, 0.1);
  border: 1px solid #f3f4f6;
  overflow: hidden;
}

.roadmap-card-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.05) 0%, rgba(59, 130, 246, 0.05) 100%);
  z-index: 0;
}

.roadmap-title {
  font-size: 1.1rem;
  font-weight: 800;
  color: #374151;
  margin-bottom: 15px;
  position: relative;
  z-index: 1;
}

.circle-wrapper {
  margin: 0 auto 15px;
  width: 110px;
  position: relative;
  z-index: 1;
}

.enhanced-circle {
  filter: drop-shadow(0 4px 6px rgba(139, 92, 246, 0.2));
}

.rp-next {
  font-size: 0.95rem;
  color: #6b7280;
  position: relative;
  z-index: 1;
}

.rp-next strong {
  color: #8b5cf6;
  display: block;
  margin-top: 4px;
  font-size: 1.1rem;
}

/* Layout Editor Grid */
.layout-editor-container {
  padding: 20px;
}

.le-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
  margin: 15px 0;
}

.le-column {
  background: #f9fafb;
  padding: 15px;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  min-height: 250px;
}

.le-col-header {
  font-weight: 700;
  margin-bottom: 10px;
  color: #6b7280;
  text-align: center;
  font-size: 0.9rem;
}

.le-item {
  background: white;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  cursor: move;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
}

.le-ghost {
  opacity: 0.5;
  background: #e6f7ff;
  border: 1px dashed #1890ff;
}

.reset-block {
  text-align: center;
  margin-top: 15px;
}


/* =======================================================
   1. РАМКИ
   ======================================================= */
.frame-blue .main-avatar {
  border: 4px solid #3b82f6;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.2);
}

.frame-green .main-avatar {
  border: 4px dashed #10b981;
}

.frame-gold .main-avatar {
  border: 4px solid #fbbf24;
  box-shadow: 0 0 15px rgba(251, 191, 36, 0.6);
  animation: pulse-gold 2s infinite;
}

.frame-red .main-avatar {
  border: 4px solid #dc2626;
  box-shadow: 0 0 15px #ef4444, inset 0 0 10px #7f1d1d;
  border-radius: 40% !important;
}

.frame-cyber .main-avatar {
  border: 4px solid #06b6d4;
  box-shadow: 0 0 15px #06b6d4, 0 0 30px #22d3ee;
  border-radius: 10px !important;
}

.frame-royal .main-avatar {
  border: 5px solid #ffd700;
  box-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
}

.royal-crown-container {
  position: absolute;
  top: -55px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 25;
  filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.2));
  animation: float-crown 3s ease-in-out infinite;
}

@keyframes float-crown {
  0%, 100% {
    transform: translateX(-50%) translateY(0);
  }
  50% {
    transform: translateX(-50%) translateY(-5px);
  }
}


/* =======================================================
   2. ЭФФЕКТЫ
   ======================================================= */
.effects-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 8;
  overflow: visible;
}

.confetti-wrapper {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
}

.confetti-piece {
  position: absolute;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  animation: confetti-explode 4s ease-out infinite;
}

@keyframes confetti-explode {
  0% {
    transform: translate(-50%, -50%) scale(0.5);
    opacity: 1;
  }
  20% {
    transform: translate(var(--dir-x), var(--dir-y)) scale(1) rotate(720deg);
    opacity: 0;
  }
  100% {
    transform: translate(var(--dir-x), var(--dir-y)) scale(1) rotate(720deg);
    opacity: 0;
  }
}

.snow-wrapper {
  position: absolute;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: 50%;
}

.snowflake {
  position: absolute;
  top: -10px;
  color: white;
  text-shadow: 0 0 5px #bae6fd;
  animation: snow-fall linear infinite;
}

@keyframes snow-fall {
  0% {
    transform: translateY(-20px);
  }
  100% {
    transform: translateY(180px);
  }
}

.fire-wrapper {
  position: absolute;
  bottom: -10px;
  left: 50%;
  transform: translateX(-50%);
  width: 100px;
  height: 60px;
  display: flex;
  justify-content: center;
  opacity: 0.8;
}

.fire-flame {
  width: 20px;
  height: 20px;
  background: linear-gradient(to top, #ef4444, #f59e0b);
  border-radius: 50% 50% 20% 20%;
  margin: 0 -5px;
  animation: flame-flicker 1s infinite alternate;
  filter: blur(2px);
}

.fire-flame:nth-child(2) {
  height: 30px;
  animation-delay: 0.2s;
}

.fire-flame:nth-child(3) {
  animation-delay: 0.5s;
}

@keyframes flame-flicker {
  0% {
    transform: scaleY(1);
    opacity: 0.8;
  }
  100% {
    transform: scaleY(1.3);
    opacity: 1;
  }
}

.lightning-wrapper {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  z-index: 10;
}

.lightning-bolt {
  position: absolute;
  width: 80px;
  height: 80px;
  filter: drop-shadow(0 0 8px #60a5fa);
  animation: lightning-flash 3s infinite;
  fill: #e0f2fe;
  stroke: #3b82f6;
  stroke-width: 2px;
}

.left-bolt {
  top: 10px;
  left: -20px;
  transform: rotate(-15deg);
}

.right-bolt {
  top: 10px;
  right: -20px;
  transform: rotate(15deg);
}

@keyframes lightning-flash {
  0%, 85% {
    opacity: 0;
  }
  86% {
    opacity: 1;
    transform: scale(1.1);
  }
  88% {
    opacity: 0;
  }
  90% {
    opacity: 0.8;
    transform: scale(1);
  }
  92% {
    opacity: 0;
  }
  100% {
    opacity: 0;
  }
}

.matrix-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.5);
  z-index: 7;
  display: flex;
  justify-content: center;
  gap: 5px;
}

.matrix-code-line {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  font-weight: bold;
  color: #22c55e;
  writing-mode: vertical-rl;
  text-orientation: upright;
  animation: matrix-drop 2s linear infinite;
  opacity: 0.8;
}

@keyframes matrix-drop {
  from {
    transform: translateY(-100%);
  }
  to {
    transform: translateY(100%);
  }
}


/* =======================================================
   3. ИСПРАВЛЕНИЕ ТЕМ (GLOBAL OVERRIDES)
   ======================================================= */

/* 3.1 ТЕМА МАТРИЦА */
.theme-matrix-mode {
  background-color: transparent !important;
  color: #22c55e !important;
}

.matrix-bg-rain {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
  background-color: #000;
}

.matrix-bg-rain span {
  position: absolute;
  color: #0f0;
  font-family: monospace;
  animation: rain linear infinite;
  opacity: 0.5;
}

@keyframes rain {
  to {
    top: 100%;
    opacity: 0;
  }
}

.theme-matrix-mode .glass-card {
  background: rgba(0, 10, 0, 0.95) !important;
  border: 1px solid #22c55e !important;
  box-shadow: 0 0 15px rgba(34, 197, 94, 0.2);
}

/* Текст */
.theme-matrix-mode h1, .theme-matrix-mode h3, .theme-matrix-mode .label, .theme-matrix-mode .value,
.theme-matrix-mode .inv-name, .theme-matrix-mode .job-company, .theme-matrix-mode .full-name,
.theme-matrix-mode .res-name, .theme-matrix-mode .h-title, .theme-matrix-mode .roadmap-title,
.theme-matrix-mode .rp-next, .theme-matrix-mode .rp-next strong {
  color: #4ade80 !important;
  font-family: 'Courier New', monospace;
  text-shadow: 0 0 5px #22c55e;
}

.theme-matrix-mode .value {
  color: #fff !important;
}

/* FIX: О себе в Матрице */
.theme-matrix-mode .about-text {
  color: #fff !important;
  font-family: 'Courier New', monospace;
}

.theme-matrix-mode .about-section h4 {
  color: #4ade80 !important;
}

/* Инвентарь, Карьера, История (Черный фон) */
.theme-matrix-mode .inv-item, .theme-matrix-mode .timeline-card,
.theme-matrix-mode .resume-item, .theme-matrix-mode .history-item {
  background: #000 !important;
  border: 1px solid #15803d !important;
}

/* НОВЫЙ ИНФО БЛОК В МАТРИЦЕ */
.theme-matrix-mode .info-cell {
  background: #000 !important;
  border: 1px solid #15803d;
}

.theme-matrix-mode .roadmap-enhanced {
  background: #000 !important;
  border: 1px solid #22c55e;
}

.theme-matrix-mode .inv-tabs {
  background: #000 !important;
  border: 1px solid #15803d;
}

.theme-matrix-mode .inv-tabs span {
  background: #000 !important;
  color: #22c55e !important;
  border: 1px solid #15803d;
}

.theme-matrix-mode .inv-tabs span.active {
  background: #22c55e !important;
  color: #000 !important;
}

/* ТЕКСТ В КРУГЕ БЕЛЫЙ */
.theme-matrix-mode :deep(.ant-progress-text) {
  color: #ffffff !important;
  font-weight: 800;
  text-shadow: 0 0 5px #000;
}

/* ПРОГРЕСС БАР ВОКРУГ АВАТАРКИ */
.theme-matrix-mode .progress-ring :deep(.ant-progress-circle-path) {
  stroke: #22c55e !important;
  stroke-width: 6px !important;
}

.theme-matrix-mode .progress-ring :deep(.ant-progress-circle-trail) {
  stroke: #064e3b !important;
}

/* XP и РАНГ */
.theme-matrix-mode .xp-status {
  background: #000 !important;
  border: 1px solid #22c55e !important;
  box-shadow: 0 0 10px rgba(34, 197, 94, 0.3);
}

.theme-matrix-mode .xp-text {
  color: #4ade80 !important;
}

.theme-matrix-mode .xp-divider {
  color: #22c55e !important;
}

.theme-matrix-mode .rank-orb {
  border-color: #22c55e !important;
  box-shadow: 0 0 10px #22c55e;
  background: #000 !important;
  color: #22c55e !important;
}


/* 3.2 ТЕМНАЯ ТЕМА (ЭСТЕТИКА) */
.theme-dark-mode {
  background-color: transparent !important;
  color: #e5e7eb;
}

.dark-bg-stars {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
  background-color: #111827;
}

/* Динамика: Звезды */
.dark-star {
  position: absolute;
  width: 2px;
  height: 2px;
  background: white;
  border-radius: 50%;
  animation: twinkle infinite alternate;
}

@keyframes twinkle {
  0% {
    opacity: 0.3;
    transform: scale(0.8);
  }
  100% {
    opacity: 1;
    transform: scale(1.2);
  }
}

.theme-dark-mode .glass-card {
  background: #1f2937 !important;
  border: 1px solid #374151;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

/* Исправление цвета текста на белый */
.theme-dark-mode h1, .theme-dark-mode h3, .theme-dark-mode .value, .theme-dark-mode .full-name,
.theme-dark-mode .job-company, .theme-dark-mode .h-title, .theme-dark-mode .roadmap-title,
.theme-dark-mode .res-name, .theme-dark-mode .rp-next strong {
  color: #f3f4f6 !important;
}

/* FIX: О себе в темной теме (белый текст) */
.theme-dark-mode .about-text {
  color: #f3f4f6 !important;
}

.theme-dark-mode .about-section h4 {
  color: #e5e7eb !important;
}

.theme-dark-mode .label, .theme-dark-mode .res-date, .theme-dark-mode .job-meta,
.theme-dark-mode .h-date, .theme-dark-mode .job-pos, .theme-dark-mode .rp-next span {
  color: #9ca3af !important;
}

/* Ранг и XP в темной теме */
.theme-dark-mode .xp-status {
  background: rgba(0, 0, 0, 0.4) !important;
  border: 1px solid #4b5563 !important;
  color: #e5e7eb !important;
}

.theme-dark-mode .rank-orb {
  border-color: #4b5563 !important;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.5);
}

.theme-dark-mode .inv-item, .theme-dark-mode .timeline-card, .theme-dark-mode .resume-item, .theme-dark-mode .history-item {
  background: #374151 !important;
  border-color: #4b5563 !important;
  color: #e5e7eb;
}

/* НОВЫЙ ИНФО БЛОК В ТЕМНОЙ */
.theme-dark-mode .info-cell {
  background: #374151 !important;
}

.theme-dark-mode .roadmap-enhanced {
  background: #1f2937 !important;
  border-color: #4b5563;
}

.theme-dark-mode .inv-tabs {
  background: #374151;
}

.theme-dark-mode .inv-tabs span {
  color: #9ca3af;
}

.theme-dark-mode .inv-tabs span.active {
  background: #4b5563;
  color: white;
}

.theme-dark-mode .btn-glass-edit, .theme-dark-mode .settings-btn {
  background: #374151 !important;
  color: #e5e7eb !important;
  border-color: #4b5563 !important;
}

.theme-dark-mode .btn-glass-edit:hover, .theme-dark-mode .settings-btn:hover {
  background: #4b5563 !important;
  color: white !important;
}

/* Белые проценты в Мое развитие */
.theme-dark-mode :deep(.ant-progress-text) {
  color: #ffffff !important;
}

.theme-dark-mode .ant-progress-inner {
  background-color: #4b5563 !important;
}


/* 3.3 ЗОЛОТАЯ ТЕМА */
.theme-gold-mode {
  background: #fffbeb !important;
}

.theme-gold-mode .glass-card {
  background: linear-gradient(135deg, #fffbeb, #fff7ed) !important;
  border: 1px solid #fbbf24;
}

.theme-gold-mode h1, .theme-gold-mode h3 {
  color: #92400e !important;
}

.theme-gold-mode .inv-item.equipped {
  background: #fff7ed;
  border-color: #fbbf24;
}

.gold-particle {
  position: absolute;
  color: #fbbf24;
  animation: float-dust 10s infinite;
}

@keyframes float-dust {
  0% {
    transform: translateY(100vh) rotate(0deg);
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
  100% {
    transform: translateY(-10vh) rotate(360deg);
    opacity: 0;
  }
}

</style>