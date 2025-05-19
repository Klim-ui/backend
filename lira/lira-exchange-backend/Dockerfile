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


# Указываем переменные окружения напрямую (если не переданы из Railway)
ENV MONGO_URL=mongodb://mongo:WcRtvAPGqSkoThnHfHZlGfAQtWoMNZyh@mongodb.railway.internal:27017/mongo?authSource=admin
ENV NODE_ENV=production

CMD ["npm", "start"] 