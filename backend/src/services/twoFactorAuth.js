const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

/**
 * Generate TOTP secret and QR code for 2FA setup
 * @param {string} email - User email
 * @param {string} appName - Application name for TOTP label
 * @returns {Promise<{secret, qrCode, backupCodes}>}
 */
const generateTOTPSecret = async (email, appName = 'FinAnalytics') => {
  const secret = speakeasy.generateSecret({
    name: `${appName} (${email})`,
    issuer: appName,
    length: 32
  });

  // Generate QR code
  const qrCode = await QRCode.toDataURL(secret.otpauth_url);

  // Generate backup codes (for account recovery)
  const backupCodes = Array.from({ length: 10 }, () =>
    Math.random().toString(36).substring(2, 10).toUpperCase()
  );

  return {
    secret: secret.base32,
    qrCode,
    backupCodes,
    otpauth_url: secret.otpauth_url
  };
};

/**
 * Verify TOTP token
 * @param {string} secret - Base32 secret
 * @param {string} token - 6-digit token from authenticator app
 * @returns {boolean}
 */
const verifyTOTPToken = (secret, token) => {
  if (!secret || !token) return false;

  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 2 // Allow 30 seconds before/after for clock skew
  });
};

module.exports = {
  generateTOTPSecret,
  verifyTOTPToken
};
