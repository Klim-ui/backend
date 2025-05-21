const { RestClientV5 } = require('bybit-api');

// Инициализация клиента Bybit
const getBybitClient = () => {
  // Используем API ключ из .env
  const apiKey = process.env.BYBIT_API_KEY;
  const apiSecret = process.env.BYBIT_API_SECRET;
  
  return new RestClientV5({
    key: apiKey,
    secret: apiSecret,
    testnet: false, // Используем основную сеть
  });
};

/**
 * Получает текущий курс для валютной пары
 * @param {string} symbol - Символ пары (например, 'USDTTRY')
 * @returns {Object} - Информация о курсе
 */
const getTickerPrice = async (symbol) => {
  try {
    const client = getBybitClient();
    const response = await client.getTickers({
      category: 'spot',
      symbol
    });
    
    if (response.retCode === 0 && response.result.list && response.result.list.length > 0) {
      return response.result.list[0];
    }
    
    throw new Error(`Не удалось получить курс для ${symbol}`);
  } catch (error) {
    console.error(`Error getting ticker price for ${symbol}:`, error);
    throw new Error(`Failed to get ticker price for ${symbol}`);
  }
};

/**
 * Создает ордер на покупку/продажу
 * @param {string} symbol - Символ пары (например, 'USDTTRY')
 * @param {string} side - Сторона (Buy/Sell)
 * @param {string} orderType - Тип ордера (Market/Limit)
 * @param {number} qty - Количество
 * @param {number} price - Цена (для Limit ордеров)
 * @returns {Object} - Информация о созданном ордере
 */
const createOrder = async (symbol, side, orderType, qty, price = null) => {
  try {
    const client = getBybitClient();
    
    const orderData = {
      category: 'spot',
      symbol,
      side,
      orderType,
      qty: qty.toString(),
    };
    
    // Если тип ордера Limit, добавляем цену
    if (orderType === 'Limit' && price) {
      orderData.price = price.toString();
    }
    
    const response = await client.submitOrder(orderData);
    
    if (response.retCode === 0) {
      return response.result;
    }
    
    throw new Error(`Ошибка создания ордера: ${response.retMsg}`);
  } catch (error) {
    console.error('Error creating order:', error);
    throw new Error('Failed to create order');
  }
};

/**
 * Проверяет баланс аккаунта
 * @param {string} coin - Символ валюты (например, 'USDT')
 * @returns {Object} - Информация о балансе
 */
const getBalance = async (coin) => {
  try {
    const client = getBybitClient();
    const response = await client.getWalletBalance({
      accountType: 'UNIFIED',
      coin
    });
    
    if (response.retCode === 0) {
      if (response.result.list && response.result.list.length > 0) {
        const coinBalance = response.result.list[0].coin.find(c => c.coin === coin);
        if (coinBalance) {
          return {
            available: parseFloat(coinBalance.availableToWithdraw),
            total: parseFloat(coinBalance.walletBalance),
            frozen: parseFloat(coinBalance.locked),
          };
        }
      }
      return { available: 0, total: 0, frozen: 0 };
    }
    
    throw new Error(`Ошибка получения баланса: ${response.retMsg}`);
  } catch (error) {
    console.error('Error getting balance:', error);
    throw new Error('Failed to get balance');
  }
};

/**
 * Обновляет курсы обмена в базе данных
 * @param {Object} Rate - Модель Rate из mongoose
 * @returns {Array} - Обновленные курсы
 */
