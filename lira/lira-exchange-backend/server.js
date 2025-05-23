const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables первым делом
dotenv.config();

// Импортируем модули с обработкой ошибок
let logger, paymentProcessor, rateUpdater;

try {
  // Импортируем наш новый логгер
  logger = require('./config/logger');
  logger.info('Logger loaded successfully');
} catch (error) {
  console.error('Failed to load logger:', error.message);
  // Fallback logger
  logger = {
    info: console.log,
    error: console.error,
    warn: console.warn
  };
}

try {
  // Импортируем сервис обработки платежей
  paymentProcessor = require('./services/paymentProcessor');
  logger.info('Payment processor loaded successfully');
} catch (error) {
  logger.error('Failed to load payment processor:', error.message);
  paymentProcessor = { start: () => {}, stop: () => {} };
}

try {
  // Импортируем сервис обновления курсов
  rateUpdater = require('./services/rateUpdater');
  logger.info('Rate updater loaded successfully');
} catch (error) {
  logger.error('Failed to load rate updater:', error.message);
  rateUpdater = { start: () => {}, stop: () => {} };
}

// Initialize Express app
const app = express();

// Переменные для мониторинга ресурсов
const resources = {
  activeRequests: 0,
  maxConcurrentRequests: 100, // Максимальное количество одновременных запросов
  requestCount: 0,
  lastMinuteRequests: 0,
  lastResetTime: Date.now()
};

// Настройка CORS для разрешения запросов с фронтенда
app.use(cors({
  origin: '*', // Разрешаем запросы с любого домена во время разработки
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Middleware для мониторинга ресурсов
app.use((req, res, next) => {
  const now = Date.now();
  
  // Сбрасываем счетчик запросов в минуту каждую минуту
  if (now - resources.lastResetTime > 60000) {
    resources.lastMinuteRequests = resources.requestCount;
    resources.requestCount = 0;
    resources.lastResetTime = now;
    
    // Логируем статистику каждую минуту
    logger.info(`Resource usage: Active requests: ${resources.activeRequests}, Last minute requests: ${resources.lastMinuteRequests}`);
  }
  
  // Увеличиваем счетчики
  resources.activeRequests++;
  resources.requestCount++;
  
  // Проверяем, не превышен ли лимит одновременных запросов
  if (resources.activeRequests > resources.maxConcurrentRequests) {
    logger.warn(`Too many concurrent requests: ${resources.activeRequests}, max: ${resources.maxConcurrentRequests}`);
    return res.status(503).json({
      success: false,
      message: 'Server is under heavy load, please try again later'
    });
  }
  
  // Логируем завершение запроса и уменьшаем счетчик активных запросов
  res.on('finish', () => {
    resources.activeRequests--;
  });
  
  next();
});

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
    timestamp: new Date().toISOString(),
    resources: {
      activeRequests: resources.activeRequests,
      requestsPerMinute: resources.lastMinuteRequests
    }
  });
});

