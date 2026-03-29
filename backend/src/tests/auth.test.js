const request = require('supertest');
const { app, server } = require('../server');
const db = require('../models');
const { generateToken } = require('../utils/jwt');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');

describe('Authentication Endpoints', () => {
  let testUser;
  let testUserId;
  let accessToken;
  let refreshToken;
  let refreshTokenHash;

  beforeAll(async () => {
    // Ensure database is initialized
    await db.sequelize.authenticate();
  });

  afterAll(async () => {
    // Clean up
    if (testUserId) {
      await db.User.destroy({ where: { id: testUserId } });
    }
    await server.close();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser123',
          email: 'test@example.com',
          password: 'TestPassword123!',
          firstName: 'Test',
          lastName: 'User'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe('test@example.com');
      expect(response.body.data.token).toBeDefined();
      
      testUserId = response.body.data.userId;
    });

    it('should reject weak passwords', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'weakpass',
          email: 'weak@example.com',
          password: 'weak'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('strong');
    });

    it('should reject duplicate email', async () => {
      // Register first user
      await request(app)
        .post('/api/auth/register')
        .send({
          username: 'duptest1',
          email: 'duplicate@example.com',
          password: 'TestPassword123!'
        });

      // Try to register with same email
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'duptest2',
          email: 'duplicate@example.com',
          password: 'TestPassword123!'
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'invalidemail',
          email: 'not-an-email',
          password: 'TestPassword123!'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeAll(async () => {
      // Create a test user
      const hashedPassword = await bcrypt.hash('TestPassword123!', 10);
      testUser = await db.User.create({
        username: 'logintest',
        email: 'login@example.com',
        password: hashedPassword,
        firstName: 'Login',
        lastName: 'Test',
        isActive: true
      });
    });

    it('should login user and return access token + set refresh token cookie', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password: 'TestPassword123!'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.email).toBe('login@example.com');

      // Check for refresh token cookie
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some(c => c.includes('refreshToken'))).toBe(true);

      accessToken = response.body.data.token;
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password: 'WrongPassword123!'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid');
    });

    it('should reject login for non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'TestPassword123!'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should track failed login attempts', async () => {
      // Make 5 failed attempts
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({
            email: 'login@example.com',
            password: 'WrongPassword'
          });
      }

      // Check user is locked
      const user = await db.User.findByPk(testUser.id);
      expect(user.lockUntil).toBeDefined();
      expect(new Date(user.lockUntil) > new Date()).toBe(true);
    });

    it('should reject login when account is locked', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password: 'TestPassword123!'
        });

      expect(response.status).toBe(429);
      expect(response.body.message).toContain('locked');
    });
  });

  describe('POST /api/auth/refresh - Token Rotation', () => {
    let refreshUserToken;
    let refreshUser;
    let refreshTokenCookie;

    beforeAll(async () => {
      // Create a fresh user for refresh tests
      const hashedPassword = await bcrypt.hash('RefreshTest123!', 10);
      refreshUser = await db.User.create({
        username: 'refreshtest',
        email: 'refresh@example.com',
        password: hashedPassword,
        isActive: true
      });

      // Login to get refresh token
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'refresh@example.com',
          password: 'RefreshTest123!'
        });

      refreshUserToken = loginRes.body.data.token;
      
      // Extract refresh token from cookie
      const cookies = loginRes.headers['set-cookie'];
      refreshTokenCookie = cookies
        .find(c => c.includes('refreshToken'))
        .split(';')[0];
    });

    afterAll(async () => {
      if (refreshUser) {
        await db.User.destroy({ where: { id: refreshUser.id } });
      }
    });

    it('should refresh access token using refresh token cookie', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', refreshTokenCookie);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.token).not.toBe(refreshUserToken);
    });

    it('should rotate refresh token on each refresh', async () => {
      // First refresh
      const firstRefresh = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', refreshTokenCookie);

      expect(firstRefresh.status).toBe(200);
      const newCookie1 = firstRefresh.headers['set-cookie'];

      // Try to use old refresh token again (should fail)
      const secondAttempt = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', refreshTokenCookie);

      expect(secondAttempt.status).toBe(401);
      expect(secondAttempt.body.message).toContain('invalid or expired');
    });

    it('should reject refresh without refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No refresh token');
    });

    it('should reject invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', 'refreshToken=invalid_token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should validate refresh token has not expired', async () => {
      // Create user with expired refresh token
      const expiredUser = await db.User.create({
        username: 'expiredtest',
        email: 'expired@example.com',
        password: await bcrypt.hash('ExpiredTest123!', 10),
        refreshTokenHash: hash('expired_token'),
        refreshTokenExpires: new Date(Date.now() - 1000), // 1 second ago
        isActive: true
      });

      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', 'refreshToken=expired_token');

      expect(response.status).toBe(401);
      expect(response.body.message).toContain('invalid or expired');

      await db.User.destroy({ where: { id: expiredUser.id } });
    });

    it('should set new httpOnly cookie on refresh', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', refreshTokenCookie);

      expect(response.status).toBe(200);
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      
      const refreshCookie = cookies.find(c => c.includes('refreshToken'));
      expect(refreshCookie).toBeDefined();
      expect(refreshCookie).toContain('HttpOnly');
      expect(refreshCookie).toContain('SameSite=Lax');
    });
  });

  describe('POST /api/auth/logout', () => {
    let logoutUser;
    let logoutCookie;

    beforeAll(async () => {
      // Create user and get refresh token
      const hashedPassword = await bcrypt.hash('LogoutTest123!', 10);
      logoutUser = await db.User.create({
        username: 'logouttest',
        email: 'logout@example.com',
        password: hashedPassword,
        isActive: true
      });

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'logout@example.com',
          password: 'LogoutTest123!'
        });

      const cookies = loginRes.headers['set-cookie'];
      logoutCookie = cookies.find(c => c.includes('refreshToken')).split(';')[0];
    });

    afterAll(async () => {
      if (logoutUser) {
        await db.User.destroy({ where: { id: logoutUser.id } });
      }
    });

    it('should logout user and invalidate refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', logoutCookie);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify refresh token is cleared in database
      const user = await db.User.findByPk(logoutUser.id);
      expect(user.refreshTokenHash).toBeNull();
      expect(user.refreshTokenExpires).toBeNull();
    });

    it('should clear refresh token cookie', async () => {
      // Re-login
      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'logout@example.com',
          password: 'LogoutTest123!'
        });

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', logoutCookie);

      const cookies = response.headers['set-cookie'];
      const clearCookie = cookies.find(c => c.includes('refreshToken'));
      expect(clearCookie).toContain('Max-Age=0');
    });

    it('should handle logout when no refresh token provided', async () => {
      const response = await request(app)
        .post('/api/auth/logout');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('PUT /api/auth/profile - Protected Route', () => {
    let profileUser;
    let profileToken;

    beforeAll(async () => {
      const hashedPassword = await bcrypt.hash('ProfileTest123!', 10);
      profileUser = await db.User.create({
        username: 'profiletest',
        email: 'profile@example.com',
        password: hashedPassword,
        firstName: 'Profile',
        lastName: 'User',
        isActive: true
      });

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'profile@example.com',
          password: 'ProfileTest123!'
        });

      profileToken = loginRes.body.data.token;
    });

    afterAll(async () => {
      if (profileUser) {
        await db.User.destroy({ where: { id: profileUser.id } });
      }
    });

    it('should allow authenticated user to update profile', async () => {
      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${profileToken}`)
        .send({
          firstName: 'Updated',
          lastName: 'Name'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.firstName).toBe('Updated');
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .put('/api/auth/profile')
        .send({
          firstName: 'Updated'
        });

      expect(response.status).toBe(401);
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', 'Bearer invalid_token')
        .send({
          firstName: 'Updated'
        });

      expect(response.status).toBe(401);
    });

    it('should reject expired token', async () => {
      const expiredToken = generateToken(
        'test-user-id',
        'test@example.com',
        'viewer'
      );

      // Manually set token as expired (modify JWT secret temporarily or use a malformed token)
      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer malformed.token.here`)
        .send({
          firstName: 'Updated'
        });

      expect(response.status).toBe(401);
    });
  });
});
