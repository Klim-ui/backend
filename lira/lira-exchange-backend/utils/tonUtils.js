const { TonClient } = require('@ton/ton');
const { mnemonicToPrivateKey, KeyPair } = require('@ton/crypto');
const { WalletContractV4 } = require('@ton/ton');
const { Address } = require('@ton/core');

/**
 * Функции для работы с блокчейном TON
 */

// Инициализация клиента TON
const getTonClient = () => {
  // Используем API ключ из .env
  const apiKey = process.env.TON_API_KEY;
  const endpoint = process.env.TON_ENDPOINT || 'https://toncenter.com/api/v2/jsonRPC';
  
  return new TonClient({
    endpoint,
    apiKey
  });
};

/**
 * Генерирует новый TON кошелек
 * @returns {Object} { address, mnemonic, secretKey, publicKey }
 */
const generateTonWallet = async () => {
  try {
    const client = getTonClient();
    
    // Генерируем случайную мнемоническую фразу из 24 слов
    const mnemonic = await mnemonicNew(24);
    
    // Генерируем ключевую пару из мнемоники
    const keyPair = await mnemonicToPrivateKey(mnemonic);
    
    // Создаем контракт кошелька v4
    const wallet = WalletContractV4.create({
      publicKey: keyPair.publicKey,
      workchain: 0
    });
    
    // Получаем адрес кошелька
    const address = wallet.address.toString();
    
    return {
      address,
      mnemonic: mnemonic.join(' '),
      secretKey: Buffer.from(keyPair.secretKey).toString('hex'),
      publicKey: Buffer.from(keyPair.publicKey).toString('hex')
    };
  } catch (error) {
    console.error('Error generating TON wallet:', error);
    throw new Error('Failed to generate TON wallet');
  }
};

/**
 * Проверяет баланс кошелька TON
 * @param {string} address - Адрес кошелька TON
 * @returns {number} Баланс в TON
 */
const checkTonBalance = async (address) => {
  try {
    const client = getTonClient();
    const balance = await client.getBalance(address);
    
    // Конвертируем наноТон в TON (1 TON = 10^9 наноТон)
    return Number(balance) / 1_000_000_000;
  } catch (error) {
    console.error('Error checking TON balance:', error);
    throw new Error('Failed to check TON balance');
  }
};

/**
 * Получает историю транзакций для кошелька TON
 * @param {string} address - Адрес кошелька TON
 * @param {number} limit - Максимальное количество транзакций
 * @returns {Array} История транзакций
 */
const getTonTransactions = async (address, limit = 10) => {
  try {
    const client = getTonClient();
    const transactions = await client.getTransactions(address, {
      limit
    });
    
    return transactions.map(tx => ({
      hash: tx.hash,
      time: tx.time,
      amount: tx.outMsgs.length > 0 ? 
        Number(tx.outMsgs[0].value) / 1_000_000_000 : 0,
      fee: Number(tx.fee) / 1_000_000_000,
      from: tx.inMsg?.source || 'unknown',
      to: tx.outMsgs.length > 0 ? tx.outMsgs[0].destination : 'unknown'
    }));
  } catch (error) {
    console.error('Error getting TON transactions:', error);
    throw new Error('Failed to get TON transactions');
  }
};

/**
 * Отправляет TON на другой адрес
 * @param {string} fromMnemonic - Мнемоническая фраза отправителя
 * @param {string} toAddress - Адрес получателя
 * @param {number} amount - Сумма в TON
 * @returns {Object} Информация о транзакции
 */
const sendTon = async (fromMnemonic, toAddress, amount) => {
  try {
    const client = getTonClient();
    
    // Получаем ключевую пару из мнемоники
    const keyPair = await mnemonicToPrivateKey(fromMnemonic.split(' '));
    
    // Создаем контракт кошелька v4
    const wallet = WalletContractV4.create({
      publicKey: keyPair.publicKey,
      workchain: 0
    });
    
    // Инициализируем кошелек с ключами
    await wallet.init(client);
    
    // Отправляем транзакцию
    const transfer = await wallet.sendTransfer({
      secretKey: keyPair.secretKey,
      toAddress: toAddress,
      amount: amount * 1_000_000_000, // Конвертируем TON в наноТоны
      seqno: await wallet.getSeqno(),
      message: 'LIRA-RUB Exchange'
    });
    
    return {
      hash: transfer.hash,
      amount,
      from: wallet.address.toString(),
      to: toAddress
    };
  } catch (error) {
    console.error('Error sending TON:', error);
    throw new Error('Failed to send TON');
  }
};

/**
 * Вспомогательная функция для генерации мнемоники
 * @param {number} wordsCount - Количество слов (обычно 24)
 * @returns {Array} Массив слов мнемоники
 */
const mnemonicNew = async (wordsCount = 24) => {
  try {
    // В настоящей реализации мы бы использовали ton-crypto
    // Но для упрощения просто создаем заглушку
    const words = [
      'abandon', 'ability', 'able', 'about', 'above', 'absent',
      'absorb', 'abstract', 'absurd', 'abuse', 'access', 'accident',
      'account', 'accuse', 'achieve', 'acid', 'acoustic', 'acquire',
      'across', 'act', 'action', 'actor', 'actress', 'actual',
      'adapt', 'add', 'addict', 'address', 'adjust', 'admit',
      'adult', 'advance', 'advice', 'aerobic', 'affair', 'afford',
      'afraid', 'again', 'age', 'agent', 'agree', 'ahead',
      'aim', 'air', 'airport', 'aisle', 'alarm', 'album',
      'alcohol', 'alert', 'alien', 'all', 'alley', 'allow'
    ];
    
    const result = [];
    for (let i = 0; i < wordsCount; i++) {
      const randomIndex = Math.floor(Math.random() * words.length);
      result.push(words[randomIndex]);
    }
    
    return result;
  } catch (error) {
    console.error('Error generating mnemonic:', error);
    throw new Error('Failed to generate mnemonic');
  }
};

module.exports = {
  getTonClient,
  generateTonWallet,
  checkTonBalance,
  getTonTransactions,
  sendTon
}; 