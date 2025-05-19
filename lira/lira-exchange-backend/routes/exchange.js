const express = require('express');
const router = express.Router();
const Exchange = require('../models/Exchange');
const Rate = require('../models/Rate');
const Wallet = require('../models/Wallet');
const User = require('../models/User');
// Раскомментируем TON-функциональность
const { TonClient } = require('@ton/ton');
const { mnemonicToPrivateKey } = require('@ton/crypto');
// Импортируем наши TON утилиты
const { generateTonWallet, checkTonBalance, getTonTransactions } = require('../utils/tonUtils');

// Middleware for checking authentication (to be implemented)
const { protect, admin } = require('../middleware/auth');

// Get current exchange rates
router.get('/rates', async (req, res) => {
  try {
    const { from, to } = req.query;
    
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
    req.logger.error(`Rate fetch error: ${error.message}`);
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
    
    // Если обмен через TON
    if (fromCurrency === 'TON' || toCurrency === 'TON') {
      let wallet;
      
      // Проверяем, есть ли у пользователя уже TON кошелек
      wallet = await Wallet.findOne({
        user: req.user.id,
        walletType: 'TON',
        isActive: true
      });
      
      // Если кошелька нет, создаем новый
      if (!wallet) {
        // Генерируем новый TON кошелек
        const tonWallet = await generateTonWallet();
        
        // Создаем новый кошелек в базе данных
        wallet = new Wallet({
          user: req.user.id,
          walletType: 'TON',
          address: tonWallet.address,
          publicKey: tonWallet.publicKey,
          balance: 0,
          isActive: true,
          isHot: true
        });
        
        // Шифруем мнемонику
        wallet.tonMnemonic = wallet.encryptMnemonic(tonWallet.mnemonic);
        
        // Генерируем QR-код
        wallet.qrCodeUrl = wallet.generateQrCode();
        
        await wallet.save();
      }
      
      // Привязываем кошелек к обмену
      exchange.cryptoWallet = wallet._id;
      
      // Если исходная валюта TON, устанавливаем статус "ожидание подтверждения"
      if (fromCurrency === 'TON') {
        exchange.sourceTransaction = {
          status: 'pending',
          address: wallet.address
        };
      }
      
      // Если целевая валюта TON, подготавливаем транзакцию отправки
      if (toCurrency === 'TON') {
        exchange.destinationTransaction = {
          status: 'pending',
          address: req.body.tonAddress || wallet.address
        };
      }
    }
    
    await exchange.save();
    
    // Привязываем транзакцию к кошельку, если он существует
    if (exchange.cryptoWallet) {
      const wallet = await Wallet.findById(exchange.cryptoWallet);
      if (wallet) {
        if (!wallet.transactions) wallet.transactions = [];
        wallet.transactions.push(exchange._id);
        await wallet.save();
      }
    }
    
    res.status(201).json({
      success: true,
      data: exchange
    });
  } catch (error) {
    req.logger.error(`Exchange start error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error when starting exchange'
    });
  }
});

// Check TON payment status
router.get('/check-payment/:id', protect, async (req, res) => {
  try {
    const exchange = await Exchange.findOne({
      _id: req.params.id,
      user: req.user.id
    }).populate('cryptoWallet');
    
    if (!exchange) {
      return res.status(404).json({
        success: false,
        message: 'Exchange not found'
      });
    }
    
    // Проверяем только транзакции с TON
    if (exchange.fromCurrency === 'TON' && exchange.status === 'initiated') {
      // Получаем адрес кошелька
      const wallet = exchange.cryptoWallet;
      
      if (!wallet) {
        return res.status(400).json({
          success: false,
          message: 'No wallet associated with this exchange'
        });
      }
      
      // Проверяем баланс
      const balance = await checkTonBalance(wallet.address);
      
      // Обновляем баланс кошелька
      wallet.balance = balance;
      wallet.lastBalanceUpdate = Date.now();
      await wallet.save();
      
      // Если баланс равен или больше суммы обмена, подтверждаем оплату
      if (balance >= exchange.fromAmount) {
        // Обновляем статус транзакции
        exchange.sourceTransaction = {
          ...exchange.sourceTransaction,
          status: 'completed',
          txId: 'AUTO_CONFIRMED_' + Date.now()
        };
        
        exchange.status = 'processing';
        await exchange.save();
        
        return res.json({
          success: true,
          message: 'Payment confirmed',
          data: {
            status: exchange.status,
            balance
          }
        });
      }
      
      // Если баланс недостаточен
      return res.json({
        success: true,
        message: 'Waiting for payment',
        data: {
          status: 'waiting',
          balance,
          required: exchange.fromAmount
        }
      });
    }
    
    // Для других валют или статусов
    return res.json({
      success: true,
      message: 'No payment check needed',
      data: {
        status: exchange.status
      }
    });
  } catch (error) {
    req.logger.error(`Check payment error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error when checking payment'
    });
  }
});

// Confirm source funds received (admin only)
router.put('/confirm-source/:id', protect, admin, async (req, res) => {
  try {
    const exchange = await Exchange.findById(req.params.id);
    
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
    
    res.json({
      success: true,
      data: exchange
    });
  } catch (error) {
    req.logger.error(`Confirm source error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error when confirming source funds'
    });
  }
});

// Complete exchange (admin only)
router.put('/complete/:id', protect, admin, async (req, res) => {
  try {
    const exchange = await Exchange.findById(req.params.id);
    
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
    
    res.json({
      success: true,
      data: exchange
    });
  } catch (error) {
    req.logger.error(`Complete exchange error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error when completing exchange'
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
    req.logger.error(`My exchanges error: ${error.message}`);
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
    req.logger.error(`Get exchanges error: ${error.message}`);
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
    req.logger.error(`Calculate exchange error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error when calculating exchange'
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

module.exports = router; 