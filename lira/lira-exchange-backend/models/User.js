const mongoose = require('mongoose');
// Временно закомментируем bcrypt для отладки
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
  kycRejectionReason: {
    type: String,
  },
  kycDocuments: {
    idCard: { type: String },
    address: { type: String },
    selfie: { type: String },
  },
  // 2FA fields
  twoFaEnabled: {
    type: Boolean,
    default: false,
  },
  twoFaSecret: {
    type: String,
    select: false,
  },
  twoFaBackupCodes: [{
    code: { type: String },
    used: { type: Boolean, default: false }
  }],
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
UserSchema.pre('save', function(next) {
  const user = this;
  
  // Only hash the password if it has been modified (or is new)
  if (!user.isModified('password')) {
    return next();
  }
  
  // Generate a salt
  bcrypt.genSalt(10, function(err, salt) {
    if (err) return next(err);
    
    // Hash the password using our new salt
    bcrypt.hash(user.password, salt, function(err, hash) {
      if (err) return next(err);
      
      // Override the cleartext password with the hashed one
      user.password = hash;
      next();
    });
  });
});

// Match user entered password to hashed password in database
UserSchema.methods.matchPassword = function(enteredPassword, cb) {
  // Поддержка как callback, так и Promise API
  if (cb) {
    bcrypt.compare(enteredPassword, this.password, function(err, isMatch) {
      if (err) return cb(err);
      cb(null, isMatch);
    });
  } else {
    // Возвращаем Promise для обратной совместимости
    return new Promise((resolve, reject) => {
      bcrypt.compare(enteredPassword, this.password, function(err, isMatch) {
        if (err) return reject(err);
        resolve(isMatch);
      });
    });
  }
};

module.exports = mongoose.model('User', UserSchema); 