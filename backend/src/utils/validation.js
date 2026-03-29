const xss = require('xss');

// Sanitize user input to prevent XSS attacks
const sanitizeInput = (input) => {
  if (typeof input === 'string') {
    return xss(input.trim());
  }
  
  if (typeof input === 'object' && input !== null) {
    const sanitized = {};
    for (const key in input) {
      sanitized[key] = sanitizeInput(input[key]);
    }
    return sanitized;
  }
  
  return input;
};

// Validate email format
const isValidEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

// Validate strong password
const isStrongPassword = (password) => {
  const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return re.test(password);
};

// Generate random string
const generateRandomString = (length = 32) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Encrypt sensitive data
const encryptData = (data) => {
  // Implementation of encryption - using simple base64 for now
  // In production, use crypto module with AES-256
  return Buffer.from(JSON.stringify(data)).toString('base64');
};

// Decrypt sensitive data
const decryptData = (encryptedData) => {
  try {
    return JSON.parse(Buffer.from(encryptedData, 'base64').toString());
  } catch (error) {
    return null;
  }
};

module.exports = {
  sanitizeInput,
  isValidEmail,
  isStrongPassword,
  generateRandomString,
  encryptData,
  decryptData
};
