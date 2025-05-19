const express = require('express');
const router = express.Router();
const Wallet = require('../models/Wallet');
const User = require('../models/User');
const { protect, admin } = require('../middleware/auth');
const { TonClient } = require('ton');
const { mnemonicToPrivateKey, mnemonicNew } = require('ton-crypto');
const { WalletContractV4 } = require('ton');
const { generateTonWallet, checkTonBalance, getTonTransactions } = require('../utils/tonUtils');

// @route   GET /api/wallets
// @desc    Get all user wallets
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const wallets = await Wallet.find({ user: req.user.id, isActive: true });

    res.json({
      success: true,
      count: wallets.length,
      data: wallets
    });
  } catch (error) {
    req.logger?.error(`Get wallets error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error when fetching wallets'
    });
  }
});

// @route   POST /api/wallets
// @desc    Create new wallet
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { walletType } = req.body;
    
    if (!walletType) {
      return res.status(400).json({
        success: false,
        message: 'Please provide wallet type'
      });
    }
    
    // Check if user already has this type of wallet
    const existingWallet = await Wallet.findOne({
      user: req.user.id,
      walletType,
      isActive: true
    });
    
    if (existingWallet) {
      return res.status(400).json({
        success: false,
        message: `You already have an active ${walletType} wallet`
      });
    }
    
    let wallet;
    
    // Handle wallet creation based on type
    if (walletType === 'TON') {
      // Генерируем TON-кошелек с использованием нашей утилиты
      const tonWallet = await generateTonWallet();
      
      // Создаем объект кошелька в базе данных
      const newWallet = new Wallet({
        user: req.user.id,
        walletType,
        address: tonWallet.address,
        publicKey: tonWallet.publicKey,
        balance: 0,
        isActive: true,
        isHot: true
      });
      
      // Шифруем мнемонику перед сохранением
      newWallet.tonMnemonic = newWallet.encryptMnemonic(tonWallet.mnemonic);
      
      // Генерируем QR-код для адреса
      newWallet.qrCodeUrl = newWallet.generateQrCode();
      
      // Сохраняем кошелек
      await newWallet.save();
      
      // Удаляем конфиденциальные данные перед отправкой ответа
      wallet = newWallet.toObject();
      delete wallet.tonMnemonic;
      
    } else if (walletType === 'USDT_TRC20' || walletType === 'USDT_ERC20') {
      // Placeholder for other wallet types - would require integration with respective chains
      wallet = await Wallet.create({
        user: req.user.id,
        walletType,
        address: `PLACEHOLDER_${walletType}_ADDRESS_${Date.now()}`,
        balance: 0,
        isActive: true,
        isHot: true
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid wallet type'
      });
    }
    
    res.status(201).json({
      success: true,
      data: wallet
    });
  } catch (error) {
    req.logger?.error(`Create wallet error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error when creating wallet'
    });
  }
});

// @route   GET /api/wallets/:id
// @desc    Get wallet by ID
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const wallet = await Wallet.findOne({
      _id: req.params.id,
      user: req.user.id
    });
    
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found'
      });
    }
    
    // Обновляем баланс из блокчейна с использованием нашей утилиты
    if (wallet.walletType === 'TON') {
      try {
        const balance = await checkTonBalance(wallet.address);
        wallet.balance = balance;
        wallet.lastBalanceUpdate = Date.now();
        await wallet.save();
      } catch (tonError) {
        req.logger?.error(`TON balance update error: ${tonError.message}`);
        // Continue even if balance update fails
      }
    }
    
    res.json({
      success: true,
      data: wallet
    });
  } catch (error) {
    req.logger?.error(`Get wallet error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error when fetching wallet'
    });
  }
});

// @route   GET /api/wallets/:id/transactions
// @desc    Get wallet transactions
// @access  Private
router.get('/:id/transactions', protect, async (req, res) => {
  try {
    const wallet = await Wallet.findOne({
      _id: req.params.id,
      user: req.user.id
    });
    
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found'
      });
    }
    
    // Получаем транзакции из блокчейна
    if (wallet.walletType === 'TON') {
      try {
        const transactions = await getTonTransactions(wallet.address, 20);
        return res.json({
          success: true,
          count: transactions.length,
          data: transactions
        });
      } catch (tonError) {
        req.logger?.error(`TON transactions error: ${tonError.message}`);
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch TON transactions'
        });
      }
    }
    
    // Для других типов кошельков
    return res.json({
      success: true,
      count: 0,
      data: []
    });
  } catch (error) {
    req.logger?.error(`Get wallet transactions error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error when fetching transactions'
    });
  }
});

