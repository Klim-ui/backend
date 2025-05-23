const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables первым делом
dotenv.config();

// Fallback logger
const logger = {
  info: console.log,
  error: console.error,
  warn: console.warn
};

// Fallback services
const paymentProcessor = { start: () => {}, stop: () => {} };
const rateUpdater = { start: () => {}, stop: () => {} };

// Initialize Express app
const app = express();

// Переменные для мониторинга ресурсов
const resources = {
  activeRequests: 0,
  maxConcurrentRequests: 100,
  requestCount: 0,
  lastMinuteRequests: 0,
  lastResetTime: Date.now()
};

// Настройка CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Middleware для мониторинга ресурсов
app.use((req, res, next) => {
  const now = Date.now();
  
  if (now - resources.lastResetTime > 60000) {
    resources.lastMinuteRequests = resources.requestCount;
    resources.requestCount = 0;
    resources.lastResetTime = now;
    logger.info(`Resource usage: Active requests: ${resources.activeRequests}, Last minute requests: ${resources.lastMinuteRequests}`);
  }
  
  resources.activeRequests++;
  resources.requestCount++;
  
  if (resources.activeRequests > resources.maxConcurrentRequests) {
    logger.warn(`Too many concurrent requests: ${resources.activeRequests}, max: ${resources.maxConcurrentRequests}`);
    return res.status(503).json({
      success: false,
      message: 'Server is under heavy load, please try again later'
    });
  }
  
  res.on('finish', () => {
    resources.activeRequests--;
  });
  
  next();
});

// Диагностический middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// Корневой маршрут
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'LIRA Exchange API Server',
    status: 'online',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    mode: 'minimal',
    resources: {
      activeRequests: resources.activeRequests,
      requestsPerMinute: resources.lastMinuteRequests
    }
  });
});

// Health check для Railway
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    database: 'not_configured',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    mode: 'minimal'
  });
});

// API Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    database: 'not_configured',
    timestamp: new Date().toISOString(),
    services: {
      database: false,
      api: true
    },
    mode: 'minimal'
  });
});

// Статус сервера
app.get('/status', (req, res) => {
  const memoryUsage = process.memoryUsage();
  
  res.status(200).json({
    success: true,
    status: 'online',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mode: 'minimal',
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
  res.status(204).end();
});

// Базовые API роуты (mock данные для тестирования)
app.get('/api/exchange/rates', (req, res) => {
  res.json({
    success: true,
    data: {
      TRY_RUB: 3.45,
      RUB_TRY: 0.29,
      timestamp: new Date().toISOString()
    }
  });
});

app.post('/api/users/register', (req, res) => {
  res.json({
    success: false,
    message: 'Registration temporarily disabled - database not configured'
  });
});

app.post('/api/users/login', (req, res) => {
  res.json({
    success: false,
    message: 'Login temporarily disabled - database not configured'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Server Error'
  });
});

// Start server immediately without database
const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
  logger.info(`LIRA Exchange Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Mode: Minimal (no database)`);
  logger.info(`Server started successfully!`);
});

// Планировщик проверки использования памяти
setInterval(() => {
  const memoryUsage = process.memoryUsage();
  const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
  const rssMemoryMB = Math.round(memoryUsage.rss / 1024 / 1024);
  
  logger.info(`Memory usage: Heap: ${heapUsedMB} MB, RSS: ${rssMemoryMB} MB`);
}, 60000);

// Обработчики завершения работы
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

function gracefulShutdown() {
  logger.info('Shutting down server...');
  process.exit(0);
} 