const express = require('express');
const router = express.Router();
const Exchange = require('../models/Exchange');
const Rate = require('../models/Rate');
const Wallet = require('../models/Wallet');
const User = require('../models/User');
const { TonClient } = require('ton');
const { mnemonicToPrivateKey } = require('ton-crypto');

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
    const exchange = await Exchange.create({
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
    
    // If crypto exchange is involved, create or assign a wallet
    if (fromCurrency === 'TON' || toCurrency === 'TON') {
      // Check if user already has a TON wallet
      let wallet = await Wallet.findOne({
        user: req.user.id,
        walletType: 'TON',
        isActive: true
      });
      
      // If no wallet, create one (simplified; actual implementation would need TON wallet creation logic)
      if (!wallet) {
        wallet = await Wallet.create({
          user: req.user.id,
          walletType: 'TON',
          address: 'TEMPORARY_ADDRESS_' + Date.now(), // Placeholder
          isActive: true
        });
      }
      
      // Assign wallet to exchange
      exchange.cryptoWallet = wallet._id;
      await exchange.save();
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

module.exports = router; 