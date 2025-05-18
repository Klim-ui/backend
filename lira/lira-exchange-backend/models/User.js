const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
    select: false,
  },
  firstName: {
    type: String,
    required: true,
    trim: true,
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
  },
  phoneNumber: {
    type: String,
    required: true,
    trim: true,
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },
  kycVerified: {
    type: Boolean,
    default: false,
  },
  kycDocuments: {
    idCard: { type: String },
    address: { type: String },
    selfie: { type: String },
  },
  bankAccounts: [{
    country: { 
      type: String,
      enum: ['RU', 'TR'],
      required: true,
    },
    bankName: { type: String, required: true },
    accountNumber: { type: String, required: true },
    cardNumber: { type: String },
    currency: { 
      type: String, 
      enum: ['RUB', 'TRY'],
      required: true
    },
    isVerified: { type: Boolean, default: false }
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Encrypt password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Match user entered password to hashed password in database
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema); 