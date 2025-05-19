const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
// Комментируем TON для отладки
// const { TonClient } = require('ton');
const winston = require('winston');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

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

// Make TON client available in req
app.use((req, res, next) => {
  // req.tonClient = tonClient;
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
console.log('Trying to connect to MongoDB with URL:', process.env.MONGO_URL);
mongoose.set('strictQuery', false); // Добавляем, чтобы убрать предупреждение
mongoose.connect(process.env.MONGO_URL || 'mongodb://localhost:27017/lira-rub-exchange', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => {
    logger.info('MongoDB connected');
    
    // Start server
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection full error:', err);
    logger.error('MongoDB connection error:', err.message);
    process.exit(1);
  }); 