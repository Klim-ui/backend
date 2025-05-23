const mongoose = require('mongoose');

const RateSchema = new mongoose.Schema({
  sourceCurrency: {
    type: String,
    required: true,
    enum: ['TRY', 'RUB', 'TON'],
    uppercase: true
  },
  targetCurrency: {
    type: String,
    required: true,
    enum: ['TRY', 'RUB', 'TON'],
    uppercase: true
  },
  // Base rate from external source (without our markup)
  baseRate: {
    type: Number,
    required: true
  },
  // Our selling rate (with markup)
  sellRate: {
    type: Number,
    required: true
  },
  // Our buying rate (with markup)
  buyRate: {
    type: Number,
    required: true
  },
  // Markup percentage
  markupPercentage: {
    type: Number,
    default: 2.0,  // Default 2% markup
    required: true
  },
  // Source of rate data
  source: {
    type: String,
    enum: ['binance', 'central_bank', 'manual', 'coinmarketcap', 'custom_api'],
    required: true
  },
  // Source URL or API endpoint
  sourceReference: {
    type: String
  },
  // Is this rate active and being used
  isActive: {
    type: Boolean,
    default: true
  },
  // Minimum and maximum transaction amounts
  minAmount: {
    type: Number,
    required: true,
    default: 0
  },
  maxAmount: {
    type: Number,
    required: true,
    default: 1000000
  },
  // When the rate was last updated
  updatedAt: {
    type: Date,
    default: Date.now
  },
  // When the rate was created
  createdAt: {
    type: Date,
    default: Date.now
  },
  // Who last updated the rate
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
});

// Создаем индекс для быстрого поиска
RateSchema.index({ sourceCurrency: 1, targetCurrency: 1 }, { unique: true });

// Method to calculate the sell rate based on base rate and markup
RateSchema.methods.calculateSellRate = function() {
  return this.baseRate * (1 + this.markupPercentage / 100);
};

// Method to calculate the buy rate based on base rate and markup
RateSchema.methods.calculateBuyRate = function() {
  return this.baseRate * (1 - this.markupPercentage / 100);
};

// Pre-save hook to update rates and updatedAt field
RateSchema.pre('save', function(next) {
  this.sellRate = this.calculateSellRate();
  this.buyRate = this.calculateBuyRate();
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Rate', RateSchema); 