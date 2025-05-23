const express = require('express');
const router = express.Router();
const Exchange = require('../models/Exchange');
const Rate = require('../models/Rate');
const Wallet = require('../models/Wallet');
const User = require('../models/User');
// Импортируем сервис email уведомлений
const emailService = require('../services/emailService');

// Middleware for checking authentication (to be implemented)
const { protect, admin } = require('../middleware/auth');

// Создаем объект для хранения счетчиков запросов
const requestCounts = {
  rates: {
    count: 0,
    resetTime: Date.now() + 60000, // сбрасываем счетчик каждую минуту
    limit: 100 // лимит запросов в минуту
  }
};

// Middleware для ограничения частоты запросов
const rateLimiter = (resource) => (req, res, next) => {
  const now = Date.now();
  
  // Сбрасываем счетчик, если прошло достаточно времени
  if (now > requestCounts[resource].resetTime) {
    requestCounts[resource].count = 0;
    requestCounts[resource].resetTime = now + 60000;
  }
  
  // Увеличиваем счетчик
  requestCounts[resource].count++;
  
  // Проверяем, не превышен ли лимит
  if (requestCounts[resource].count > requestCounts[resource].limit) {
    return res.status(429).json({
      success: false,
      message: 'Too many requests, please try again later'
    });
  }
  
  next();
};

// Get current exchange rates
router.get('/rates', rateLimiter('rates'), async (req, res) => {
  try {
    const { from, to } = req.query;
    
    // Получаем курсы из базы данных
    let query = { isActive: true };
    if (from) query.sourceCurrency = from.toUpperCase();
    if (to) query.targetCurrency = to.toUpperCase();
    
    const rates = await Rate.find(query);
    
    res.json({
      success: true,
      count: rates.length,
      data: rates
    });
  } catch (error) {
    console.error(`Rate fetch error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error when fetching rates'
    });
  }
});

// Start a new exchange (user must be authenticated)
router.post('/start', protect, async (req, res) => {
  try {
    const { fromCurrency, toCurrency, fromAmount, bankDetails } = req.body;
    
    // Validate request
    if (!fromCurrency || !toCurrency || !fromAmount) {
      return res.status(400).json({
        success: false,
        message: 'Please provide fromCurrency, toCurrency and fromAmount'
      });
    }
    
    // Если обмен на RUB, требуем банковские реквизиты
    if (toCurrency === 'RUB' && !bankDetails) {
      return res.status(400).json({
        success: false,
        message: 'Bank account details are required for RUB exchanges'
      });
    }
    
    // Get current rate for the currency pair
    const rate = await Rate.findOne({
      sourceCurrency: fromCurrency,
      targetCurrency: toCurrency,
      isActive: true
    });
    
    if (!rate) {
      return res.status(404).json({
        success: false,
        message: 'Exchange rate not found for this currency pair'
      });
    }
    
    // Validate exchange amount
    if (fromAmount < rate.minAmount || fromAmount > rate.maxAmount) {
      return res.status(400).json({
        success: false,
        message: `Amount must be between ${rate.minAmount} and ${rate.maxAmount} ${fromCurrency}`
      });
    }
    
    // Calculate exchange amount
    const exchangeRate = fromCurrency === 'TRY' || fromCurrency === 'RUB' ? 
      rate.buyRate : rate.sellRate;
      
    const toAmount = fromAmount * exchangeRate;
    
    // Calculate fee
    const feePercentage = 1.5; // 1.5% fee
    const feeAmount = toAmount * (feePercentage / 100);
    const finalAmount = toAmount - feeAmount;
    
    // Create exchange record
    const exchange = new Exchange({
      user: req.user.id,
      fromCurrency,
      toCurrency,
      fromAmount,
      toAmount: finalAmount,
      exchangeRate,
      feePercentage,
      feeAmount,
      status: 'initiated'
    });
    
    // Добавляем банковские реквизиты, если они предоставлены
    if (bankDetails) {
      exchange.bankAccount = {
        accountId: bankDetails.accountId,
        bank: bankDetails.bank,
        country: toCurrency === 'RUB' ? 'RU' : 'TR'
      };
    }
    
    await exchange.save();
    
    // Отправляем email уведомление пользователю
    try {
      await emailService.sendExchangeInitiated(req.user.email, exchange);
    } catch (emailError) {
      console.error(`Email notification error: ${emailError.message}`);
      // Не останавливаем выполнение если email не отправился
    }
    
    res.status(201).json({
      success: true,
      data: exchange
    });
  } catch (error) {
    console.error(`Exchange start error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error when starting exchange'
    });
  }
});

