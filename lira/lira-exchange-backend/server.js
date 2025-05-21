const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
// Импортируем наш новый логгер
const logger = require('./config/logger');
// Импортируем сервис обработки платежей
const paymentProcessor = require('./services/paymentProcessor');
// Импортируем сервис обновления курсов
const rateUpdater = require('./services/rateUpdater');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Настройка CORS для разрешения запросов с фронтенда
app.use(cors({
  origin: '*', // Разрешаем запросы с любого домена во время разработки
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Диагностический middleware для логирования запросов
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// Проверка доступности - корневой маршрут
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'API сервер работает',
    status: 'online',
    timestamp: new Date().toISOString()
  });
});

// Обработчик для favicon.ico
app.get('/favicon.ico', (req, res) => {
  res.status(204).end(); // Отправляем "No Content"
});

// Логгер импортирован из ./config/logger.js

// Routes
const exchangeRoutes = require('./routes/exchange');
const userRoutes = require('./routes/users');
const walletRoutes = require('./routes/wallets');

app.use('/api/exchange', exchangeRoutes);
app.use('/api/users', userRoutes);
app.use('/api/wallets', walletRoutes);

// Закомментировал инициализацию TON-клиента
// Initialize TON client
// const tonClient = new TonClient({
//  endpoint: process.env.TON_ENDPOINT || 'https://toncenter.com/api/v2/jsonRPC'
// });

// Make logger available in req
app.use((req, res, next) => {
  req.logger = logger;
  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Server Error'
  });
});

// Connect to MongoDB
logger.info('Trying to connect to MongoDB with URL:', process.env.MONGO_URL);
mongoose.set('strictQuery', false); // Добавляем, чтобы убрать предупреждение
mongoose.connect(process.env.MONGO_URL || 'mongodb://localhost:27017/lira-rub-exchange', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => {
    logger.info('MongoDB connected');
    
    // Запускаем сервис обработки платежей
    if (process.env.ENABLE_PAYMENT_PROCESSOR !== 'false') {
      logger.info('Starting payment processor service');
      paymentProcessor.start();
    } else {
      logger.info('Payment processor disabled via environment variable');
    }
    
    // Запускаем сервис обновления курсов
    if (process.env.ENABLE_RATE_UPDATER !== 'false') {
      logger.info('Starting rate updater service');
      rateUpdater.start();
    } else {
      logger.info('Rate updater disabled via environment variable');
    }
    
    // Start server
    const PORT = process.env.PORT || 8080; // Railway обычно использует порт 8080
    app.listen(PORT, '0.0.0.0', () => { // Слушаем на всех интерфейсах
      logger.info(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    logger.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Обработчики завершения работы
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

// Функция для корректного завершения работы
function gracefulShutdown() {
  logger.info('Shutting down services...');
  
  // Останавливаем сервис обработки платежей
  paymentProcessor.stop();
  
  // Останавливаем сервис обновления курсов
  rateUpdater.stop();
  
  // Закрываем соединение с MongoDB
  mongoose.connection.close(() => {
    logger.info('MongoDB connection closed');
    process.exit(0);
  });
} 