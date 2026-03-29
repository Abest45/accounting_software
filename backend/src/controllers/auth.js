const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../models');
const { generateToken } = require('../utils/jwt');
const { isValidEmail, isStrongPassword, sanitizeInput } = require('../utils/validation');
const emailService = require('../utils/email');
const Logger = require('../utils/logger');
const { asyncHandler } = require('../middleware/errorHandler');
const crypto = require('crypto');
const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');

const register = asyncHandler(async (req, res) => {
  const { username, email, password, firstName, lastName, role } = req.body;

  // Validation
  if (!username || !email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Username, email, and password are required'
    });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid email format'
    });
  }

  if (!isStrongPassword(password)) {
    return res.status(400).json({
      success: false,
      message: 'Password must contain uppercase, lowercase, number, and special character'
    });
  }

  // Check if user exists
  const existingUser = await db.User.findOne({
    where: { $or: [{ email }, { username }] }
  });

  if (existingUser) {
    return res.status(409).json({
      success: false,
      message: 'User already exists'
    });
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create user
  const user = await db.User.create({
    username: sanitizeInput(username),
    email: email.toLowerCase(),
    password: hashedPassword,
    firstName: sanitizeInput(firstName),
    lastName: sanitizeInput(lastName),
    role: role || 'viewer'
  });

  // Generate token
  const token = generateToken(user.id, user.email, user.role);

  Logger.info(`New user registered: ${user.email}`);

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      token
    }
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email and password are required'
    });
  }

  // Find user
  const user = await db.User.findOne({ where: { email: email.toLowerCase() } });

  if (!user) {
    Logger.warn(`Login attempt with non-existent email: ${email}`);
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }

  // Check if user is active
  if (!user.isActive) {
    return res.status(403).json({
      success: false,
      message: 'User account is inactive'
    });
  }

  // Check account lockout
  if (user.lockUntil && new Date() < new Date(user.lockUntil)) {
    return res.status(429).json({
      success: false,
      message: 'Account is temporarily locked. Try again later'
    });
  }

  // Verify password
  const passwordMatch = await bcrypt.compare(password, user.password);

  if (!passwordMatch) {
    // Increment login attempts
    user.loginAttempts = (user.loginAttempts || 0) + 1;

    if (user.loginAttempts >= 5) {
      user.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // Lock for 30 minutes
    }

    await user.save();

    Logger.warn(`Failed login attempt for user: ${email}`);
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }

  // Reset login attempts on successful login
  user.loginAttempts = 0;
  user.lockUntil = null;
  user.lastLogin = new Date();
  await user.save();

  Logger.info(`User logged in: ${user.email}`);

  // If 2FA is enabled, require 2FA verification
  if (user.twoFactorEnabled) {
    return res.json({
      success: true,
      message: 'Please verify with 2FA',
      data: {
        userId: user.id,
        requires2FA: true,
        email: user.email
      }
    });
  }

  // Generate token (regular login without 2FA)
  const token = generateToken(user.id, user.email, user.role);

  // Create refresh token, store hashed value and set httpOnly cookie
  const refreshToken = crypto.randomBytes(64).toString('hex');
  user.refreshTokenHash = hash(refreshToken);
  user.refreshTokenExpires = new Date(Date.now() + (parseInt(process.env.REFRESH_TOKEN_EXPIRE_MS) || 7 * 24 * 60 * 60 * 1000)); // default 7 days
  await user.save();

  // Set refresh token as httpOnly cookie
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    maxAge: parseInt(process.env.REFRESH_TOKEN_EXPIRE_MS) || 7 * 24 * 60 * 60 * 1000
  });

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      token
    }
  });
});

