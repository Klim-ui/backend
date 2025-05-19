const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { protect, admin } = require('../middleware/auth');

// Generate JWT Token
const generateToken = (id) => {
  const secret = process.env.JWT_SECRET || 'DEFAULT_JWT_SECRET_FOR_DEVELOPMENT_ONLY';
  console.log('Using JWT secret:', secret ? 'Secret configured' : 'MISSING JWT SECRET!');
  return jwt.sign({ id }, secret, {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  });
};

// @route   POST /api/users/register
// @desc    Register user
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, phoneNumber } = req.body;
    
    console.log('Регистрация пользователя:', { 
      email, 
      passwordLength: password ? password.length : 0,
      firstName, 
      lastName, 
      phoneNumber 
    });

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      console.log('Пользователь уже существует:', email);
      return res.status(400).json({
        success: false,
        message: 'User already exists',
      });
    }

    // Проверка наличия всех обязательных полей
    if (!email || !password || !firstName || !lastName || !phoneNumber) {
      console.log('Отсутствуют обязательные поля:', { 
        email: !!email, 
        password: !!password, 
        firstName: !!firstName, 
        lastName: !!lastName, 
        phoneNumber: !!phoneNumber 
      });
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: email, password, firstName, lastName, phoneNumber',
        fields: { email: !!email, password: !!password, firstName: !!firstName, lastName: !!lastName, phoneNumber: !!phoneNumber }
      });
    }

    console.log('Создание пользователя...');
    // Create user
    const user = await User.create({
      email,
      password,
      firstName,
      lastName,
      phoneNumber,
    });

    console.log('Пользователь создан:', user._id);

    if (user) {
      // Generate token
      const token = generateToken(user._id);

      res.status(201).json({
        success: true,
        token,
        user: {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phoneNumber: user.phoneNumber,
          role: user.role,
          kycVerified: user.kycVerified,
        },
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Invalid user data',
      });
    }
  } catch (error) {
    console.error('Register error complete details:', error);
    console.error('Stack trace:', error.stack);
    req.logger?.error(`Register error: ${error.message}`);
    
    // Более информативный ответ об ошибке
    let errorMessage = 'Server error';
    if (error.name === 'ValidationError') {
      errorMessage = Object.values(error.errors).map(val => val.message).join(', ');
    } else if (error.code === 11000) {
      errorMessage = 'Email already exists';
    }
    
    res.status(500).json({
      success: false,
      message: errorMessage,
      error: error.message
    });
  }
});

// @route   POST /api/users/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Check if password matches using Promise API
    try {
      const isMatch = await user.matchPassword(password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials',
        });
      }

      // Generate token
      const token = generateToken(user._id);

      res.json({
        success: true,
        token,
        user: {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phoneNumber: user.phoneNumber,
          role: user.role,
          kycVerified: user.kycVerified,
        },
      });
    } catch (passwordError) {
      console.error('Password comparison error:', passwordError);
      req.logger?.error(`Password comparison error: ${passwordError.message}`);
      res.status(500).json({
        success: false,
        message: 'Error during authentication'
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    req.logger?.error(`Login error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   GET /api/users/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        kycVerified: user.kycVerified,
        bankAccounts: user.bankAccounts,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    req.logger?.error(`Get profile error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', protect, async (req, res) => {
  try {
    const { firstName, lastName, phoneNumber, password } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Update fields if provided
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phoneNumber) user.phoneNumber = phoneNumber;
    if (password) user.password = password;

    const updatedUser = await user.save();

    res.json({
      success: true,
      user: {
        _id: updatedUser._id,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        phoneNumber: updatedUser.phoneNumber,
        role: updatedUser.role,
        kycVerified: updatedUser.kycVerified,
      },
    });
  } catch (error) {
    req.logger?.error(`Update profile error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   POST /api/users/bank-account
// @desc    Add a bank account
// @access  Private
router.post('/bank-account', protect, async (req, res) => {
  try {
    const { country, bankName, accountNumber, cardNumber, currency } = req.body;

    // Validate inputs
    if (!country || !bankName || !accountNumber || !currency) {
      return res.status(400).json({
        success: false,
        message: 'Please provide country, bankName, accountNumber, and currency',
      });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Add bank account
    user.bankAccounts.push({
      country,
      bankName,
      accountNumber,
      cardNumber,
      currency,
      isVerified: false,
    });

    await user.save();

    res.status(201).json({
      success: true,
      bankAccounts: user.bankAccounts,
    });
  } catch (error) {
    req.logger?.error(`Add bank account error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   DELETE /api/users/bank-account/:id
// @desc    Delete a bank account
// @access  Private
router.delete('/bank-account/:id', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Find bank account index
    const accountIndex = user.bankAccounts.findIndex(
      (account) => account._id.toString() === req.params.id
    );

    if (accountIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Bank account not found',
      });
    }

    // Remove bank account
    user.bankAccounts.splice(accountIndex, 1);
    await user.save();

    res.json({
      success: true,
      message: 'Bank account removed',
      bankAccounts: user.bankAccounts,
    });
  } catch (error) {
    req.logger?.error(`Delete bank account error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   POST /api/users/kyc
// @desc    Submit KYC documents
// @access  Private
router.post('/kyc', protect, async (req, res) => {
  try {
    const { idCard, address, selfie } = req.body;

    // Validate inputs
    if (!idCard || !address || !selfie) {
      return res.status(400).json({
        success: false,
        message: 'Please provide idCard, address, and selfie documents',
      });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Update KYC documents
    user.kycDocuments = {
      idCard,
      address,
      selfie,
    };

    // KYC status is set to false until verified by admin
    user.kycVerified = false;

    await user.save();

    res.json({
      success: true,
      message: 'KYC documents submitted for verification',
    });
  } catch (error) {
    req.logger?.error(`KYC submission error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   PUT /api/users/verify-kyc/:id
// @desc    Verify user KYC
// @access  Private/Admin
router.put('/verify-kyc/:id', protect, admin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Verify KYC
    user.kycVerified = true;
    await user.save();

    res.json({
      success: true,
      message: 'User KYC verified',
    });
  } catch (error) {
    req.logger?.error(`Verify KYC error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   GET /api/users
// @desc    Get all users
// @access  Private/Admin
router.get('/', protect, admin, async (req, res) => {
  try {
    const users = await User.find({});

    res.json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    req.logger?.error(`Get all users error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

module.exports = router; 