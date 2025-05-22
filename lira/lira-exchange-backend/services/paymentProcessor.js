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
    this.interval = process.env.PAYMENT_CHECK_INTERVAL || 60000; // По умолчанию 1 минута
    
    // Флаг активности сервиса
    this.isRunning = false;
    
    // Таймер для проверки платежей
    this.timer = null;
    
    // Счетчик обработанных платежей
    this.processingCount = 0;
    
    // Максимальное количество одновременных обработок
    this.maxConcurrent = 5;
    
    // Время последней обработки
    this.lastProcessTime = null;
    
    // Счетчик ошибок
    this.processingErrors = 0;
    
    // Счетчик последовательных ошибок
    this.consecutiveErrors = 0;
    
    // Флаг активного режима охлаждения
    this.cooldownActive = false;
  }
  
  /**
   * Инициализация сервиса
   */
  initialize(logger) {
    this.logger = logger;
    try {
      this.Exchange = require('../models/Exchange');
      logger.info('Payment processor initialized');
    } catch (error) {
      logger.error(`Failed to initialize payment processor: ${error.message}`);
    }
  }
  
  /**
   * Запускает сервис обработки платежей
   */
  start() {
    if (this.isRunning) {
      logger.info('Payment processor is already running');
      return;
    }
    
    // Проверяем, инициализирован ли Exchange
    if (!this.Exchange) {
      this.initialize(require('../config/logger'));
    }
    
    this.isRunning = true;
    logger.info(`Starting payment processor with interval ${this.interval}ms`);
    
    // Обработка платежей сразу при запуске
    this.processPayments();
    
    // Запускаем регулярные проверки
    this.timer = setInterval(() => {
      this.processPayments();
    }, this.interval);
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
   * Проверяет возможность обработки платежа
   */
  canProcess() {
    // Если достигнут лимит одновременных обработок
    if (this.processingCount >= this.maxConcurrent) {
      logger.warn(`Too many concurrent payment processing (${this.processingCount}/${this.maxConcurrent})`);
      return false;
    }
    
    // Если активен режим охлаждения после ошибок
    if (this.cooldownActive) {
      logger.warn('Processor in cooldown mode due to errors');
      return false;
    }
    
    // Добавляем минимальную паузу между запусками обработки (500 мс)
    if (this.lastProcessTime && Date.now() - this.lastProcessTime < 500) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Увеличивает счетчик ошибок и активирует режим охлаждения при необходимости
   */
  registerError() {
    this.processingErrors++;
    this.consecutiveErrors++;
    
    // Если много последовательных ошибок, активируем режим охлаждения
    if (this.consecutiveErrors >= 5) {
      this.cooldownActive = true;
      logger.warn('Activating cooldown mode due to consecutive errors');
      
      // Через 5 минут выключаем режим охлаждения
      setTimeout(() => {
        this.cooldownActive = false;
        this.consecutiveErrors = 0;
        logger.info('Cooldown mode deactivated');
      }, 5 * 60 * 1000);
    }
  }
  
  /**
   * Сбрасывает счетчик последовательных ошибок при успешной операции
   */
  registerSuccess() {
    this.consecutiveErrors = 0;
  }
  
  /**
   * Основной метод обработки платежей
   */
  async processPayments() {
    if (!this.canProcess()) {
      return;
    }
    
    this.processingCount++;
    this.lastProcessTime = Date.now();
    
    try {
      logger.info('Processing payments...');
      
      // Находим все обмены, ожидающие обработки
      const pendingExchanges = await this.Exchange.find({
        status: 'initiated',
        'sourceTransaction.status': 'pending'
      }).populate('cryptoWallet');
      
      logger.info(`Found ${pendingExchanges.length} pending exchanges`);
      
      // Обрабатываем каждый обмен с небольшой паузой между операциями
      for (let i = 0; i < pendingExchanges.length; i++) {
        const exchange = pendingExchanges[i];
        
        try {
          // Обрабатываем платеж
          await this.processExchange(exchange);
          this.registerSuccess();
          
          // Добавляем небольшую паузу между обработкой разных обменов
          if (i < pendingExchanges.length - 1) {
            await this.sleep(300); // 300 мс пауза
          }
        } catch (exchangeError) {
          logger.error(`Error processing exchange ${exchange._id}: ${exchangeError.message}`);
          this.registerError();
          
          // Делаем более длинную паузу после ошибки
          await this.sleep(1000);
        }
      }
      
    } catch (error) {
      logger.error(`Payment processing error: ${error.message}`);
      this.registerError();
    } finally {
      this.processingCount--;
    }
  }
  
  /**
   * Обрабатывает один обмен
   * @param {Object} exchange - Объект обмена
   */
  async processExchange(exchange) {
    logger.info(`Processing exchange: ${exchange._id}`);
    
    // Проверяем тип обмена
    if (exchange.fromCurrency === 'TON' && exchange.cryptoWallet) {
      await this.processTonExchange(exchange);
    } else {
      // Для других типов обменов дополнительная логика будет добавлена позже
      logger.info(`Skipping non-TON exchange: ${exchange._id}`);
    }
  }
  
  /**
   * Обрабатывает TON обмен
   * @param {Object} exchange - Объект обмена
   */
  async processTonExchange(exchange) {
    try {
      const wallet = exchange.cryptoWallet;
      
      if (!wallet) {
        logger.warn(`No wallet found for exchange: ${exchange._id}`);
        return;
      }
      
      // Проверяем, не слишком ли частые запросы к TON API
      if (wallet.lastBalanceUpdate && Date.now() - wallet.lastBalanceUpdate < 60000) {
        logger.info(`Skipping TON check for exchange ${exchange._id}, last check was less than 1 minute ago`);
        return;
      }
      
      // Получаем баланс кошелька
      const balance = await checkTonBalance(wallet.address);
      
      // Обновляем баланс кошелька
      wallet.balance = balance;
      wallet.lastBalanceUpdate = Date.now();
      await wallet.save();
      
      logger.info(`TON Wallet ${wallet.address} balance: ${balance}`);
      
      // Если баланс достаточен, подтверждаем оплату
      if (balance >= exchange.fromAmount) {
        logger.info(`Payment confirmed for exchange ${exchange._id}, balance: ${balance}, required: ${exchange.fromAmount}`);
        
        // Обновляем статус транзакции
        exchange.sourceTransaction = {
          ...exchange.sourceTransaction,
          status: 'completed',
          txId: 'AUTO_CONFIRMED_' + Date.now()
        };
        
        exchange.status = 'processing';
        await exchange.save();
      }
    } catch (error) {
      logger.error(`Error processing TON exchange ${exchange._id}: ${error.message}`);
      throw error; // Пробрасываем ошибку для общей обработки
    }
  }
  
  // Добавим задержку между операциями
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new PaymentProcessor(); 