const { updateExchangeRates } = require('../utils/bybitUtils');
const Rate = require('../models/Rate');
const logger = require('../config/logger');

/**
 * Сервис для автоматического обновления курсов обмена
 */
class RateUpdater {
  constructor() {
    // Интервал обновления курсов (в миллисекундах)
    this.updateInterval = process.env.RATE_UPDATE_INTERVAL || 300000; // По умолчанию 5 минут вместо 1 минуты
    
    // Флаг активности сервиса
    this.isRunning = false;
    
    // Таймер для обновления курсов
    this.timer = null;
    
    // Кэш последних полученных курсов
    this.ratesCache = null;
    
    // Время последнего успешного обновления
    this.lastSuccessfulUpdate = null;
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
   * Получает кэшированные курсы или обновляет их
   * @returns {Array} Массив курсов
   */
  async getCachedRates() {
    // Если кэш есть и он не старше 5 минут, возвращаем его
    const cacheValidTime = 5 * 60 * 1000; // 5 минут
    if (
      this.ratesCache && 
      this.lastSuccessfulUpdate && 
      Date.now() - this.lastSuccessfulUpdate < cacheValidTime
    ) {
      logger.debug('Returning cached exchange rates');
      return this.ratesCache;
    }
    
    // Иначе обновляем курсы
    return await this.updateRates();
  }
  
  /**
   * Обновляет курсы обмена
   */
  async updateRates() {
    try {
      logger.info('Updating exchange rates...');
      
      // Обновляем курсы через Bybit API
      const updatedRates = await updateExchangeRates(Rate);
      
      // Обновляем кэш и время обновления
      this.ratesCache = updatedRates;
      this.lastSuccessfulUpdate = Date.now();
      
      logger.info(`Exchange rates updated: ${updatedRates.length} rates`);
      updatedRates.forEach(rate => {
        logger.info(`${rate.sourceCurrency} -> ${rate.targetCurrency}: Buy: ${rate.buyRate}, Sell: ${rate.sellRate}`);
      });
      
      return updatedRates;
    } catch (error) {
      logger.error(`Error updating exchange rates: ${error.message}`);
      
      // В случае ошибки возвращаем кэшированные данные, если они есть
      if (this.ratesCache) {
        logger.warn('Returning cached exchange rates due to update failure');
        return this.ratesCache;
      }
      
      throw error;
    }
  }
}

module.exports = new RateUpdater(); 