// Refresh access token using httpOnly refresh token cookie with token rotation
const refreshAccessToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.cookies || {};
  if (!refreshToken) {
    return res.status(401).json({ success: false, message: 'No refresh token' });
  }

  const tokenHash = hash(refreshToken);
  const user = await db.User.findOne({ where: { refreshTokenHash: tokenHash } });
  if (!user || !user.refreshTokenExpires || new Date() > new Date(user.refreshTokenExpires)) {
    return res.status(401).json({ success: false, message: 'Refresh token invalid or expired' });
  }

  // Invalidate old refresh token immediately (token rotation)
  user.refreshTokenHash = null;
  user.refreshTokenExpires = null;

  // Issue new access token
  const newAccessToken = generateToken(user.id, user.email, user.role);

  // Issue new refresh token
  const newRefreshToken = crypto.randomBytes(64).toString('hex');
  user.refreshTokenHash = hash(newRefreshToken);
  user.refreshTokenExpires = new Date(Date.now() + (parseInt(process.env.REFRESH_TOKEN_EXPIRE_MS) || 7 * 24 * 60 * 60 * 1000));
  await user.save();

  // Set new refresh token as httpOnly cookie
  res.cookie('refreshToken', newRefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    maxAge: parseInt(process.env.REFRESH_TOKEN_EXPIRE_MS) || 7 * 24 * 60 * 60 * 1000
  });

  Logger.info(`Token rotated for user ${user.email}`);

  res.json({ success: true, message: 'Token refreshed and rotated', data: { token: newAccessToken } });
});

// Logout - clear refresh token cookie and stored hash
const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.cookies || {};
  if (refreshToken) {
    const tokenHash = hash(refreshToken);
    const user = await db.User.findOne({ where: { refreshTokenHash: tokenHash } });
    if (user) {
      user.refreshTokenHash = null;
      user.refreshTokenExpires = null;
      await user.save();
    }
  }

  res.clearCookie('refreshToken', { httpOnly: true, sameSite: 'Lax', secure: process.env.NODE_ENV === 'production' });
  res.json({ success: true, message: 'Logged out' });
});

const updateProfile = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const { firstName, lastName, email, currentPassword, newPassword } = req.body;

  const user = await db.User.findByPk(userId);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Update basic info
  if (firstName) user.firstName = sanitizeInput(firstName);
  if (lastName) user.lastName = sanitizeInput(lastName);
  if (email) user.email = email.toLowerCase();

  // Change password
  if (newPassword) {
    if (!currentPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password required'
      });
    }

    const passwordMatch = await bcrypt.compare(currentPassword, user.password);
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'New password must meet strength requirements'
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
  }

  await user.save();

  Logger.info(`User profile updated: ${user.email}`);

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: {
      userId: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName
    }
  });
});

/**
 * Request password recovery
 */
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  // Validation
  if (!email || !isValidEmail(email)) {
    return res.status(400).json({
      success: false,
      message: 'Valid email address is required'
    });
  }

  // Find user
  const user = await db.User.findOne({ where: { email: email.toLowerCase() } });

  if (!user) {
    // Don't reveal if user exists (security best practice)
    return res.json({
      success: true,
      message: 'If an account with that email exists, a password recovery link has been sent.'
    });
  }

  try {
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    
    // Save reset token to user
    user.resetToken = resetTokenHash;
    user.resetTokenExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    await user.save();

    // Generate reset link
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/reset-password?token=${resetToken}`;

    // Send email
    await emailService.sendPasswordRecoveryEmail(
      user.email,
      user.firstName || user.username,
      resetToken,
      resetLink,
      '30 minutes'
    );

    Logger.info(`Password recovery email sent to ${email}`);

    res.json({
      success: true,
      message: 'If an account with that email exists, a password recovery link has been sent.'
    });
  } catch (error) {
    Logger.error(`Password recovery failed for ${email}:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to send recovery email. Please try again later.'
    });
  }
});

/**
 * Validate password reset token
 */
const validateResetToken = asyncHandler(async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({
      success: false,
      message: 'Reset token is required'
    });
  }

  // Hash the token
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  // Find user with valid token
  const user = await db.User.findOne({
    where: {
      resetToken: tokenHash,
      resetTokenExpires: {
        [db.Sequelize.Op.gt]: new Date()
      }
    }
  });

  if (!user) {
    return res.status(400).json({
      success: false,
      message: 'Invalid or expired reset token'
    });
  }

  res.json({
    success: true,
    message: 'Token is valid',
    data: {
      email: user.email,
      firstName: user.firstName
    }
  });
});

/**
 * Reset password
 */
