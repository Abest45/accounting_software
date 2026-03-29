const express = require('express');
const router = express.Router();
const twoFactorAuthController = require('../controllers/twoFactorAuth');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/auth');

// Setup 2FA (generate QR code and secret)
router.post('/setup', authenticateToken, asyncHandler(twoFactorAuthController.setup2FA));

// Verify and enable 2FA
router.post('/verify-setup', authenticateToken, asyncHandler(twoFactorAuthController.verify2FA));

// Verify 2FA token during login
router.post('/verify-login', asyncHandler(twoFactorAuthController.verify2FALogin));

// Disable 2FA
router.post('/disable', authenticateToken, asyncHandler(twoFactorAuthController.disable2FA));

module.exports = router;
