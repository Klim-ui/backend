const mongoose = require('mongoose');

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
  lastUsed: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create indexes for quick lookups
WalletSchema.index({ user: 1, walletType: 1 });
WalletSchema.index({ address: 1 }, { unique: true });

module.exports = mongoose.model('Wallet', WalletSchema); 