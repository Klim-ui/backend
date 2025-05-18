const mongoose = require('mongoose');

const ExchangeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Exchange direction
  fromCurrency: {
    type: String,
    enum: ['TRY', 'RUB', 'TON', 'USDT'],
    required: true
  },
  toCurrency: {
    type: String,
    enum: ['TRY', 'RUB', 'TON', 'USDT'],
    required: true
  },
  // Amounts
  fromAmount: {
    type: Number,
    required: true
  },
  toAmount: {
    type: Number,
    required: true
  },
  // Exchange rate at the time
  exchangeRate: {
    type: Number,
    required: true
  },
  // Our fee
  feePercentage: {
    type: Number,
    required: true
  },
  feeAmount: {
    type: Number,
    required: true
  },
  // Transaction details
  sourceTransaction: {
    type: {
      txId: { type: String },
      network: { type: String },
      address: { type: String },
      bankReference: { type: String },
      status: { 
        type: String, 
        enum: ['pending', 'completed', 'failed'],
        default: 'pending'
      }
    }
  },
  destinationTransaction: {
    type: {
      txId: { type: String },
      network: { type: String },
      address: { type: String },
      bankReference: { type: String },
      status: { 
        type: String, 
        enum: ['pending', 'completed', 'failed'],
        default: 'pending'
      }
    }
  },
  // If crypto is involved, store the wallet details
  cryptoWallet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Wallet'
  },
  // If bank is involved, store the bank account details
  bankAccount: {
    type: {
      accountId: { type: String },
      bank: { type: String },
      country: { type: String, enum: ['RU', 'TR'] }
    }
  },
  // Overall exchange status
  status: {
    type: String,
    enum: ['initiated', 'processing', 'completed', 'failed', 'refunded'],
    default: 'initiated'
  },
  // Admin notes on the transaction
  adminNotes: {
    type: String
  },
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date
  }
});

// Pre-save hook to update the updatedAt field
ExchangeSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Create indexes for quick lookups
ExchangeSchema.index({ user: 1, createdAt: -1 });
ExchangeSchema.index({ status: 1, createdAt: -1 });
ExchangeSchema.index({ 
  'sourceTransaction.txId': 1, 
  'destinationTransaction.txId': 1 
});

module.exports = mongoose.model('Exchange', ExchangeSchema); 