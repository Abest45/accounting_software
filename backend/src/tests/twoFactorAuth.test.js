const request = require('supertest');
const { app, server } = require('../server');
const db = require('../models');
const bcrypt = require('bcryptjs');
const twoFactorAuth = require('../services/twoFactorAuth');

describe('2FA Controller Tests', () => {
  let testUser;
  let authToken;
  let secret;
  let backupCodes;

  beforeAll(async () => {
    // Create test user
    const hashedPassword = await bcrypt.hash('TestPassword123!', 10);
    testUser = await db.User.create({
      username: '2fa_test_user',
      email: '2fa@example.com',
      password: hashedPassword,
      isActive: true
    });

    // Login to get token
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: '2fa@example.com',
        password: 'TestPassword123!'
      });

    authToken = loginRes.body.data.token;
  });

  afterAll(async () => {
    if (testUser) await db.User.destroy({ where: { id: testUser.id } });
    await server.close();
  });

  describe('POST /api/2fa/setup', () => {
    it('should generate TOTP secret and QR code', async () => {
      const response = await request(app)
        .post('/api/2fa/setup')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.secret).toBeDefined();
      expect(response.body.data.qrCode).toBeDefined();
      expect(response.body.data.backupCodes).toBeDefined();
      expect(response.body.data.backupCodes).toHaveLength(10);

      secret = response.body.data.secret;
      backupCodes = response.body.data.backupCodes;
    });

    it('should not allow setup if 2FA already enabled', async () => {
      // Enable 2FA first
      await testUser.update({
        twoFactorEnabled: true,
        twoFactorSecret: 'existing_secret'
      });

      const response = await request(app)
        .post('/api/2fa/setup')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('already enabled');
    });

    it('should require authentication', async () => {
      const response = await request(app).post('/api/2fa/setup');
      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/2fa/verify-setup', () => {
    let setupRes;

    beforeEach(async () => {
      // Reset user
      await testUser.update({ twoFactorEnabled: false, twoFactorSecret: null });

      // Setup 2FA
      setupRes = await request(app)
        .post('/api/2fa/setup')
        .set('Authorization', `Bearer ${authToken}`);

      secret = setupRes.body.data.secret;
      backupCodes = setupRes.body.data.backupCodes;
    });

    it('should verify and enable 2FA with valid token', async () => {
      const token = twoFactorAuth.generateTOTPSecret(
        testUser.email
      ).then(async (result) => {
        // Generate valid TOTP token
        const speakeasy = require('speakeasy');
        return speakeasy.totp({
          secret: secret,
          encoding: 'base32'
        });
      });

      const validToken = await token;

      const response = await request(app)
        .post('/api/2fa/verify-setup')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          token: validToken,
          secret,
          backupCodes
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify user has 2FA enabled
      const updated = await db.User.findByPk(testUser.id);
      expect(updated.twoFactorEnabled).toBe(true);
      expect(updated.twoFactorSecret).toBe(secret);
    });

    it('should reject invalid TOTP token', async () => {
      const response = await request(app)
        .post('/api/2fa/verify-setup')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          token: '000000', // Invalid token
          secret,
          backupCodes
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid');
    });

    it('should require all parameters', async () => {
      const response = await request(app)
        .post('/api/2fa/verify-setup')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          token: '123456'
          // Missing secret and backupCodes
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/2fa/verify-login', () => {
    beforeEach(async () => {
      // Setup and enable 2FA for user
      await testUser.update({
        twoFactorEnabled: true,
        twoFactorSecret: 'JBSWY3DPEHPK3PXP', // known test secret
        backupCodes: ['CODE123', 'CODE456']
      });
    });

    it('should verify login with valid TOTP token', async () => {
      const speakeasy = require('speakeasy');
      const token = speakeasy.totp({
        secret: 'JBSWY3DPEHPK3PXP',
        encoding: 'base32'
      });

      const response = await request(app)
        .post('/api/2fa/verify-login')
        .send({
          userId: testUser.id,
          token
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
    });

    it('should accept backup codes', async () => {
      const response = await request(app)
        .post('/api/2fa/verify-login')
        .send({
          userId: testUser.id,
          token: 'CODE123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify backup code was removed
      const updated = await db.User.findByPk(testUser.id);
      expect(updated.backupCodes).not.toContain('CODE123');
      expect(updated.backupCodes).toContain('CODE456');
    });

    it('should reject invalid tokens', async () => {
      const response = await request(app)
        .post('/api/2fa/verify-login')
        .send({
          userId: testUser.id,
          token: 'INVALID'
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toContain('Invalid');
    });

    it('should reject used backup codes', async () => {
      // Use backup code
      await request(app)
        .post('/api/2fa/verify-login')
        .send({
          userId: testUser.id,
          token: 'CODE123'
        });

      // Try to use same code again
      const response = await request(app)
        .post('/api/2fa/verify-login')
        .send({
          userId: testUser.id,
          token: 'CODE123'
        });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/2fa/disable', () => {
    beforeEach(async () => {
      await testUser.update({
        twoFactorEnabled: true,
        twoFactorSecret: 'JBSWY3DPEHPK3PXP',
        backupCodes: ['CODE1', 'CODE2']
      });
    });

    it('should disable 2FA with correct password', async () => {
      const response = await request(app)
        .post('/api/2fa/disable')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          password: 'TestPassword123!'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const updated = await db.User.findByPk(testUser.id);
      expect(updated.twoFactorEnabled).toBe(false);
      expect(updated.twoFactorSecret).toBeNull();
      expect(updated.backupCodes).toEqual([]);
    });

    it('should reject incorrect password', async () => {
      const response = await request(app)
        .post('/api/2fa/disable')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          password: 'WrongPassword123!'
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toContain('Invalid password');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/2fa/disable')
        .send({ password: 'TestPassword123!' });

      expect(response.status).toBe(401);
    });
  });
});