const updateExchangeRates = async (Rate) => {
  try {
    // Получаем курс USDT/TRY
    const usdtTryTicker = await getTickerPrice('USDTTRY');
    
    // Проверяем наличие необходимых данных и конвертируем их в числа с проверкой на NaN
    const lastPrice = parseFloat(usdtTryTicker.lastPrice);
    const bidPrice = parseFloat(usdtTryTicker.bid);
    const askPrice = parseFloat(usdtTryTicker.ask);
    
    // Проверяем корректность всех значений
    if (isNaN(lastPrice) || isNaN(bidPrice) || isNaN(askPrice)) {
      console.error('Invalid exchange rate values:', { 
        lastPrice: usdtTryTicker.lastPrice,
        bid: usdtTryTicker.bid,
        ask: usdtTryTicker.ask
      });
      
      // Если нет корректных значений с API, используем тестовые или последние известные курсы
      // Сначала проверим, есть ли уже курсы в базе
      const existingRate = await Rate.findOne({ sourceCurrency: 'TRY', targetCurrency: 'USDT' });
      
      if (existingRate) {
        console.log('Using existing rate values from database');
        return await Rate.find({ 
          $or: [
            { sourceCurrency: 'TRY', targetCurrency: 'USDT' },
            { sourceCurrency: 'USDT', targetCurrency: 'TRY' }
          ]
        });
      }
      
      // Если нет данных в базе, используем тестовые значения
      const defaultLastPrice = 31.5; // Тестовое значение курса USDT/TRY
      const defaultBidPrice = 31.4;
      const defaultAskPrice = 31.6;
      
      // Создаем/обновляем курс TRY -> USDT с тестовыми значениями
      await Rate.findOneAndUpdate(
        { sourceCurrency: 'TRY', targetCurrency: 'USDT' },
        {
          sourceCurrency: 'TRY',
          targetCurrency: 'USDT',
          baseRate: defaultLastPrice,
          sellRate: defaultBidPrice, 
          buyRate: defaultAskPrice,
          markupPercentage: 2,
          source: 'bybit-default',
          isActive: true,
          minAmount: 100,
          maxAmount: 50000
        },
        { upsert: true, new: true }
      );
      
      // Создаем/обновляем курс USDT -> TRY с тестовыми значениями
      await Rate.findOneAndUpdate(
        { sourceCurrency: 'USDT', targetCurrency: 'TRY' },
        {
          sourceCurrency: 'USDT',
          targetCurrency: 'TRY',
          baseRate: 1 / defaultLastPrice,
          sellRate: 1 / defaultAskPrice,
          buyRate: 1 / defaultBidPrice,
          markupPercentage: 2,
          source: 'bybit-default',
          isActive: true,
          minAmount: 10,
          maxAmount: 5000
        },
        { upsert: true, new: true }
      );
    } else {
      // Если все значения корректны, обновляем курсы с реальными данными
      // Создаем/обновляем курс TRY -> USDT
      await Rate.findOneAndUpdate(
        { sourceCurrency: 'TRY', targetCurrency: 'USDT' },
        {
          sourceCurrency: 'TRY',
          targetCurrency: 'USDT',
          baseRate: lastPrice,
          sellRate: bidPrice,
          buyRate: askPrice,
          markupPercentage: 2,
          source: 'bybit',
          isActive: true,
          minAmount: 100,
          maxAmount: 50000
        },
        { upsert: true, new: true }
      );
      
      // Создаем/обновляем курс USDT -> TRY
      await Rate.findOneAndUpdate(
        { sourceCurrency: 'USDT', targetCurrency: 'TRY' },
        {
          sourceCurrency: 'USDT',
          targetCurrency: 'TRY',
          baseRate: 1 / lastPrice,
          sellRate: 1 / askPrice,
          buyRate: 1 / bidPrice,
          markupPercentage: 2,
          source: 'bybit',
          isActive: true,
          minAmount: 10,
          maxAmount: 5000
        },
        { upsert: true, new: true }
      );
    }
    
    // Получаем обновленные курсы
    return await Rate.find({ 
      $or: [
        { sourceCurrency: 'TRY', targetCurrency: 'USDT' },
        { sourceCurrency: 'USDT', targetCurrency: 'TRY' }
      ]
    });
  } catch (error) {
    console.error('Error updating exchange rates:', error);
    throw new Error('Failed to update exchange rates');
  }
};

module.exports = {
  getBybitClient,
  getTickerPrice,
  createOrder,
  getBalance,
  updateExchangeRates
}; 