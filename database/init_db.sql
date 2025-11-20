-- Создание типа данных для ролей пользователей
CREATE TYPE user_role AS ENUM ('admin', 'graduate', 'employer', 'university_rep');

-- 1. Таблица пользователей (общая для всех)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'graduate',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Справочник направлений подготовки (например, 09.04.01)
CREATE TABLE specialties (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) NOT NULL, -- код специальности
    name VARCHAR(255) NOT NULL, -- название
    description TEXT
);

-- 3. Профессиональные стандарты
CREATE TABLE prof_standards (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL
);

-- 4. Профессиональные компетенции (связаны со стандартами)
CREATE TABLE competencies (
    id SERIAL PRIMARY KEY,
    standard_id INTEGER REFERENCES prof_standards(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT
);

-- 5. Профиль выпускника (дополнительная информация к user)
CREATE TABLE graduates (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    specialty_id INTEGER REFERENCES specialties(id) ON DELETE SET NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    graduation_year INTEGER CHECK (graduation_year > 2000),
    portfolio_link VARCHAR(255),
    UNIQUE(user_id)
);

-- 6. Компании-работодатели
CREATE TABLE companies (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL, -- привязка к аккаунту представителя
    name VARCHAR(255) NOT NULL,
    inn VARCHAR(12), -- ИНН для проверки
    website VARCHAR(255),
    description TEXT,
    city VARCHAR(100)
);

-- 7. Записи о трудоустройстве (Мониторинг)
CREATE TABLE employment_records (
    id SERIAL PRIMARY KEY,
    graduate_id INTEGER REFERENCES graduates(id) ON DELETE CASCADE,
    company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL,
    position_title VARCHAR(255) NOT NULL, -- Должность
    start_date DATE NOT NULL,
    end_date DATE, -- NULL, если работает по сей день
    salary_amount DECIMAL(10, 2), -- Для анализа зарплат
    is_current BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для ускорения поиска
CREATE INDEX idx_graduates_specialty ON graduates(specialty_id);
CREATE INDEX idx_employment_company ON employment_records(company_id);