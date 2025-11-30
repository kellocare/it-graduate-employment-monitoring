# Этап 1: Сборка (Build)
# Используем свежую Node.js 22
FROM node:22-alpine as build-stage

WORKDIR /app

# Копируем package.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем исходный код
COPY . .

# Собираем проект
RUN npm run build

# Этап 2: Production (Nginx)
FROM nginx:stable-alpine as production-stage

# Копируем собранные файлы из папки dist (Vite собирает туда)
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Копируем конфиг nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]