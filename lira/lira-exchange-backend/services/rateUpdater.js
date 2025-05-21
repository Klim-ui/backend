const { updateExchangeRates } = require('../utils/bybitUtils');
const Rate = require('../models/Rate');
const logger = require('../config/logger');

/**
 * Сервис для автоматического обновления курсов обмена
 */
class RateUpdater {
  constructor() {
    // Интервал обновления курсов (в миллисекундах)
    this.updateInterval = process.env.RATE_UPDATE_INTERVAL || 60000; // По умолчанию 1 минута
    
    // Флаг активности сервиса
    this.isRunning = false;
    
    // Таймер для обновления курсов
    this.timer = null;
  }
  
  /**
   * Запускает сервис обновления курсов
   */
  start() {
    if (this.isRunning) {
      logger.info('Rate updater is already running');
      return;
    }
    
    this.isRunning = true;
    logger.info(`Starting rate updater with interval ${this.updateInterval}ms`);
    
    // Немедленно запускаем первое обновление
    this.updateRates();
    
    // Запускаем регулярные обновления
    this.timer = setInterval(() => {
      this.updateRates();
    }, this.updateInterval);
  }
  
  /**
   * Останавливает сервис обновления курсов
   */
  stop() {
    if (!this.isRunning) {
      logger.info('Rate updater is already stopped');
      return;
    }
    
    this.isRunning = false;
    logger.info('Stopping rate updater');
    
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
  
  /**
   * Обновляет курсы обмена
   */
  async updateRates() {
    try {
      logger.info('Updating exchange rates...');
      
      // Обновляем курсы через Bybit API
      const updatedRates = await updateExchangeRates(Rate);
      
      logger.info(`Exchange rates updated: ${updatedRates.length} rates`);
      updatedRates.forEach(rate => {
        logger.info(`${rate.sourceCurrency} -> ${rate.targetCurrency}: Buy: ${rate.buyRate}, Sell: ${rate.sellRate}`);
      });
    } catch (error) {
      logger.error(`Error updating exchange rates: ${error.message}`);
    }
  }
}

module.exports = new RateUpdater(); 