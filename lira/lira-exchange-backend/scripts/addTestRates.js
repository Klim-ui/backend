const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Rate = require('../models/Rate');

// Загружаем переменные окружения
dotenv.config();

// Тестовые курсы валют
const testRates = [
  {
    sourceCurrency: "TRY",
    targetCurrency: "RUB",
    buyRate: 2.5,  // 1 TRY = 2.5 RUB (когда покупаем TRY)
    sellRate: 2.3,  // 1 TRY = 2.3 RUB (когда продаем TRY)
    minAmount: 100,
    maxAmount: 50000,
    isActive: true
  },
  {
    sourceCurrency: "TRY",
    targetCurrency: "TON",
    buyRate: 0.01,  // 1 TRY = 0.01 TON
    sellRate: 0.009,
    minAmount: 100,
    maxAmount: 50000,
    isActive: true
  },
  {
    sourceCurrency: "TON",
    targetCurrency: "RUB",
    buyRate: 250,  // 1 TON = 250 RUB
    sellRate: 230,
    minAmount: 0.1,
    maxAmount: 100,
    isActive: true
  },
  {
    sourceCurrency: "TON",
    targetCurrency: "TRY",
    buyRate: 100,  // 1 TON = 100 TRY
    sellRate: 90,
    minAmount: 0.1,
    maxAmount: 100,
    isActive: true
  },
  {
    sourceCurrency: "RUB",
    targetCurrency: "TON",
    buyRate: 0.004,  // 1 RUB = 0.004 TON
    sellRate: 0.0035,
    minAmount: 1000,
    maxAmount: 1000000,
    isActive: true
  },
  {
    sourceCurrency: "RUB",
    targetCurrency: "TRY",
    buyRate: 0.4,  // 1 RUB = 0.4 TRY
    sellRate: 0.35,
    minAmount: 1000,
    maxAmount: 1000000,
    isActive: true
  }
];

// Подключение к MongoDB
mongoose.connect(process.env.MONGO_URL || 'mongodb://localhost:27017/lira-rub-exchange', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(async () => {
  console.log('MongoDB Connected');
  
  try {
    // Удаляем существующие курсы (опционально)
    await Rate.deleteMany({});
    console.log('Существующие курсы удалены');
    
    // Добавляем тестовые курсы
    const results = await Rate.insertMany(testRates);
    console.log(`Добавлено ${results.length} тестовых курсов валют`);
    
    // Выводим добавленные курсы
    console.log('Добавленные курсы:');
    results.forEach(rate => {
      console.log(`${rate.sourceCurrency} -> ${rate.targetCurrency}: Buy: ${rate.buyRate}, Sell: ${rate.sellRate}`);
    });
    
  } catch (error) {
    console.error('Ошибка при добавлении тестовых курсов:', error);
  } finally {
    // Закрываем соединение с MongoDB
    mongoose.connection.close();
    console.log('Соединение с MongoDB закрыто');
  }
})
.catch(err => {
  console.error('Ошибка подключения к MongoDB:', err);
  process.exit(1);
}); 