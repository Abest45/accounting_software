const twoFactorAuth = require('../services/twoFactorAuth');
const { asyncHandler } = require('../middleware/errorHandler');
const db = require('../models');
const Logger = require('../utils/logger');

/**
 * Setup 2FA: Generate TOTP secret and QR code
 */
const setup2FA = asyncHandler(async (req, res) => {
  const { userId } = req.user;

  const user = await db.User.findByPk(userId);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  if (user.twoFactorEnabled) {
    return res.status(400).json({ success: false, message: '2FA is already enabled' });
  }

  const { secret, qrCode, backupCodes } = await twoFactorAuth.generateTOTPSecret(user.email);

  // Don't save to DB yet - wait for verification
  res.json({
    success: true,
    message: '2FA setup initiated',
    data: {
      qrCode, // Data URL for QR code display
      secret, // In case user wants to manually enter
      backupCodes
    }
  });
});

/**
 * Verify and enable 2FA
 */
const verify2FA = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const { token, secret, backupCodes } = req.body;

  if (!token || !secret || !backupCodes) {
    return res.status(400).json({ success: false, message: 'Token, secret, and backup codes required' });
  }

  // Verify the TOTP token
  const isValid = twoFactorAuth.verifyTOTPToken(secret, token);
  if (!isValid) {
    return res.status(400).json({ success: false, message: 'Invalid 2FA token' });
  }

  // Save secret and backup codes to database
  const user = await db.User.findByPk(userId);
  user.twoFactorSecret = secret;
  user.twoFactorEnabled = true;
  user.backupCodes = backupCodes;
  await user.save();

  Logger.info(`2FA enabled for user ${user.email}`);

  res.json({
    success: true,
    message: '2FA has been successfully enabled'
  });
});

/**
 * Verify 2FA token during login
 */
const verify2FALogin = asyncHandler(async (req, res) => {
  const { userId, token } = req.body;

  if (!userId || !token) {
    return res.status(400).json({ success: false, message: 'User ID and token required' });
  }

  const user = await db.User.findByPk(userId);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  if (!user.twoFactorEnabled) {
    return res.status(400).json({ success: false, message: '2FA not enabled' });
  }

  // Verify TOTP token
  let isValid = twoFactorAuth.verifyTOTPToken(user.twoFactorSecret, token);

  // Check backup codes if TOTP fails
  if (!isValid && user.backupCodes && user.backupCodes.includes(token)) {
    isValid = true;
    // Remove used backup code
    user.backupCodes = user.backupCodes.filter(code => code !== token);
    await user.save();
    Logger.warn(`Backup code used for user ${user.email}`);
  }

  if (!isValid) {
    return res.status(401).json({ success: false, message: 'Invalid 2FA token' });
  }

  // Generate new session/tokens (same as regular login)
  const { generateToken } = require('../utils/jwt');
  const newToken = generateToken(user.id, user.email, user.role);

  res.json({
    success: true,
    message: '2FA verification successful',
    data: {
      userId: user.id,
      token: newToken,
      email: user.email,
      role: user.role
    }
  });
});

/**
 * Disable 2FA
 */
const disable2FA = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ success: false, message: 'Password required' });
  }

  const user = await db.User.findByPk(userId);
  const bcrypt = require('bcryptjs');
  const isPasswordCorrect = await bcrypt.compare(password, user.password);

  if (!isPasswordCorrect) {
    return res.status(401).json({ success: false, message: 'Invalid password' });
  }

  user.twoFactorEnabled = false;
  user.twoFactorSecret = null;
  user.backupCodes = [];
  await user.save();

  Logger.info(`2FA disabled for user ${user.email}`);

  res.json({
    success: true,
    message: '2FA has been disabled'
  });
});

module.exports = {
  setup2FA,
  verify2FA,
  verify2FALogin,
  disable2FA
};
