const Exchange = require('../models/Exchange');
const Wallet = require('../models/Wallet');
const { checkTonBalance, sendTon } = require('../utils/tonUtils');
const logger = require('../config/logger');

/**
 * Сервис для автоматического обнаружения и обработки платежей
 */
class PaymentProcessor {
  constructor() {
    // Интервал проверки платежей (в миллисекундах)
    this.checkInterval = process.env.PAYMENT_CHECK_INTERVAL || 60000; // По умолчанию 1 минута
    
    // Флаг активности сервиса
    this.isRunning = false;
    
    // Таймер для проверки платежей
    this.timer = null;
  }
  
  /**
   * Запускает сервис обработки платежей
   */
  start() {
    if (this.isRunning) {
      logger.info('Payment processor is already running');
      return;
    }
    
    this.isRunning = true;
    logger.info(`Starting payment processor with interval ${this.checkInterval}ms`);
    
    // Немедленно запускаем первую проверку
    this.checkPendingPayments();
    
    // Запускаем регулярные проверки
    this.timer = setInterval(() => {
      this.checkPendingPayments();
    }, this.checkInterval);
  }
  
  /**
   * Останавливает сервис обработки платежей
   */
  stop() {
    if (!this.isRunning) {
      logger.info('Payment processor is already stopped');
      return;
    }
    
    this.isRunning = false;
    logger.info('Stopping payment processor');
    
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
  
  /**
   * Проверяет все ожидающие платежи
   */
  async checkPendingPayments() {
    try {
      logger.info('Checking pending payments...');
      
      // Находим все обмены со статусом 'initiated'
      const pendingExchanges = await Exchange.find({
        status: 'initiated',
        $or: [
          { fromCurrency: 'TON' },
          { toCurrency: 'TON' }
        ]
      }).populate('cryptoWallet user');
      
      logger.info(`Found ${pendingExchanges.length} pending exchanges`);
      
      // Обрабатываем каждый обмен
      for (const exchange of pendingExchanges) {
        try {
          await this.processExchange(exchange);
        } catch (error) {
          logger.error(`Error processing exchange ${exchange._id}: ${error.message}`);
        }
      }
      
      // Находим все обмены со статусом 'processing'
      const processingExchanges = await Exchange.find({
        status: 'processing',
        toCurrency: 'TON'
      }).populate('cryptoWallet user');
      
      logger.info(`Found ${processingExchanges.length} processing exchanges`);
      
      // Обрабатываем каждый обмен
      for (const exchange of processingExchanges) {
        try {
          await this.completeExchange(exchange);
        } catch (error) {
          logger.error(`Error completing exchange ${exchange._id}: ${error.message}`);
        }
      }
      
    } catch (error) {
      logger.error(`Error checking pending payments: ${error.message}`);
    }
  }
  
  /**
   * Обрабатывает один обмен
   * @param {Object} exchange - Объект обмена
   */
  async processExchange(exchange) {
    // Проверяем, что у обмена есть связанный кошелек
    if (!exchange.cryptoWallet) {
      logger.warn(`Exchange ${exchange._id} has no associated wallet`);
      return;
    }
    
    // Если исходная валюта TON, проверяем поступление средств
    if (exchange.fromCurrency === 'TON') {
      return await this.checkTonDeposit(exchange);
    }
  }
  
  /**
   * Проверяет поступление TON на кошелек
   * @param {Object} exchange - Объект обмена
   */
  async checkTonDeposit(exchange) {
    const wallet = exchange.cryptoWallet;
    
    // Проверяем баланс кошелька
    const balance = await checkTonBalance(wallet.address);
    
    // Обновляем баланс кошелька
    wallet.balance = balance;
    wallet.lastBalanceUpdate = Date.now();
    await wallet.save();
    
    logger.info(`Wallet ${wallet.address} has balance ${balance} TON`);
    
    // Если баланс достаточен для обмена
    if (balance >= exchange.fromAmount) {
      logger.info(`Sufficient balance for exchange ${exchange._id}. Confirming payment...`);
      
      // Обновляем статус транзакции
      exchange.sourceTransaction = {
        ...exchange.sourceTransaction,
        status: 'completed',
        txId: `AUTO_CONFIRMED_${Date.now()}`
      };
      
      exchange.status = 'processing';
      await exchange.save();
      
      logger.info(`Exchange ${exchange._id} updated to processing status`);
      
      // Если целевая валюта RUB и есть банковские реквизиты, отправляем уведомление администраторам
      if (exchange.toCurrency === 'RUB' && exchange.bankAccount) {
        // В реальной системе здесь бы отправлялось уведомление администратору
        logger.info(`RUB payout required for exchange ${exchange._id} to bank account ${exchange.bankAccount.bank}`);
      }
    } else {
      logger.info(`Waiting for funds for exchange ${exchange._id}. Current: ${balance}, Required: ${exchange.fromAmount}`);
    }
  }
  
  /**
   * Завершает обмен, отправляя TON
   * @param {Object} exchange - Объект обмена
   */
  async completeExchange(exchange) {
    // Завершаем только если целевая валюта TON
    if (exchange.toCurrency !== 'TON') return;
    
    try {
      // Получаем кошелек для отправки TON
      const adminWallet = await Wallet.findOne({
        walletType: 'TON',
        isHot: true,
        isActive: true,
        balance: { $gte: exchange.toAmount }
      }).select('+tonMnemonic');
      
      if (!adminWallet) {
        logger.warn(`No admin wallet with sufficient balance found for exchange ${exchange._id}`);
        return;
      }
      
      // Расшифровываем мнемонику
      const mnemonic = adminWallet.decryptMnemonic();
      
      // Получаем адрес получателя
      const destinationAddress = exchange.destinationTransaction?.address;
      
      if (!destinationAddress) {
        logger.warn(`No destination address found for exchange ${exchange._id}`);
        return;
      }
      
      // Отправляем TON
      const transaction = await sendTon(mnemonic, destinationAddress, exchange.toAmount);
      
      // Обновляем статус транзакции
      exchange.destinationTransaction = {
        ...exchange.destinationTransaction,
        status: 'completed',
        txId: transaction.hash
      };
      
      exchange.status = 'completed';
      exchange.completedAt = Date.now();
      await exchange.save();
      
      // Обновляем баланс кошелька
      adminWallet.balance -= exchange.toAmount;
      adminWallet.lastBalanceUpdate = Date.now();
      await adminWallet.save();
      
      logger.info(`Exchange ${exchange._id} completed successfully. Sent ${exchange.toAmount} TON to ${destinationAddress}`);
    } catch (error) {
      logger.error(`Error completing exchange ${exchange._id}: ${error.message}`);
    }
  }
}

module.exports = new PaymentProcessor(); 