// @route   POST /api/wallets/transfer
// @desc    Transfer funds from wallet
// @access  Private
router.post('/transfer', protect, async (req, res) => {
  try {
    const { walletId, toAddress, amount } = req.body;
    
    if (!walletId || !toAddress || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Please provide walletId, toAddress, and amount'
      });
    }
    
    const wallet = await Wallet.findOne({
      _id: walletId,
      user: req.user.id,
      isActive: true
    }).select('+tonMnemonic +privateKeyEncrypted');
    
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found'
      });
    }
    
    // Check if user has KYC verified for large transfers
    const user = await User.findById(req.user.id);
    if (!user.kycVerified && amount > 1000) { // Arbitrary limit, adjust as needed
      return res.status(403).json({
        success: false,
        message: 'KYC verification required for transfers over 1000 units'
      });
    }
    
    let txId = '';
    
    // Handle transfer based on wallet type
    if (wallet.walletType === 'TON') {
      // This is a simplified version - in production, a more secure approach is needed
      try {
        // Check if balance is sufficient
        const tonClient = req.tonClient || new TonClient({
          endpoint: process.env.TON_ENDPOINT || 'https://toncenter.com/api/v2/jsonRPC'
        });
        
        const walletInfo = await tonClient.getWalletInfo(wallet.address);
        const currentBalance = walletInfo.balance / 1e9; // Convert from nanoTON to TON
        
        if (currentBalance < amount) {
          return res.status(400).json({
            success: false,
            message: `Insufficient balance. Available: ${currentBalance} TON`
          });
        }
        
        // In a real implementation, this would use the mnemonic to create a signer and send the transaction
        // For security, this should be done in a separate secure service
        
        // Placeholder for transaction
        txId = `TON_TX_${Date.now()}`;
        
        // Update wallet balance (simplified)
        wallet.balance = currentBalance - amount;
        wallet.lastBalanceUpdate = Date.now();
        wallet.lastUsed = Date.now();
        await wallet.save();
      } catch (tonError) {
        req.logger?.error(`TON transfer error: ${tonError.message}`);
        return res.status(500).json({
          success: false,
          message: 'TON transfer failed'
        });
      }
    } else {
      // Placeholder for other wallet types
      return res.status(501).json({
        success: false,
        message: `Transfers for ${wallet.walletType} not implemented`
      });
    }
    
    res.json({
      success: true,
      message: 'Transfer initiated',
      txId
    });
  } catch (error) {
    req.logger?.error(`Transfer error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error when processing transfer'
    });
  }
});

// @route   GET /api/wallets/admin/all
// @desc    Get all wallets (admin only)
// @access  Private/Admin
router.get('/admin/all', protect, admin, async (req, res) => {
  try {
    const wallets = await Wallet.find({}).populate('user', 'firstName lastName email');
    
    res.json({
      success: true,
      count: wallets.length,
      data: wallets
    });
  } catch (error) {
    req.logger?.error(`Admin get wallets error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error when fetching wallets'
    });
  }
});

// @route   PUT /api/wallets/:id/deactivate
// @desc    Deactivate wallet
// @access  Private
router.put('/:id/deactivate', protect, async (req, res) => {
  try {
    const wallet = await Wallet.findOne({
      _id: req.params.id,
      user: req.user.id
    });
    
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found'
      });
    }
    
    wallet.isActive = false;
    await wallet.save();
    
    res.json({
      success: true,
      message: 'Wallet deactivated'
    });
  } catch (error) {
    req.logger?.error(`Deactivate wallet error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error when deactivating wallet'
    });
  }
});

module.exports = router; 