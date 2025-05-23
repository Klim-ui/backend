FROM node:18-alpine

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./
COPY .npmrc ./

# Очищаем npm кеш и устанавливаем зависимости
RUN npm cache clean --force && \
    rm -rf node_modules && \
    npm install --legacy-peer-deps --no-audit --no-fund

# Копируем исходный код
COPY . .

# Создаем директорию для логов
RUN mkdir -p logs

# Открываем порт
EXPOSE 8080

# Запускаем приложение
CMD ["npm", "start"] 