from graphviz import Digraph
import os

# Настройка пути (если Graphviz не в PATH, раскомментируй строку ниже и укажи путь к bin)
# os.environ["PATH"] += os.pathsep + 'C:/Program Files/Graphviz/bin'

dot = Digraph('UseCaseDiagram', comment='Use Case Diagram for Coursework', format='png')

# Настройки графа: слева направо (RankDir=LR)
dot.attr(rankdir='LR', size='10,8', dpi='300')
dot.attr('node', fontsize='12', fontname='Arial')

# --- Акторы (Люди) ---
# Graphviz не имеет встроенного "человечка", используем прямоугольники со стереотипом
dot.attr('node', shape='box', style='filled', fillcolor='#E3F2FD', color='#1565C0')
dot.node('Grad', '<<Actor>>\nВыпускник')
dot.node('Rec', '<<Actor>>\nРекрутер')
dot.node('Staff', '<<Actor>>\nСотрудник Вуза')
dot.node('Admin', '<<Actor>>\nАдминистратор')

# --- Система (Варианты использования) ---
with dot.subgraph(name='cluster_System') as c:
    c.attr(label='Веб-приложение Мониторинга (Vue 3 + Node.js)', fontsize='16', style='rounded')
    c.attr('node', shape='ellipse', style='solid', fillcolor='white', color='black')

    # Общие
    c.node('Auth', 'Авторизация / Вход')

    # Выпускник
    c.node('Profile', 'Редактировать профиль\n(Загрузка файлов)')
    c.node('Roadmap', 'Управлять Roadmap\n(Drag-and-Drop)')
    c.node('Jobs', 'Просмотр вакансий\n(AI Рекомендации)')
    c.node('PDF', 'Скачать резюме (PDF)')
    c.node('XP', 'Получать награды (XP)')

    # Рекрутер
    c.node('PostJob', 'Публикация вакансий')
    c.node('Search', 'Поиск кандидатов\n(AI Summary)')
    c.node('Chat', 'Чат с кандидатом')

    # Сотрудник
    c.node('Analytics', 'Просмотр аналитики\n(Chart.js)')
    c.node('Export', 'Экспорт отчетов')

    # Админ
    c.node('Manage', 'Управление\nпользователями')
    c.node('Dicts', 'Ведение справочников')
    c.node('Logs', 'Аудит логов')

# --- Связи ---
# Выпускник
dot.edge('Grad', 'Auth')
dot.edge('Grad', 'Profile')
dot.edge('Grad', 'Roadmap')
dot.edge('Grad', 'Jobs')
dot.edge('Grad', 'PDF')
dot.edge('Grad', 'XP')

# Рекрутер
dot.edge('Rec', 'Auth')
dot.edge('Rec', 'PostJob')
dot.edge('Rec', 'Search')
dot.edge('Rec', 'Chat')

# Сотрудник
dot.edge('Staff', 'Auth')
dot.edge('Staff', 'Analytics')
dot.edge('Staff', 'Export')

# Админ
dot.edge('Admin', 'Auth')
dot.edge('Admin', 'Manage')
dot.edge('Admin', 'Dicts')
dot.edge('Admin', 'Logs')

# Внутренние связи (Include/Extend)
dot.edge('Jobs', 'Profile', label='<<include>>', style='dashed')
dot.edge('Search', 'Chat', label='<<extend>>', style='dashed')

# Генерация
try:
    output_path = dot.render('use_case_diagram', view=False)
    print(f"Готово! Диаграмма сохранена как: {output_path}")
except Exception as e:
    print("Ошибка Graphviz. Убедитесь, что Graphviz установлен в системе (не только библиотека python).")
    print(f"Детали: {e}")