// Health check для Railway
app.get('/health', (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  
  res.status(200).json({
    status: 'ok',
    database: isDbConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Health check
app.get('/api/health', (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  
  res.status(isDbConnected ? 200 : 503).json({
    success: true,
    status: isDbConnected ? 'healthy' : 'unhealthy',
    database: isDbConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
    services: {
      database: isDbConnected,
      api: true
    }
  });
});

// Маршрут для проверки статуса сервера и ресурсов
app.get('/status', (req, res) => {
  const memoryUsage = process.memoryUsage();
  
  res.status(200).json({
    success: true,
    status: 'online',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    resources: {
      activeRequests: resources.activeRequests,
      requestsPerMinute: resources.lastMinuteRequests,
      memory: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024) + ' MB',
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + ' MB',
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + ' MB',
        external: Math.round(memoryUsage.external / 1024 / 1024) + ' MB'
      }
    }
  });
});

// Обработчик для favicon.ico
app.get('/favicon.ico', (req, res) => {
  res.status(204).end(); // Отправляем "No Content"
});

// Routes с обработкой ошибок
try {
  const exchangeRoutes = require('./routes/exchange');
  app.use('/api/exchange', exchangeRoutes);
  logger.info('Exchange routes loaded successfully');
} catch (error) {
  logger.error('Failed to load exchange routes:', error.message);
}

try {
  const userRoutes = require('./routes/users');
  app.use('/api/users', userRoutes);
  logger.info('User routes loaded successfully');
} catch (error) {
  logger.error('Failed to load user routes:', error.message);
}

try {
  const walletRoutes = require('./routes/wallets');
  app.use('/api/wallets', walletRoutes);
  logger.info('Wallet routes loaded successfully');
} catch (error) {
  logger.error('Failed to load wallet routes:', error.message);
}

try {
  const auth2faRoutes = require('./routes/auth2fa');
  app.use('/api/auth/2fa', auth2faRoutes);
  logger.info('2FA routes loaded successfully');
} catch (error) {
  logger.error('Failed to load 2FA routes:', error.message);
}

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
logger.info('Trying to connect to MongoDB...');

// Поддерживаем разные варианты переменных окружения
const mongoUrl = process.env.MONGODB_URI || process.env.MONGO_URL || 'mongodb://localhost:27017/lira-rub-exchange';
logger.info('MongoDB URL configured:', mongoUrl.replace(/\/\/.*@/, '//<credentials>@')); // Скрываем пароль в логах

mongoose.set('strictQuery', false); // Добавляем, чтобы убрать предупреждение

// Добавляем обработчики событий для соединения с MongoDB
mongoose.connection.on('connected', () => {
  logger.info('MongoDB connected successfully');
});

mongoose.connection.on('error', (err) => {
  logger.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected');
});

// Используем вариант с коллбэком для проверки подключения
mongoose.connect(mongoUrl, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 10000, // Увеличиваем таймаут для Railway
  socketTimeoutMS: 45000, // Таймаут сокета в 45 секунд
  maxPoolSize: 10 // Ограничиваем размер пула соединений
})
  .then(() => {
    logger.info('MongoDB connected successfully');
    
    // Запускаем сервис обработки платежей только если MongoDB подключен
    if (process.env.ENABLE_PAYMENT_PROCESSOR !== 'false') {
      logger.info('Starting payment processor service');
      try {
        paymentProcessor.start();
      } catch (error) {
        logger.error('Failed to start payment processor:', error.message);
      }
    } else {
      logger.info('Payment processor disabled via environment variable');
    }
    
    // Запускаем сервис обновления курсов только если MongoDB подключен
    if (process.env.ENABLE_RATE_UPDATER !== 'false') {
      logger.info('Starting rate updater service');
      try {
        rateUpdater.start();
      } catch (error) {
        logger.error('Failed to start rate updater:', error.message);
      }
    } else {
      logger.info('Rate updater disabled via environment variable');
    }
    
    // Start server
    const PORT = process.env.PORT || 8080; // Railway обычно использует порт 8080
    app.listen(PORT, '0.0.0.0', () => { // Слушаем на всех интерфейсах
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  })
  .catch((err) => {
    logger.error('Failed to connect to MongoDB:', err.message);
    
    // В production всё равно запускаем сервер для health checks
    if (process.env.NODE_ENV === 'production') {
      logger.warn('Starting server without MongoDB in production mode');
      const PORT = process.env.PORT || 8080;
      app.listen(PORT, '0.0.0.0', () => {
        logger.info(`Server running on port ${PORT} (MongoDB connection failed)`);
      });
    } else {
      process.exit(1);
    }
  });

// Планировщик проверки использования памяти
setInterval(() => {
  const memoryUsage = process.memoryUsage();
  const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
  const rssMemoryMB = Math.round(memoryUsage.rss / 1024 / 1024);
  
  logger.info(`Memory usage: Heap: ${heapUsedMB} MB, RSS: ${rssMemoryMB} MB`);
  
  // Если память превышает критический порог (например, 500 МБ), инициируем сборку мусора
  if (heapUsedMB > 500) {
    logger.warn(`High memory usage detected: ${heapUsedMB} MB. Trying to collect garbage.`);
    try {
      if (global.gc) {
        global.gc();
        logger.info('Garbage collection completed');
      } else {
        logger.warn('Garbage collection not available. Run with --expose-gc flag.');
      }
    } catch (e) {
      logger.error(`Error during garbage collection: ${e.message}`);
    }
  }
}, 60000); // Проверяем каждую минуту

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