const resetPassword = asyncHandler(async (req, res) => {
  const { token, password, confirmPassword } = req.body;

  // Validation
  if (!token || !password || !confirmPassword) {
    return res.status(400).json({
      success: false,
      message: 'Token, password, and password confirmation are required'
    });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({
      success: false,
      message: 'Passwords do not match'
    });
  }

  if (!isStrongPassword(password)) {
    return res.status(400).json({
      success: false,
      message: 'Password must be at least 8 characters and contain uppercase, lowercase, number, and special character'
    });
  }

  // Hash the token
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  // Find user with valid token
  const user = await db.User.findOne({
    where: {
      resetToken: tokenHash,
      resetTokenExpires: {
        [db.Sequelize.Op.gt]: new Date()
      }
    }
  });

  if (!user) {
    return res.status(400).json({
      success: false,
      message: 'Invalid or expired reset token'
    });
  }

  try {
    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user
    user.password = hashedPassword;
    user.resetToken = null;
    user.resetTokenExpires = null;
    await user.save();

    Logger.info(`Password reset successfully for ${user.email}`);

    res.json({
      success: true,
      message: 'Password has been reset successfully. You can now login with your new password.'
    });
  } catch (error) {
    Logger.error(`Password reset failed for user:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset password. Please try again.'
    });
  }
});

/**
 * Admin Registration (requires approval)
 */
const adminRegister = asyncHandler(async (req, res) => {
  const { email, password, firstName, lastName, phone, company, confirmPassword } = req.body;

  // Validation
  if (!email || !password || !firstName || !lastName || !phone || !company) {
    return res.status(400).json({
      success: false,
      message: 'All fields are required'
    });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid email format'
    });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({
      success: false,
      message: 'Passwords do not match'
    });
  }

  if (!isStrongPassword(password) || password.length < 12) {
    return res.status(400).json({
      success: false,
      message: 'Admin password must be at least 12 characters and contain uppercase, lowercase, number, and special character'
    });
  }

  // Check if user exists
  const existingUser = await db.User.findOne({
    where: { email: email.toLowerCase() }
  });

  if (existingUser) {
    return res.status(409).json({
      success: false,
      message: 'Email already registered'
    });
  }

  try {
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin registration request
    const user = await db.User.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      firstName: sanitizeInput(firstName),
      lastName: sanitizeInput(lastName),
      phone: sanitizeInput(phone),
      role: 'pending_admin',
      isActive: false,
      metadata: {
        company: sanitizeInput(company),
        registrationDate: new Date(),
        approvalStatus: 'pending'
      }
    });

    Logger.info(`Admin registration request received from ${email}`);

    // Notify admin about the request
    // TODO: Send email to super admin for approval

    res.status(201).json({
      success: true,
      message: 'Admin registration request submitted. Your account is pending approval by administrators.'
    });
  } catch (error) {
    Logger.error('Admin registration failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create admin registration request'
    });
  }
});

/**
 * Admin Login
 */
const adminLogin = asyncHandler(async (req, res) => {
  const { email, password, twoFactorCode } = req.body;

  // Validation
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email and password are required'
    });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid email format'
    });
  }

  // Find admin user
  const user = await db.User.findOne({
    where: { email: email.toLowerCase() }
  });

  if (!user || !['admin', 'manager'].includes(user.role)) {
    Logger.warn(`Admin login attempt with invalid credentials: ${email}`);
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password'
    });
  }

  if (!user.isActive) {
    return res.status(403).json({
      success: false,
      message: 'This admin account is not active'
    });
  }

  // Check if account is locked
  if (user.isLocked && new Date() < user.lockUntil) {
    const remainingMinutes = Math.ceil((user.lockUntil - new Date()) / 60000);
    return res.status(429).json({
      success: false,
      message: `Account is locked. Try again in ${remainingMinutes} minutes`
    });
  }

  // Check password
  const isPasswordCorrect = await bcrypt.compare(password, user.password);

  if (!isPasswordCorrect) {
    user.loginAttempts = (user.loginAttempts || 0) + 1;
    
    if (user.loginAttempts >= 5) {
      user.isLocked = true;
      user.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    }
    
    await user.save();

    Logger.warn(`Failed admin login attempt for ${email}`);
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password'
    });
  }

  // Reset login attempts on successful login
  user.loginAttempts = 0;
  user.isLocked = false;
  user.lastLogin = new Date();
  await user.save();

  // Generate token
  const token = generateToken(user.id, user.role);

  Logger.info(`Admin login successful for ${email}`);

  res.json({
    success: true,
    message: 'Admin login successful',
    data: {
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      }
    }
  });
});

module.exports = {
  register,
  login,
  refreshAccessToken,
  logout,
  updateProfile,
  forgotPassword,
  validateResetToken,
  resetPassword,
  adminRegister,
  adminLogin
};
