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

# Открываем порт
EXPOSE 5000

CMD ["npm", "start"] 