// Confirm source funds received (admin only)
router.put('/confirm-source/:id', protect, admin, async (req, res) => {
  try {
    const exchange = await Exchange.findById(req.params.id).populate('user', 'email firstName lastName');
    
    if (!exchange) {
      return res.status(404).json({
        success: false,
        message: 'Exchange not found'
      });
    }
    
    // Update source transaction status
    exchange.sourceTransaction = {
      ...exchange.sourceTransaction,
      status: 'completed',
      txId: req.body.txId || exchange.sourceTransaction?.txId
    };
    
    exchange.status = 'processing';
    await exchange.save();
    
    // Отправляем email уведомление пользователю
    try {
      await emailService.sendExchangeProcessing(exchange.user.email, exchange);
    } catch (emailError) {
      console.error(`Email notification error: ${emailError.message}`);
      // Не останавливаем выполнение если email не отправился
    }
    
    res.json({
      success: true,
      data: exchange
    });
  } catch (error) {
    console.error(`Confirm source error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error when confirming source funds'
    });
  }
});

// Complete exchange (admin only)
router.put('/complete/:id', protect, admin, async (req, res) => {
  try {
    const exchange = await Exchange.findById(req.params.id).populate('user', 'email firstName lastName');
    
    if (!exchange) {
      return res.status(404).json({
        success: false,
        message: 'Exchange not found'
      });
    }
    
    // Update destination transaction status
    exchange.destinationTransaction = {
      ...exchange.destinationTransaction,
      status: 'completed',
      txId: req.body.txId || exchange.destinationTransaction?.txId,
      bankReference: req.body.bankReference || exchange.destinationTransaction?.bankReference
    };
    
    exchange.status = 'completed';
    exchange.completedAt = Date.now();
    await exchange.save();
    
    // Отправляем email уведомление пользователю
    try {
      await emailService.sendExchangeCompleted(exchange.user.email, exchange);
    } catch (emailError) {
      console.error(`Email notification error: ${emailError.message}`);
      // Не останавливаем выполнение если email не отправился
    }
    
    res.json({
      success: true,
      data: exchange
    });
  } catch (error) {
    console.error(`Complete exchange error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error when completing exchange'
    });
  }
});

// Update admin notes (admin only)
router.put('/admin-notes/:id', protect, admin, async (req, res) => {
  try {
    const exchange = await Exchange.findById(req.params.id);
    
    if (!exchange) {
      return res.status(404).json({
        success: false,
        message: 'Exchange not found'
      });
    }
    
    // Update admin notes
    exchange.adminNotes = req.body.adminNotes || '';
    await exchange.save();
    
    res.json({
      success: true,
      message: 'Admin notes updated successfully',
      data: exchange
    });
  } catch (error) {
    console.error(`Update admin notes error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error when updating admin notes'
    });
  }
});

// Get user exchanges (authenticated user)
router.get('/my-exchanges', protect, async (req, res) => {
  try {
    const exchanges = await Exchange.find({ user: req.user.id })
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: exchanges.length,
      data: exchanges
    });
  } catch (error) {
    console.error(`My exchanges error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error when fetching exchanges'
    });
  }
});

// Get all exchanges (admin only)
router.get('/', protect, admin, async (req, res) => {
  try {
    const { status, fromDate, toDate } = req.query;
    
    // Build query
    let query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (fromDate && toDate) {
      query.createdAt = {
        $gte: new Date(fromDate),
        $lte: new Date(toDate)
      };
    }
    
    const exchanges = await Exchange.find(query)
      .populate('user', 'firstName lastName email')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: exchanges.length,
      data: exchanges
    });
  } catch (error) {
    console.error(`Get exchanges error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error when fetching exchanges'
    });
  }
});

// Calculate potential exchange (no auth required)
router.post('/calculate', async (req, res) => {
  try {
    const { fromCurrency, toCurrency, fromAmount } = req.body;
    
    // Validate request
    if (!fromCurrency || !toCurrency || !fromAmount) {
      return res.status(400).json({
        success: false,
        message: 'Please provide fromCurrency, toCurrency and fromAmount'
      });
    }
    
    // Get current rate for the currency pair
    const rate = await Rate.findOne({
      sourceCurrency: fromCurrency,
      targetCurrency: toCurrency,
      isActive: true
    });
    
    if (!rate) {
      return res.status(404).json({
        success: false,
        message: 'Exchange rate not found for this currency pair'
      });
    }
    
    // Calculate exchange amount
    const exchangeRate = fromCurrency === 'TRY' || fromCurrency === 'RUB' ? 
      rate.buyRate : rate.sellRate;
      
    const toAmount = fromAmount * exchangeRate;
    
    // Calculate fee
    const feePercentage = 1.5; // 1.5% fee
    const feeAmount = toAmount * (feePercentage / 100);
    const finalAmount = toAmount - feeAmount;
    
    res.json({
      success: true,
      data: {
        fromCurrency,
        toCurrency,
        fromAmount,
        toAmount: finalAmount,
        exchangeRate,
        feePercentage,
        feeAmount
      }
    });
  } catch (error) {
    console.error(`Calculate exchange error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error when calculating exchange'
    });
  }
});

