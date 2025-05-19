const mongoose = require('mongoose');
const crypto = require('crypto');

const WalletSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  walletType: {
    type: String,
    enum: ['TON', 'USDT_TRC20', 'USDT_ERC20'],
    required: true
  },
  address: {
    type: String,
    required: true
  },
  // For TON wallets
  tonMnemonic: {
    type: String,
    select: false // Only retrievable in specific queries
  },
  publicKey: {
    type: String,
    select: false
  },
  // For other wallets that might need private keys
  privateKeyEncrypted: {
    type: String,
    select: false
  },
  // Balance is updated periodically from blockchain
  balance: {
    type: Number,
    default: 0
  },
  lastBalanceUpdate: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isHot: {
    type: Boolean,
    default: true,
    description: 'Determines if this is a hot wallet (automated) or cold storage'
  },
  // QR-код для отображения адреса
  qrCodeUrl: {
    type: String
  },
  label: {
    type: String,
    default: function() {
      return `${this.walletType} Wallet`;
    }
  },
  lastUsed: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  // Список транзакций, связанных с этим кошельком
  transactions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exchange'
  }]
});

// Метод для шифрования мнемоники перед сохранением
WalletSchema.methods.encryptMnemonic = function(mnemonic) {
  try {
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey) {
      throw new Error('Encryption key not found in environment variables');
    }
    
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(encryptionKey, 'hex'), iv);
    
    let encrypted = cipher.update(mnemonic, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return `${iv.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Error encrypting mnemonic:', error);
    throw new Error('Failed to encrypt wallet mnemonic');
  }
};

// Метод для расшифровки мнемоники
WalletSchema.methods.decryptMnemonic = function() {
  try {
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey || !this.tonMnemonic) {
      throw new Error('Encryption key or mnemonic not found');
    }
    
    const parts = this.tonMnemonic.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(encryptionKey, 'hex'), iv);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Error decrypting mnemonic:', error);
    throw new Error('Failed to decrypt wallet mnemonic');
  }
};

// Метод для генерации QR-кода
WalletSchema.methods.generateQrCode = function() {
  // В реальной реализации мы бы использовали библиотеку qrcode
  // Но для упрощения просто создаем URL
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${this.address}`;
};

// Предварительно обработка перед сохранением
WalletSchema.pre('save', function(next) {
  // Генерируем QR-код, если его еще нет
  if (!this.qrCodeUrl) {
    this.qrCodeUrl = this.generateQrCode();
  }
  
  // Обновляем дату последнего использования
  this.lastUsed = Date.now();
  next();
});

// Create indexes for quick lookups
WalletSchema.index({ user: 1, walletType: 1 });
WalletSchema.index({ address: 1 }, { unique: true });

module.exports = mongoose.model('Wallet', WalletSchema); 