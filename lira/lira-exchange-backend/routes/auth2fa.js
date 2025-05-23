const express = require('express');
const router = express.Router();
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const crypto = require('crypto');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// @route   POST /api/auth/2fa/setup
// @desc    Setup 2FA for user
// @access  Private
router.post('/setup', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (user.twoFaEnabled) {
      return res.status(400).json({
        success: false,
        message: '2FA is already enabled for this account',
      });
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `LIRA Exchange (${user.email})`,
      issuer: 'LIRA Exchange',
      length: 32,
    });

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    // Generate backup codes
    const backupCodes = [];
    for (let i = 0; i < 8; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      backupCodes.push({
        code: code,
        used: false
      });
    }

    // Save secret temporarily (not enabled yet)
    user.twoFaSecret = secret.base32;
    user.twoFaBackupCodes = backupCodes;
    await user.save();

    res.json({
      success: true,
      data: {
        secret: secret.base32,
        qrCode: qrCodeUrl,
        backupCodes: backupCodes.map(bc => bc.code),
        manualEntryKey: secret.base32
      }
    });
  } catch (error) {
    console.error('2FA setup error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   POST /api/auth/2fa/verify
// @desc    Verify and enable 2FA
// @access  Private
router.post('/verify', protect, async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Please provide verification token',
      });
    }

    const user = await User.findById(req.user.id).select('+twoFaSecret');

    if (!user || !user.twoFaSecret) {
      return res.status(400).json({
        success: false,
        message: '2FA setup not found. Please start setup first.',
      });
    }

    // Verify token
    const verified = speakeasy.totp.verify({
      secret: user.twoFaSecret,
      encoding: 'base32',
      token: token,
      window: 2,
    });

    if (!verified) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code',
      });
    }

    // Enable 2FA
    user.twoFaEnabled = true;
    await user.save();

    res.json({
      success: true,
      message: '2FA enabled successfully',
    });
  } catch (error) {
    console.error('2FA verify error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   POST /api/auth/2fa/disable
// @desc    Disable 2FA
// @access  Private
router.post('/disable', protect, async (req, res) => {
  try {
    const { token, backupCode } = req.body;

    if (!token && !backupCode) {
      return res.status(400).json({
        success: false,
        message: 'Please provide either 2FA token or backup code',
      });
    }

    const user = await User.findById(req.user.id).select('+twoFaSecret');

    if (!user || !user.twoFaEnabled) {
      return res.status(400).json({
        success: false,
        message: '2FA is not enabled for this account',
      });
    }

    let verified = false;

    // Check 2FA token
    if (token) {
      verified = speakeasy.totp.verify({
        secret: user.twoFaSecret,
        encoding: 'base32',
        token: token,
        window: 2,
      });
    }

    // Check backup code if token verification failed
    if (!verified && backupCode) {
      const backupCodeEntry = user.twoFaBackupCodes.find(
        bc => bc.code === backupCode.toUpperCase() && !bc.used
      );
      
      if (backupCodeEntry) {
        verified = true;
        backupCodeEntry.used = true;
      }
    }

    if (!verified) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code or backup code',
      });
    }

    // Disable 2FA
    user.twoFaEnabled = false;
    user.twoFaSecret = undefined;
    user.twoFaBackupCodes = [];
    await user.save();

    res.json({
      success: true,
      message: '2FA disabled successfully',
    });
  } catch (error) {
    console.error('2FA disable error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   GET /api/auth/2fa/status
// @desc    Get 2FA status
// @access  Private
router.get('/status', protect, async (req, res) => {
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
      data: {
        enabled: user.twoFaEnabled,
        backupCodesCount: user.twoFaBackupCodes ? user.twoFaBackupCodes.filter(bc => !bc.used).length : 0
      }
    });
  } catch (error) {
    console.error('2FA status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   POST /api/auth/2fa/regenerate-backup
// @desc    Regenerate backup codes
// @access  Private
router.post('/regenerate-backup', protect, async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Please provide 2FA token',
      });
    }

    const user = await User.findById(req.user.id).select('+twoFaSecret');

    if (!user || !user.twoFaEnabled) {
      return res.status(400).json({
        success: false,
        message: '2FA is not enabled for this account',
      });
    }

    // Verify token
    const verified = speakeasy.totp.verify({
      secret: user.twoFaSecret,
      encoding: 'base32',
      token: token,
      window: 2,
    });

    if (!verified) {
      return res.status(400).json({
        success: false,
        message: 'Invalid 2FA token',
      });
    }

    // Generate new backup codes
    const backupCodes = [];
    for (let i = 0; i < 8; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      backupCodes.push({
        code: code,
        used: false
      });
    }

    user.twoFaBackupCodes = backupCodes;
    await user.save();

    res.json({
      success: true,
      data: {
        backupCodes: backupCodes.map(bc => bc.code)
      }
    });
  } catch (error) {
    console.error('2FA regenerate backup error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

module.exports = router; 