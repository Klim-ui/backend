FROM node:18

# Установка необходимых системных зависимостей для TON
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Сначала копируем и устанавливаем зависимости
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Затем копируем код
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