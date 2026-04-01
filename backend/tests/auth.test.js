const request = require('supertest');
const bcrypt = require('bcryptjs');
const { app } = require('../src/server');
const db = require('../src/models');
const { generateToken } = require('../src/utils/jwt');

describe('Admin approval workflow', () => {
  let superAdminToken;

  beforeAll(async () => {
    // NOTE: This is for testing; ensure a local test DB is configured.
    await db.sequelize.sync({ force: true });

    const superAdmin = await db.User.create({
      username: 'superadmin',
      email: 'superadmin@example.com',
      password: await bcrypt.hash('SuperAdmin#123', 10),
      role: 'super-admin',
      isActive: true,
      isApproved: true
    });

    superAdminToken = generateToken(superAdmin.id, superAdmin.email, superAdmin.role);
  }, 30000);

  afterAll(async () => {
    await db.sequelize.close();
  });

  it('register -> pending; blocked login', async () => {
    const userEmail = 'pendinguser@test.com';
    const userPassword = 'PendingUser#123';

    const register = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'pendinguser',
        email: userEmail,
        password: userPassword,
        firstName: 'Pending',
        lastName: 'User'
      });

    expect(register.status).toBe(201);
    expect(register.body.success).toBe(true);
    expect(register.body.data.approvalStatus).toBe('pending');

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: userEmail, password: userPassword });

    expect(login.status).toBe(403);
    expect(login.body.message).toMatch(/pending approval/i);
  });

  it('approval endpoint -> active; accepted login', async () => {
    const user = await db.User.findOne({ where: { email: 'pendinguser@test.com' } });
    expect(user).toBeTruthy();

    const approver = await request(app)
      .post('/api/admin/approve-user')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ userId: user.id });

    expect(approver.status).toBe(200);
    expect(approver.body.success).toBe(true);

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'pendinguser@test.com', password: 'PendingUser#123' });

    expect(login.status).toBe(200);
    expect(login.body.success).toBe(true);
    expect(login.body.data.token).toBeTruthy();
  });

  it('invalid/expired token errors', async () => {
    const invalid = await request(app).get('/api/auth/approve-user').query({ token: 'invalid-token-123' });

    expect(invalid.status).toBe(400);
    expect(invalid.body.message).toMatch(/invalid or expired approval token/i);
  });
});
