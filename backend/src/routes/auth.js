const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/auth');

// Public routes
router.post('/register', asyncHandler(authController.register));
router.post('/login', asyncHandler(authController.login));
// Refresh token (uses httpOnly cookie)
router.post('/refresh', asyncHandler(authController.refreshAccessToken));
// Logout
router.post('/logout', asyncHandler(authController.logout));

// Password recovery routes
router.post('/forgot-password', asyncHandler(authController.forgotPassword));
router.post('/validate-reset-token', asyncHandler(authController.validateResetToken));
router.post('/reset-password', asyncHandler(authController.resetPassword));

// Admin routes
router.post('/admin/register', asyncHandler(authController.adminRegister));
router.post('/admin/login', asyncHandler(authController.adminLogin));
router.get('/approve-admin', asyncHandler(authController.approveAdmin));
router.get('/approve-user', asyncHandler(authController.approveUser));

// Protected routes
router.put('/profile', authenticateToken, asyncHandler(authController.updateProfile));

module.exports = router;
