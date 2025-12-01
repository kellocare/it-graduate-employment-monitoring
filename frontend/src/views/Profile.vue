<template>
  <div class="page-wrapper" :class="getThemeBackgroundClass">
    <!-- === ФОНОВЫЕ ЭФФЕКТЫ ТЕМ === -->
    <div v-if="currentTheme === 'theme_matrix'" class="matrix-bg-rain">
      <span v-for="i in 20" :key="i" :style="{ left: Math.random() * 100 + '%', animationDuration: Math.random() * 2 + 1 + 's', animationDelay: Math.random() * 2 + 's' }">10</span>
    </div>
    <div v-if="currentTheme === 'theme_gold'" class="gold-bg-dust">
      <div v-for="i in 15" :key="i" class="gold-particle" :style="{ top: Math.random() * 100 + '%', left: Math.random() * 100 + '%' }"></div>
    </div>

    <!-- Стандартные блобы (если нет темы) -->
    <div class="blobs-container" v-if="!currentTheme">
      <div class="blob blob-1"></div>
      <div class="blob blob-2"></div>
      <div class="blob blob-3"></div>
    </div>

    <div class="content-container">
      <a-spin :spinning="loading" tip="Загрузка профиля...">

        <!-- === 1. ШАПКА ПРОФИЛЯ === -->
        <div class="glass-card main-card fade-in" :class="[getThemeClass, {'admin-theme': isAdmin, 'uni-theme': isUniversity}]">
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
            <!-- СЛОЙ АВАТАРА И ЭФФЕКТОВ -->
            <div class="avatar-stack">

              <!-- Прогресс (Студент) -->
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

              <!-- Ранг (Студент) -->
              <div v-if="isStudent" class="rank-orb" :style="{ background: userRank.color }" :title="userRank.label">
                 <component :is="getRankIcon(userRank.icon)" />
              </div>

              <!-- ЭФФЕКТЫ (Частицы, Молнии и т.д.) -->
              <div class="effects-container">
                  <!-- Конфетти -->
                  <div v-if="currentEffect === 'effect_confetti'" class="confetti-wrapper">
                      <div v-for="n in 20" :key="n" class="confetti-piece" :style="getConfettiStyle(n)"></div>
                  </div>
                  <!-- Холод -->
                  <div v-if="currentEffect === 'effect_snow'" class="snow-wrapper">
                      <div v-for="n in 15" :key="n" class="snowflake" :style="getSnowStyle(n)">❄</div>
                  </div>
                  <!-- Молнии -->
                  <div v-if="currentEffect === 'effect_lightning'" class="lightning-wrapper">
                      <svg viewBox="0 0 100 100" class="lightning-bolt"><path d="M55 0L20 60h25l-10 40 45-55H50z" fill="#fef08a" /></svg>
                  </div>
              </div>

              <!-- АВАТАРКА -->
              <div class="avatar-img-box" :class="getEquippedFrame">
                <!-- Матрица (внутри круга) -->
                <div v-if="currentEffect === 'effect_matrix'" class="matrix-overlay">
                    <div class="matrix-column">0 1 0 1 0 1 0 1 1 0 1 0 0 1</div>
                    <div class="matrix-column delay">1 0 1 0 1 1 0 0 1 0 1 0 1 1</div>
                </div>

                <a-avatar :size="135" :src="getAvatarUrl(profile.avatar_url)" class="main-avatar">
                   <template #icon><user-outlined class="default-icon" /></template>
                </a-avatar>

                <!-- КОРОЛЕВСКАЯ КОРОНА (Парит над аватаркой) -->
                <div v-if="profile.equipped_rewards?.frame === 'frame_royal'" class="royal-crown-container">
                    <svg viewBox="0 0 512 512" width="60" height="60" class="floating-crown">
                        <path fill="#fbbf24" d="M112,238l-96,96l240,168l240-168l-96-96l-72,112l-72-168l-72,168Z"/>
                        <circle fill="#ef4444" cx="112" cy="238" r="20"/>
                        <circle fill="#ef4444" cx="400" cy="238" r="20"/>
                        <circle fill="#3b82f6" cx="256" cy="180" r="25"/>
                        <circle fill="#10b981" cx="16" cy="334" r="16"/>
                        <circle fill="#10b981" cx="496" cy="334" r="16"/>
                    </svg>
                </div>
              </div>

              <a-upload v-if="isEditing" name="avatar" :show-upload-list="false" :customRequest="handleAvatarUpload" class="avatar-upload-pos">
                  <button class="btn-mini-edit" title="Загрузить фото"><camera-outlined /></button>
              </a-upload>
            </div>

            <div class="name-block">
              <h1 class="full-name">{{ profile.last_name || 'Фамилия' }} {{ profile.first_name || 'Имя' }} {{ profile.patronymic || '' }}</h1>

              <!-- АКТИВНЫЕ БЕЙДЖИ (ДО 2 ШТУК) -->
              <div class="equipped-badges" v-if="activeBadges.length > 0">
                 <div v-for="badge in activeBadges" :key="badge.id" class="equipped-badge-item" :class="badge.id">
                    <component :is="badge.icon" /> {{ badge.name }}
                 </div>
              </div>

              <!-- Роли (если нет бейджей студента) -->
              <div class="badges-wrapper" v-if="!isStudent && activeBadges.length === 0">
                 <div class="specialty-badge admin-badge" v-if="isAdmin"><safety-certificate-filled /> System Administrator</div>
                 <div class="specialty-badge uni-badge" v-else-if="isUniversity"><bank-filled /> {{ profile.position || 'Сотрудник ВУЗа' }}</div>
                 <div class="specialty-badge" v-else-if="profile.specialty_name || profile.position"><idcard-outlined /> {{ isEmployer ? profile.position : profile.specialty_name }}</div>
              </div>

              <!-- XP статус -->
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

              <!-- ИНВЕНТАРЬ (СТУДЕНТ) -->
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
                            <div class="inv-icon">
                                <lock-filled v-if="!isUnlocked(item.id)" />
                                <component :is="item.icon" v-else />
                            </div>
                            <div class="inv-name">{{ item.name }}</div>
                            <div class="inv-status" v-if="isEquipped(item.id, invTab)">Надето</div>
                        </div>
                    </div>
                </div>

               <!-- ЛИЧНЫЕ ДАННЫЕ / ИНФО -->
               <div v-if="element === 'info'" class="glass-card card-accent-purple">
                   <div class="card-header"><h3><component :is="getHeaderIcon" /> {{ isUniversity ? 'Служебная информация' : 'Личные данные' }}</h3></div>

                   <!-- ПРОСМОТР -->
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

                       <div v-if="isUniversity && (profile.university_logo || profile.stamp_url)" class="uni-docs-preview">
                           <div class="divider"></div><h4>Документы</h4>
                           <div class="docs-row">
                               <div class="doc-preview-item" v-if="profile.university_logo"><img :src="getAvatarUrl(profile.university_logo)" class="preview-img" /><span>Лого</span></div>
                               <div class="doc-preview-item" v-if="profile.stamp_url"><img :src="getAvatarUrl(profile.stamp_url)" class="preview-img" /><span>Печать</span></div>
                           </div>
                       </div>
                       <div v-if="profile.about_me || isStudent || isUniversity">
                           <div class="divider"></div>
                           <div class="about-section"><h4>{{ isUniversity ? 'Обязанности' : 'О себе' }}</h4><p class="about-text">{{ profile.about_me || 'Информация не заполнена' }}</p></div>
                       </div>
                       <div class="links-section" v-if="isStudent && profile.portfolio_links && profile.portfolio_links.length">
                           <h4>Портфолио</h4>
                           <div class="links-grid">
                               <a v-for="(l,i) in profile.portfolio_links" :key="i" :href="l.url" target="_blank" class="modern-link-tag"><component :is="getIconForType(l.type)" /> {{ getLabelForType(l.type) }}</a>
                           </div>
                       </div>
                   </div>

                   <!-- РЕДАКТИРОВАНИЕ -->
                   <a-form v-else layout="vertical" class="modern-form">
                       <div class="form-row-2">
                           <a-form-item label="Фамилия"><a-input v-model:value="form.last_name" class="modern-input"/></a-form-item>
                           <a-form-item label="Имя"><a-input v-model:value="form.first_name" class="modern-input"/></a-form-item>
                       </div>

                       <template v-if="isUniversity">
                           <a-form-item label="Название ВУЗа"><a-input v-model:value="form.university_name" class="modern-input"/></a-form-item>
                           <a-form-item label="Должность"><a-input v-model:value="form.position" class="modern-input"/></a-form-item>
                           <div class="form-row-2">
                               <a-form-item label="Отдел/Факультет"><a-input v-model:value="form.department" class="modern-input"/></a-form-item>
                               <a-form-item label="Кабинет"><a-input v-model:value="form.office" class="modern-input"/></a-form-item>
                           </div>
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

                       <template v-if="isEmployer">
                           <a-form-item label="Должность"><a-input v-model:value="form.position" class="modern-input"/></a-form-item>
                       </template>

                       <div class="form-row-2" style="margin-top: 15px;">
                           <a-form-item label="Телефон" :validate-status="phoneError ? 'error' : ''" :help="phoneError">
                               <a-input v-model:value="form.phone" @change="validatePhone" class="modern-input" />
                           </a-form-item>
                           <a-form-item label="Telegram">
                               <a-input v-model:value="form.telegram" prefix="@" class="modern-input" />
                           </a-form-item>
                       </div>

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

                       <a-form-item :label="isUniversity ? 'Обязанности' : 'О себе'" style="margin-top:15px">
                           <a-textarea v-model:value="form.about_me" :rows="4" class="modern-input"/>
                       </a-form-item>

                       <div class="edit-actions">
                           <a-button type="primary" shape="round" @click="saveProfile" :loading="saving">Сохранить</a-button>
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
                    <!-- Стили для таймлайна восстановлены ниже -->
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
                    <!-- Стили для списка резюме восстановлены -->
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

                <!-- ВУЗ -->
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

    <!-- MODAL -->
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
// ИМПОРТ ВСЕХ ИКОНОК
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
    GiftFilled, LockFilled, SkinOutlined, ExperimentFilled, ReadFilled, StarFilled, BlockOutlined,
    BgColorsOutlined, EyeInvisibleOutlined, BuildFilled, GoldOutlined, SketchOutlined, RobotOutlined
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

      layout: { left: [], right: [] },
      showLayoutModal: false,
      tempLayout: { left: [], right: [] },
      invTab: 'frames',

      // БАЗА ПРЕДМЕТОВ
      itemsDB: {
          frames: [
              { id: 'frame_blue', name: 'Синяя рамка', icon: 'BlockOutlined' },
              { id: 'frame_green', name: 'Эко-рамка', icon: 'BlockOutlined' },
              { id: 'frame_gold', name: 'Золотая рамка', icon: 'TrophyFilled' },
              { id: 'frame_red', name: 'Рамка агрессора', icon: 'BlockOutlined' },
              { id: 'frame_neon', name: 'Кибер-рамка', icon: 'ThunderboltFilled' },
              { id: 'frame_royal', name: 'Королевская', icon: 'CrownFilled' }
          ],
          effects: [
              { id: 'effect_confetti', name: 'Конфетти', icon: 'SmileTwoTone' },
              { id: 'effect_snow', name: 'Холод', icon: 'SkinOutlined' },
              { id: 'effect_fire', name: 'В огне', icon: 'FireFilled' },
              { id: 'effect_lightning', name: 'Молнии', icon: 'ThunderboltFilled' },
              { id: 'effect_matrix', name: 'Матрица', icon: 'CodeOutlined' }
          ],
          badges: [
              { id: 'badge_fast', name: 'Быстрый старт', icon: 'RocketFilled' },
              { id: 'badge_book', name: 'Теоретик', icon: 'ReadFilled' },
              { id: 'badge_puzzle', name: 'Problem Solver', icon: 'BuildFilled' },
              { id: 'badge_top', name: 'Топ талант', icon: 'StarFilled' },
              { id: 'badge_star', name: 'Суперзвезда', icon: 'StarOutlined' },
              { id: 'badge_guru', name: 'Гуру кода', icon: 'ExperimentFilled' },
              { id: 'crown_animated', name: 'VIP Корона', icon: 'CrownFilled' }
          ],
          themes: [
              { id: 'theme_dark', name: 'Тёмная тема', icon: 'EyeInvisibleOutlined' },
              { id: 'theme_matrix', name: 'Матрица', icon: 'CodeOutlined' },
              { id: 'theme_gold', name: 'Лакшери', icon: 'GoldOutlined' }
          ]
      }
    };
  },
  computed: {
    isEmployer() { return this.userRole === 'employer'; },
    isStudent() { return this.userRole === 'graduate'; },
    isAdmin() { return this.userRole === 'admin'; },
    isUniversity() { return this.userRole === 'university_staff'; },

    currentTheme() { return this.profile.equipped_rewards?.theme; },
    currentEffect() { return this.profile.equipped_rewards?.effect; },

    getThemeClass() {
        const t = this.currentTheme;
        if (t === 'theme_dark') return 'theme-dark-mode';
        if (t === 'theme_matrix') return 'theme-matrix-mode';
        if (t === 'theme_gold') return 'theme-gold-mode';
        return '';
    },
    getThemeBackgroundClass() {
       const t = this.currentTheme;
       if (t === 'theme_matrix') return 'bg-black';
       if (t === 'theme_gold') return 'bg-gold';
       return '';
    },

    getEquippedFrame() {
        const f = this.profile.equipped_rewards?.frame;
        if (!f) return '';
        return f.replace('_', '-');
    },

    activeBadges() {
        const equippedIds = this.profile.equipped_rewards?.badges || [];
        return this.itemsDB.badges.filter(b => equippedIds.includes(b.id));
    },

    getCardAccentClass() { return 'card-accent-purple'; },
    getHeaderIcon() { if (this.isUniversity) return 'BankOutlined'; if (this.isAdmin) return 'DashboardOutlined'; return 'UserOutlined'; },

    currentXp() {
       let total = 0;
       if (this.roadmapList) {
           this.roadmapList.forEach(track => {
               if (track.nodes) track.nodes.forEach(n => { if (n.subtopics) n.subtopics.forEach(s => { if(s.done) total += (s.xpEarned || 50); }); });
           });
       }
       if (this.roadmapHistory) {
           this.roadmapHistory.forEach(h => {
               let nodes = []; try { nodes = JSON.parse(h.roadmap_data); } catch(e){}
               if (nodes) nodes.forEach(n => { if (n.subtopics) n.subtopics.forEach(s => { if (s.done) total += (s.xpEarned || 50); }); });
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
        return Math.min(Math.round(((this.currentXp - rank.min) / (rank.max - rank.min)) * 100), 100);
    },

    activeTrack() {
        if (!this.roadmapList || !this.roadmapList.length) return null;
        return this.roadmapList.find(t => t.id === this.profile.activeRoadmapId) || this.roadmapList[this.roadmapList.length - 1];
    },
    currentRoadmapProgress() { return this.activeTrack ? this.getTrackProgress(this.activeTrack) : 0; },
    currentRoadmapTitle() { return this.activeTrack ? this.activeTrack.role : 'Мое развитие'; },
    nextRoadmapStep() {
        if(!this.activeTrack?.nodes) return 'Старт';
        for (const n of this.activeTrack.nodes) {
            if (n.subtopics?.some(s => !s.done)) return n.subtopics.find(s => !s.done).label;
        }
        return 'Все пройдено!';
    }
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
    resetLayout() {
        if (this.isAdmin) this.layout = { left: ['info', 'admin_notes'], right: ['admin_metrics', 'system_logs'] };
        else if (this.isUniversity) this.layout = { left: ['info'], right: ['uni_stats', 'uni_reports'] };
        else if (this.isStudent) this.layout = { left: ['info', 'inventory', 'roadmap'], right: ['career', 'resumes', 'history'] };
        else this.layout = { left: ['info'], right: [] };
        this.saveLayoutSettings();
    },
    openLayoutSettings() { this.tempLayout = JSON.parse(JSON.stringify(this.layout)); this.showLayoutModal = true; },
    saveLayoutSettings() { this.layout = JSON.parse(JSON.stringify(this.tempLayout)); localStorage.setItem(`profile_layout_${this.userRole}`, JSON.stringify(this.layout)); this.showLayoutModal = false; message.success('Вид сохранен'); },
    resetToDefault() { this.resetLayout(); },
    getWidgetName(id) { return WIDGET_NAMES[id] || id; },

    // ИНВЕНТАРЬ
    getInventoryItems(tab) { return this.itemsDB[tab] || []; },
    isUnlocked(itemId) { return (this.profile.unlocked_rewards || []).includes(itemId); },
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
    async toggleEquip(itemId, type) {
        if (!this.isUnlocked(itemId)) return message.warn('Сначала достигните нужного уровня!');

        if (!this.profile.equipped_rewards) this.profile.equipped_rewards = { badges: [] };

        let newItem = itemId;
        // ЛОГИКА ДЛЯ БЕЙДЖЕЙ (МАССИВ, МАКС 2)
        if (type === 'badge') {
             let badges = this.profile.equipped_rewards.badges || [];
             if (badges.includes(itemId)) {
                 badges = badges.filter(b => b !== itemId); // Снять
             } else {
                 if (badges.length >= 2) return message.warn('Максимум 2 бейджа!');
                 badges.push(itemId); // Надеть
             }
             this.profile.equipped_rewards.badges = badges;
             // Отправляем массив на сервер
             await this.syncEquip('badges', badges);
             return;
        }

        // Логика для остальных (один слот)
        const isWearing = this.profile.equipped_rewards[type] === itemId;
        newItem = isWearing ? null : itemId;
        this.profile.equipped_rewards[type] = newItem;

        await this.syncEquip(type, newItem);
    },
    async syncEquip(type, value) {
        try {
            await api.post(this.isEmployer ? '/recruiters/equip' : '/graduates/equip', { type, itemId: value });
            message.success('Сохранено');
        } catch (e) { message.error('Ошибка сохранения'); }
    },

    // ГЕНЕРАТОРЫ СТИЛЕЙ ДЛЯ ЧАСТИЦ
    getConfettiStyle(n) {
        const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
        return {
            left: Math.random() * 100 + '%',
            top: Math.random() * 100 + '%',
            backgroundColor: colors[n % colors.length],
            animationDelay: (Math.random() * 2) + 's',
            transform: `rotate(${Math.random() * 360}deg)`
        };
    },
    getSnowStyle(n) {
        return {
            left: (Math.random() * 80 + 10) + '%',
            animationDuration: (Math.random() * 3 + 2) + 's',
            animationDelay: Math.random() * 2 + 's',
            opacity: Math.random()
        };
    },

    // Остальные методы
    async loadRoadmapData() {
        try { const r = await api.get('/chat/roadmap'); this.roadmapList = r.data.list || [{id:'l', nodes:r.data.nodes||[]}]; if(r.data.activeId) this.profile.activeRoadmapId = r.data.activeId; } catch(e){}
    },
    getTrackProgress(track) {
        let t=0, d=0; track.nodes?.forEach(n => { if(n.subtopics) { t+=n.subtopics.length; d+=n.subtopics.filter(s=>s.done).length; } else { t++; if(n.done)d++; }});
        return t===0 ? 0 : Math.round((d/t)*100);
    },
    getRankIcon(name) { const map = { 'seedling':'SmileTwoTone', 'code':'CodeOutlined', 'rocket':'RocketFilled', 'thunder':'ThunderboltFilled', 'fire':'FireFilled', 'crown':'CrownFilled' }; return map[name] || 'StarOutlined'; },
    async loadData() { try { const r = await api.get(this.isAdmin?'/admin/me':(this.isUniversity?'/university/me':(this.isEmployer?'/recruiters/me':'/graduates/me'))); this.profile = r.data; if(typeof this.profile.portfolio_links==='string') this.profile.portfolio_links=JSON.parse(this.profile.portfolio_links); if(this.profile.birth_date) this.profile.birth_date=this.profile.birth_date.split('T')[0]; } catch(e){} },
    enableEdit() { this.form = JSON.parse(JSON.stringify(this.profile)); if(!this.form.portfolio_links) this.form.portfolio_links=[]; this.isEditing = true; },
    cancelEdit() { this.isEditing = false; },
    async saveProfile() { this.saving=true; try { const r = await api.put(this.isAdmin?'/admin/me':(this.isUniversity?'/university/me':'/graduates/me'), this.form); this.profile={...this.profile, ...r.data}; message.success('Сохранено'); this.isEditing=false; } catch(e){message.error('Ошибка');} finally{this.saving=false;} },
    async handleAvatarUpload({ file }) { await this.genericUpload(file, '/graduates/avatar', 'avatar_url'); },
    async handleLogoUpload({ file }) { await this.genericUpload(file, '/university/logo', 'university_logo'); },
    async handleStampUpload({ file }) { await this.genericUpload(file, '/university/stamp', 'stamp_url'); },
    async genericUpload(file, url, field) { const fd=new FormData(); fd.append(field==='avatar_url'?'avatar':'file', file); try { const r = await api.post(url, fd); this.profile[field] = r.data[field] || r.data.avatar_url; this.form[field] = this.profile[field]; message.success('Загружено'); } catch(e){} },
    getAvatarUrl(u) { return u ? `http://localhost:4000${u}` : null; },
    getFileUrl(p) { return `http://localhost:4000${p}`; },
    formatDate(d) { return d ? new Date(d).toLocaleDateString() : '—'; },
    formatGender(g) { return g==='male'?'Мужской':(g==='female'?'Женский':'—'); },
    addLink() { this.form.portfolio_links.push({ type: 'github', url: '' }); },
    removeLink(i) { this.form.portfolio_links.splice(i, 1); },
    getIconForType(t) { return ({github:'GithubOutlined', telegram:'MessageOutlined'})[t] || 'LinkOutlined'; },
    getLabelForType(t) { return ({github:'GitHub', telegram:'TG'})[t] || 'Ссылка'; },
    async loadSpecialties() { try { const r=await api.get('/dict/specialties'); this.specialties=r.data; }catch(e){} },
    async loadEmployment() { try { const r=await api.get('/employment'); this.employmentRecords=r.data; }catch(e){} },
    async loadCompanies() { try { const r=await api.get('/dict/companies'); this.companies=r.data; }catch(e){} },
    async loadResumes() { try { const r=await api.get('/resumes'); this.resumes=r.data; }catch(e){} },
    async loadUniStats() { try { const r=await api.get('/university/stats'); this.uniStats=r.data; }catch(e){} },
    async loadReports() { try { const r=await api.get('/university/reports'); this.savedReports=r.data; }catch(e){} },
    async loadRoadmapHistory() { try { const r=await api.get('/chat/roadmap/history'); this.roadmapHistory=r.data; }catch(e){} },
    async checkSystemHealth() { this.systemHealth = {status:'ok'}; },
    async loadSystemLogs() { try { const r=await api.get('/admin/logs'); this.systemLogs=r.data.slice(0,10); }catch(e){} },
    saveNotes() { localStorage.setItem('admin_notes', this.adminNotes); message.success('Сохранено'); },
    openJobForm() { this.jobForm={id:null, is_current:true}; this.showJobForm=true; },
    editJob(j) { this.jobForm={...j}; this.showJobForm=true; },
    async addJob() { try { if(this.jobForm.id) await api.put(`/employment/${this.jobForm.id}`, this.jobForm); else await api.post('/employment', this.jobForm); this.showJobForm=false; this.loadEmployment(); }catch(e){} },
    async uploadResumeFile({file}) { const fd=new FormData(); fd.append('file', file); await api.post('/resumes', fd); this.loadResumes(); },
    async deleteResume(id) { await api.delete(`/resumes/${id}`); this.loadResumes(); }
  }
};
</script>

<style scoped>
/* =======================================================
   ВОССТАНОВЛЕННЫЕ СТИЛИ (BASE & LAYOUT)
   ======================================================= */
.page-wrapper { min-height: 90vh; background: #f3f4f6; display: flex; justify-content: center; padding: 30px 20px; position: relative; overflow: hidden; }

/* Блобы (фон) */
.blobs-container { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 0; pointer-events: none; }
.blob { position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.5; }
.blob-1 { background: #a855f7; width: 400px; height: 400px; top: -100px; left: -100px; }
.blob-2 { background: #3b82f6; width: 300px; height: 300px; bottom: -50px; right: -50px; }
.blob-3 { background: #2dd4bf; width: 250px; height: 250px; top: 30%; left: 40%; opacity: 0.3; }

.content-container { width: 100%; max-width: 1200px; position: relative; z-index: 1; }

/* Карточки */
.glass-card { background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(20px); border: 1px solid white; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); padding: 25px; transition: transform 0.2s; }
.main-card { text-align: center; padding-bottom: 35px; }

/* Хедер карточки */
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid rgba(0,0,0,0.06); padding-bottom: 10px; }
.card-header h3 { margin: 0; color: #1f2937; font-weight: 800; display: flex; align-items: center; gap: 12px; font-size: 1.2rem; }

/* Кнопки действий */
.top-actions { position: absolute; top: 25px; right: 25px; z-index: 50; display: flex; gap: 10px; }
.btn-glass-edit { background: rgba(255,255,255,0.6); border: 1px solid #e5e7eb; padding: 10px 20px; border-radius: 14px; cursor: pointer; font-weight: 600; color: #4b5563; }
.settings-btn { background: rgba(255,255,255,0.6); border: none; width: 36px; height: 36px; border-radius: 50%; cursor: pointer; color: #6b7280; display: flex; align-items: center; justify-content: center; }
.settings-btn:hover { background: white; color: #1890ff; }
.btn-mini-edit { width: 36px; height: 36px; border-radius: 50%; background: #1890ff; color: white; border: 3px solid white; cursor: pointer; box-shadow: 0 4px 10px rgba(0,0,0,0.15); border: none; }

/* Аватар и Инфо */
.avatar-column { display: flex; flex-direction: column; align-items: center; }
.avatar-stack { position: relative; width: 170px; height: 170px; margin-bottom: 20px; }
.progress-ring { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 2; }
.avatar-img-box { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 135px; height: 135px; border-radius: 50%; background: white; display: flex; justify-content: center; align-items: center; box-shadow: 0 0 15px rgba(0,0,0,0.05); z-index: 5; }
.main-avatar { background-color: #f3f4f6; border: 4px solid #fff; z-index: 6; }
.full-name { font-size: 2rem; font-weight: 800; color: #111827; margin: 0 0 10px; }

/* Ранг Орб */
.rank-orb { position: absolute; bottom: 0; right: 10px; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 1.2rem; border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.15); z-index: 20; transition: transform 0.3s; }
.rank-orb:hover { transform: scale(1.1); }

/* Статус XP */
.xp-status { margin-top: 8px; font-size: 0.95rem; background: rgba(255,255,255,0.6); padding: 4px 12px; border-radius: 20px; display: inline-block; border: 1px solid rgba(0,0,0,0.05); backdrop-filter: blur(5px); }
.xp-divider { margin: 0 6px; color: #cbd5e1; }
.xp-text { color: #64748b; font-weight: 600; }

/* Сетка виджетов */
.static-grid-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 25px; align-items: start; margin-top: 20px; width: 100%; }
@media (max-width: 900px) { .static-grid-layout { grid-template-columns: 1fr; } }
.grid-column { display: flex; flex-direction: column; gap: 20px; width: 100%; }
.widget-wrapper { width: 100%; }
.fade-in { animation: fadeIn 0.7s cubic-bezier(0.2, 0.8, 0.2, 1); }
@keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

/* Инфо блок */
.info-row { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed #e5e7eb; padding: 8px 0; }
.label { color: #6b7280; font-size: 0.9rem; font-weight: 500; }
.value { font-weight: 700; color: #111827; text-align: right; }
.value.highlight { color: #3b82f6; }
.divider { height: 1px; background: #e5e7eb; margin: 20px 0; }
.about-section h4 { font-size: 0.95rem; font-weight: 700; color: #374151; margin-bottom: 8px; }
.about-text { color: #4b5563; line-height: 1.6; white-space: pre-line; font-size: 0.95rem; }
.links-grid { display: flex; flex-wrap: wrap; gap: 8px; }
.modern-link-tag { background: white; border: 1px solid #e5e7eb; padding: 6px 12px; border-radius: 10px; color: #4b5563; font-weight: 600; text-decoration: none; display: flex; align-items: center; gap: 6px; font-size: 0.85rem; }

/* Формы */
.modern-form .ant-form-item { margin-bottom: 12px; }
.form-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
.modern-input, .modern-select { border-radius: 8px; padding: 6px 11px; }
.link-edit-row { display: flex; gap: 10px; margin-bottom: 12px; }
.btn-icon-delete { background: #fee2e2; border: none; color: #ef4444; width: 32px; height: 32px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.btn-add-link { width: 100%; border: 1px dashed #d1d5db; background: white; padding: 6px; border-radius: 8px; cursor: pointer; color: #6b7280; }
.uploads-section { background: #f8fafc; padding: 15px; border-radius: 12px; border: 1px dashed #cbd5e1; margin-top: 15px; }
.upload-grid { display: flex; gap: 15px; }
.upload-placeholder { width: 70px; height: 70px; border: 2px dashed #e2e8f0; border-radius: 10px; display: flex; align-items: center; justify-content: center; cursor: pointer; background: white; color: #9ca3af; margin: 0 auto; } .ub-label { font-size: 0.8rem; text-align: center; margin-bottom: 5px; color: #64748b; }
.edit-actions { display: flex; gap: 10px; margin-top: 20px; }

/* Таймлайн и Резюме (Было потеряно, восстановлено!) */
.timeline-card { background: white; border-radius: 12px; padding: 14px 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.03); border: 1px solid #f0f0f0; margin-bottom: 10px; display: flex; flex-direction: column; gap: 5px; }
.timeline-header { display: flex; justify-content: space-between; align-items: center; }
.job-company { font-weight: 800; font-size: 1rem; color: #1e293b; }
.job-pos { color: #3b82f6; font-weight: 600; font-size: 0.9rem; }
.job-meta { font-size: 0.8rem; color: #9ca3af; display: flex; justify-content: space-between; margin-top: 4px; }
.btn-add-job { background: #eff6ff; border: none; color: #2563eb; width: 30px; height: 30px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.job-form-wrapper { background: #f9fafb; padding: 15px; border-radius: 12px; border: 1px solid #e5e7eb; margin-bottom: 15px; }

.resume-list { display: flex; flex-direction: column; gap: 10px; margin-top: 15px; }
.resume-item { display: flex; align-items: center; gap: 12px; background: white; padding: 12px 16px; border-radius: 12px; border: 1px solid #f0f0f0; box-shadow: 0 2px 8px rgba(0,0,0,0.02); transition: 0.2s; }
.resume-item:hover { border-color: #1890ff; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
.res-icon { font-size: 1.8rem; }
.res-info { flex: 1; overflow: hidden; }
.res-name { font-weight: 600; color: #374151; font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.res-date { font-size: 0.75rem; color: #9ca3af; }
.res-actions { display: flex; gap: 8px; }
.action-icon { cursor: pointer; color: #94a3b8; margin-left: 8px; transition: 0.2s; }
.action-icon:hover { color: #1890ff; }

.history-list { display: flex; flex-direction: column; gap: 10px; margin-top: 15px; }
.history-item { display: flex; justify-content: space-between; align-items: center; background: white; padding: 12px 16px; border-radius: 12px; border: 1px solid #f0f0f0; box-shadow: 0 2px 8px rgba(0,0,0,0.02); transition: 0.2s; }
.history-item:hover { border-color: #8b5cf6; transform: translateX(5px); }
.h-title { font-weight: 700; color: #374151; font-size: 0.95rem; }
.h-date { font-size: 0.75rem; color: #9ca3af; margin-top: 2px; }
.h-score { font-weight: 800; color: #6366f1; background: #e0e7ff; padding: 4px 10px; border-radius: 8px; font-size: 0.85rem; }
.h-score.done { color: #059669; background: #d1fae5; }

/* Бейджи ролей (восстановлено) */
.badges-wrapper { display: flex; justify-content: center; gap: 8px; flex-wrap: wrap; }
.specialty-badge { display: inline-flex; align-items: center; justify-content: center; gap: 8px; background: #e0f2fe; color: #0284c7; padding: 6px 18px; border-radius: 30px; font-weight: 700; font-size: 1rem; min-width: 150px; }
.admin-badge { background: #111827 !important; color: #f3f4f6 !important; }
.uni-badge { background: #0f766e !important; color: #ccfbf1 !important; }

/* Цвета карточек */
.card-accent-purple { border-top: 4px solid #a855f7; }
.card-accent-blue { border-top: 4px solid #3b82f6; }
.card-accent-teal { border-top: 4px solid #0d9488; }
.card-accent-orange { border-top: 4px solid #f97316; }

/* Вспомогательные */
.scrollable-content { max-height: 500px; overflow-y: auto; padding-right: 5px; }
.custom-scroll::-webkit-scrollbar { width: 6px; }
.custom-scroll::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 10px; }
.empty-timeline { text-align: center; color: #9ca3af; padding: 15px; font-size: 0.9rem; }
.empty-icon-box { font-size: 2rem; color: #e5e7eb; margin-bottom: 10px; }

/* Roadmap */
.roadmap-widget-content { text-align: center; padding: 15px 0; }
.roadmap-title { font-size: 1rem; font-weight: 700; color: #374151; margin-bottom: 15px; }
.circle-wrapper { margin: 0 auto 15px; width: 100px; }
.rp-next { font-size: 0.9rem; color: #6b7280; }
.rp-next strong { color: #8b5cf6; display: block; margin-top: 2px; }

/* ВУЗ Статистика */
.uni-stats-list { display: flex; justify-content: space-between; padding: 10px 0; }
.u-stat { text-align: center; flex: 1; } .us-val { font-size: 1.4rem; font-weight: 800; color: #0f766e; }
.doc-list { display: flex; flex-direction: column; gap: 8px; margin-top: 10px; }
.doc-item { display: flex; align-items: center; gap: 8px; padding: 8px; background: #f8fafc; border-radius: 8px; font-size: 0.9rem; font-weight: 600; color: #334155; }
.btn-create-report { width: 100%; margin-top: 15px; background: #eff6ff; color: #2563eb; border: 1px dashed #2563eb; padding: 10px; border-radius: 10px; cursor: pointer; font-weight: 600; transition: 0.2s; }
.doc-preview-item { display: flex; flex-direction: column; align-items: center; font-size: 0.75rem; color: #64748b; }
.preview-img { width: 50px; height: 50px; object-fit: contain; border: 1px solid #e2e8f0; border-radius: 8px; padding: 5px; background: white; }
.uni-docs-preview .docs-row { display: flex; gap: 15px; justify-content: center; }

/* Редактор сетки */
.layout-editor-container { padding: 20px; }
.le-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
.le-column { background: #f9fafb; padding: 15px; border-radius: 12px; border: 1px solid #e5e7eb; }
.le-col-header { font-weight: 700; margin-bottom: 10px; color: #6b7280; text-align: center; }
.le-drag-area { min-height: 200px; display: flex; flex-direction: column; gap: 8px; }
.le-item { background: white; padding: 10px; border-radius: 8px; border: 1px solid #e5e7eb; cursor: move; display: flex; justify-content: space-between; align-items: center; font-weight: 600; color: #374151; }
.le-ghost { opacity: 0.5; background: #e6f7ff; border: 1px dashed #1890ff; }
.reset-block { text-align: center; margin-top: 15px; }

/* =======================================================
   НОВЫЕ СТИЛИ (ЭФФЕКТЫ, ИНВЕНТАРЬ)
   ======================================================= */

/* Контейнер эффектов */
.effects-container { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 4; }

/* 1. КОРОЛЕВСКАЯ КОРОНА */
.royal-crown-container {
    position: absolute; top: -50px; left: 50%; transform: translateX(-50%); z-index: 20;
    filter: drop-shadow(0 0 10px rgba(251, 191, 36, 0.8));
    animation: float-crown 3s ease-in-out infinite;
}
@keyframes float-crown { 0%, 100% { transform: translateX(-50%) translateY(0); } 50% { transform: translateX(-50%) translateY(-8px); } }

/* 2. КОНФЕТТИ */
.confetti-wrapper { position: absolute; width: 100%; height: 100%; top: 0; left: 0; }
.confetti-piece { position: absolute; width: 6px; height: 6px; border-radius: 2px; opacity: 0; animation: confetti-fall 2s ease-out infinite; }
@keyframes confetti-fall {
    0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
    100% { transform: translateY(100px) rotate(720deg); opacity: 0; }
}

/* 3. ХОЛОД (СНЕГ) */
.snow-wrapper { position: absolute; width: 100%; height: 100%; overflow: visible; }
.snowflake { position: absolute; top: -10px; color: #bae6fd; font-size: 18px; animation: snow-fall linear infinite; text-shadow: 0 0 5px white; }
@keyframes snow-fall { to { transform: translateY(180px); opacity: 0; } }

/* 4. МОЛНИИ (SVG) */
.lightning-wrapper { position: absolute; width: 100%; height: 100%; top: 0; left: 0; z-index: 10; }
.lightning-bolt { position: absolute; top: -10px; right: -10px; width: 60px; height: 60px; filter: drop-shadow(0 0 10px #fef08a); opacity: 0; animation: lightning-flash 4s infinite; }
@keyframes lightning-flash {
    90% { opacity: 0; transform: scale(0.8); }
    92% { opacity: 1; transform: scale(1.2); }
    94% { opacity: 0; transform: scale(1); }
    95% { opacity: 0.8; transform: scale(1.1); }
    100% { opacity: 0; }
}

/* 5. МАТРИЦА (НА АВАТАРКЕ) */
.matrix-overlay {
    position: absolute; top: 4px; left: 4px; width: 127px; height: 127px; border-radius: 50%;
    overflow: hidden; background: rgba(0,0,0,0.3); z-index: 7; pointer-events: none;
    display: flex; justify-content: center; opacity: 0.6;
}
.matrix-column { font-family: monospace; font-size: 10px; color: #22c55e; width: 10px; word-break: break-all; line-height: 10px; animation: matrix-scroll 2s linear infinite; }
.matrix-column.delay { animation-delay: 1s; margin-left: 5px; }
@keyframes matrix-scroll { from { transform: translateY(-100%); } to { transform: translateY(100%); } }

/* РАМКИ */
.frame-blue .main-avatar { border: 4px solid #3b82f6; box-shadow: 0 0 15px #3b82f6; }
.frame-green .main-avatar { border: 4px solid #10b981; border-style: dashed; }
.frame-gold .main-avatar { border: 4px solid #fbbf24; box-shadow: 0 0 20px #fbbf24, inset 0 0 10px #fbbf24; animation: gold-pulse 2s infinite; }
.frame-royal .main-avatar { border: 5px solid #7c3aed; box-shadow: 0 0 25px #7c3aed; }
@keyframes gold-pulse { 0% { box-shadow: 0 0 10px #fbbf24; } 50% { box-shadow: 0 0 25px #fbbf24; } 100% { box-shadow: 0 0 10px #fbbf24; } }

/* ИНВЕНТАРЬ */
.inv-tabs { display: flex; gap: 10px; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 5px; overflow-x: auto; }
.inv-tabs span { cursor: pointer; padding: 5px 12px; border-radius: 20px; font-size: 0.9rem; color: #6b7280; font-weight: 600; transition: 0.2s; white-space: nowrap; }
.inv-tabs span.active { background: #e0e7ff; color: #4f46e5; }
.inv-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 10px; max-height: 200px; overflow-y: auto; }
.inv-item { background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 10px; text-align: center; cursor: pointer; transition: 0.2s; }
.inv-item:hover { transform: translateY(-2px); box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
.inv-item.equipped { border-color: #10b981; background: #ecfdf5; box-shadow: inset 0 0 0 1px #10b981; }
.inv-icon { font-size: 1.8rem; color: #4f46e5; margin-bottom: 5px; }

/* БЕЙДЖИ (Новый стиль) */
.equipped-badges { display: flex; gap: 10px; justify-content: center; margin-bottom: 10px; }
.equipped-badge-item { padding: 4px 12px; border-radius: 20px; font-weight: 700; font-size: 0.85rem; display: flex; align-items: center; gap: 6px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
/* Цвета бейджей */
.badge_top, .badge_star, .crown_animated { background: linear-gradient(135deg, #fbbf24, #f59e0b); color: white; }
.badge_guru, .badge_puzzle { background: #8b5cf6; color: white; }
.badge_fast, .badge_rocket { background: #ef4444; color: white; }
.badge_book { background: #3b82f6; color: white; }

/* ТЕМЫ */
.theme-dark-mode { background: #111827 !important; border-color: #374151 !important; color: white !important; }
.theme-dark-mode .full-name, .theme-dark-mode h1, .theme-dark-mode h3 { color: white !important; }

.theme-matrix-mode { background: #000 !important; border: 1px solid #22c55e !important; color: #22c55e !important; box-shadow: 0 0 20px rgba(34, 197, 94, 0.4) !important; }
.theme-matrix-mode .full-name { color: #22c55e !important; font-family: 'Courier New', monospace; letter-spacing: 2px; }

.theme-gold-mode { background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%) !important; border: 2px solid #fbbf24 !important; }
.theme-gold-mode .full-name { color: #92400e !important; font-family: serif; }

/* Фоны тем */
.bg-black { background: #000; }
.bg-gold { background: #fdf6e3; }
.matrix-bg-rain span { position: absolute; color: #0f0; font-family: monospace; font-size: 20px; top: -20px; animation: rain linear infinite; opacity: 0.3; }
@keyframes rain { to { top: 100%; opacity: 0; } }
.gold-bg-dust .gold-particle { position: absolute; width: 4px; height: 4px; background: #fbbf24; border-radius: 50%; animation: sparkle 3s infinite; }
@keyframes sparkle { 0%, 100% { opacity: 0.3; transform: scale(1); } 50% { opacity: 1; transform: scale(1.5); } }

</style>