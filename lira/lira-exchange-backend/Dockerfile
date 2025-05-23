FROM node:18-alpine

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./
COPY .npmrc ./

# Полностью очищаем npm кеш и устанавливаем зависимости
RUN npm cache clean --force && \
    rm -rf node_modules && \
    rm -rf package-lock.json && \
    npm install --legacy-peer-deps --no-audit --no-fund --prefer-offline=false && \
    npm ls || true

# Копируем исходный код
COPY . .

# Создаем директорию для логов
RUN mkdir -p logs

# Открываем порт
EXPOSE 8080

# Запускаем приложение
CMD ["npm", "start"] 