// Тестовые курсы валют для инициализации
const testRates = [
  {
    sourceCurrency: "TRY",
    targetCurrency: "RUB",
    baseRate: 2.4,
    buyRate: 2.5,  
    sellRate: 2.3,
    source: "manual",
    minAmount: 100,
    maxAmount: 50000,
    isActive: true
  },
  {
    sourceCurrency: "RUB",
    targetCurrency: "TRY",
    baseRate: 0.38,
    buyRate: 0.4,
    sellRate: 0.35,
    source: "manual",
    minAmount: 1000,
    maxAmount: 1000000,
    isActive: true
  }
];

// Добавить тестовые курсы валют (только для разработки)
router.post('/init-test-rates', protect, admin, async (req, res) => {
  try {
    // Удаляем существующие курсы (опционально)
    await Rate.deleteMany({});
    
    // Добавляем тестовые курсы
    const results = await Rate.insertMany(testRates);
    
    res.status(201).json({
      success: true,
      message: `Добавлено ${results.length} тестовых курсов валют`,
      data: results
    });
  } catch (error) {
    console.error(`Init test rates error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Ошибка при добавлении тестовых курсов валют'
    });
  }
});

// Простой тестовый эндпоинт для публичного добавления курсов (без авторизации)
router.get('/init-public-rates', async (req, res) => {
  try {
    // Проверяем, есть ли уже курсы
    const existingRates = await Rate.find();
    
    if (existingRates.length > 0) {
      return res.json({
        success: true,
        message: `Курсы валют уже существуют (${existingRates.length} записей)`,
        data: existingRates
      });
    }
    
    // Добавляем тестовые курсы
    const results = await Rate.insertMany(testRates);
    
    res.status(201).json({
      success: true,
      message: `Добавлено ${results.length} тестовых курсов валют`,
      data: results
    });
  } catch (error) {
    console.error(`Init public rates error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Ошибка при добавлении тестовых курсов валют'
    });
  }
});

// Простой тестовый эндпоинт
router.get('/ping', (req, res) => {
  return res.status(200).json({
    message: 'Exchange API работает',
    success: true,
    timestamp: new Date().toISOString()
  });
});

// Get admin notifications (admin only)
router.get('/admin/notifications', protect, admin, async (req, res) => {
  try {
    // Получаем обмены, требующие внимания админа
    const notifications = [];
    
    // 1. Новые обмены (инициированные более 5 минут назад)
    const newExchanges = await Exchange.find({
      status: 'initiated',
      createdAt: { $lt: new Date(Date.now() - 5 * 60 * 1000) } // 5 минут назад
    }).populate('user', 'firstName lastName email');
    
    newExchanges.forEach(exchange => {
      notifications.push({
        id: exchange._id,
        type: 'new_exchange',
        priority: 'high',
        title: 'Новый обмен требует подтверждения',
        message: `Обмен ${exchange.fromCurrency} → ${exchange.toCurrency} от ${exchange.user.firstName} ${exchange.user.lastName}`,
        exchangeId: exchange._id,
        userId: exchange.user._id,
        createdAt: exchange.createdAt,
        data: {
          amount: exchange.fromAmount,
          fromCurrency: exchange.fromCurrency,
          toCurrency: exchange.toCurrency,
          userEmail: exchange.user.email
        }
      });
    });
    
    // 2. Обмены в статусе "в обработке" более 1 часа
    const stuckExchanges = await Exchange.find({
      status: 'processing',
      updatedAt: { $lt: new Date(Date.now() - 60 * 60 * 1000) } // 1 час назад
    }).populate('user', 'firstName lastName email');
    
    stuckExchanges.forEach(exchange => {
      notifications.push({
        id: exchange._id + '_stuck',
        type: 'stuck_exchange',
        priority: 'medium',
        title: 'Обмен задерживается',
        message: `Обмен в обработке уже ${Math.round((Date.now() - exchange.updatedAt) / (60 * 60 * 1000))} час(ов)`,
        exchangeId: exchange._id,
        userId: exchange.user._id,
        createdAt: exchange.updatedAt,
        data: {
          amount: exchange.fromAmount,
          fromCurrency: exchange.fromCurrency,
          toCurrency: exchange.toCurrency,
          userEmail: exchange.user.email,
          hoursStuck: Math.round((Date.now() - exchange.updatedAt) / (60 * 60 * 1000))
        }
      });
    });
    
    // Сортируем уведомления по приоритету и времени
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    notifications.sort((a, b) => {
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    
    res.json({
      success: true,
      count: notifications.length,
      data: notifications,
      stats: {
        new: newExchanges.length,
        stuck: stuckExchanges.length,
        failed: 0
      }
    });
    
  } catch (error) {
    console.error(`Get notifications error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error when fetching notifications'
    });
  }
});

module.exports = router; 