FROM node:18

WORKDIR /app

# Копируем package.json для кэширования зависимостей
COPY package*.json ./

# Устанавливаем работающую версию bcryptjs
RUN npm install bcryptjs@2.3.0 --force

# Затем устанавливаем все остальные зависимости
RUN npm install --legacy-peer-deps

# Копируем код проекта
COPY . .

# Создаем директорию для логов
RUN mkdir -p logs

# Открываем порт
EXPOSE 8080

# Указываем переменные окружения напрямую (если не переданы из Railway)
ENV PORT=8080
ENV NODE_ENV=production
# Переменные подключения к MongoDB должны быть настроены в Railway

CMD ["npm", "start"] 