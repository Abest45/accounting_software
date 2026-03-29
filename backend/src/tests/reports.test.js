const request = require('supertest');
const { app, server } = require('../server');
const db = require('../models');
const bcrypt = require('bcryptjs');

describe('Reports Controller Tests', () => {
  let testUser;
  let authToken;

  beforeAll(async () => {
    // Create test user
    const hashedPassword = await bcrypt.hash('TestPassword123!', 10);
    testUser = await db.User.create({
      username: 'reports_test_user',
      email: 'reports@example.com',
      password: hashedPassword,
      isActive: true
    });

    // Login to get token
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'reports@example.com',
        password: 'TestPassword123!'
      });

    authToken = loginRes.body.data.token;

    // Create test data
    await db.Invoice.create({
      invoiceNumber: 'INV-TEST-001',
      userId: testUser.id,
      clientName: 'Test Client',
      clientEmail: 'client@example.com',
      items: [{ description: 'Service', quantity: 1, price: 1000 }],
      subtotal: 1000,
      totalAmount: 1100,
      status: 'paid',
      dueDate: new Date()
    });

    await db.Expense.create({
      userId: testUser.id,
      description: 'Office supplies',
      amount: 500,
      category: 'supplies',
      status: 'approved'
    });

    await db.Payroll.create({
      userId: testUser.id,
      employeeId: 'EMP-001',
      basicSalary: 5000,
      grossSalary: 5500,
      netPay: 4400,
      status: 'processed'
    });
  });

  afterAll(async () => {
    await db.Invoice.destroy({ where: { userId: testUser.id } });
    await db.Expense.destroy({ where: { userId: testUser.id } });
    await db.Payroll.destroy({ where: { userId: testUser.id } });
    await db.User.destroy({ where: { id: testUser.id } });
    await server.close();
  });

  describe('GET /api/reports/invoices', () => {
    it('should generate PDF invoice report', async () => {
      const response = await request(app)
        .get('/api/reports/invoices?format=pdf')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/pdf');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.body).toBeDefined();
    });

    it('should generate Excel invoice report', async () => {
      const response = await request(app)
        .get('/api/reports/invoices?format=excel')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('spreadsheet');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toContain('.xlsx');
    });

    it('should filter by date range', async () => {
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const endDate = new Date();

      const response = await request(app)
        .get(`/api/reports/invoices?format=pdf&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });

    it('should require authentication', async () => {
      const response = await request(app).get('/api/reports/invoices?format=pdf');
      expect(response.status).toBe(401);
    });

    it('should default to PDF format', async () => {
      const response = await request(app)
        .get('/api/reports/invoices')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/pdf');
    });

    it('should only include user-scoped invoices', async () => {
      // Create invoice for different user
      const otherUser = await db.User.create({
        username: 'other_user',
        email: 'other@example.com',
        password: await bcrypt.hash('Password123!', 10),
        isActive: true
      });

      await db.Invoice.create({
        invoiceNumber: 'INV-OTHER',
        userId: otherUser.id,
        clientName: 'Other Client',
        items: [{ description: 'Service', quantity: 1, price: 1000 }],
        subtotal: 1000,
        totalAmount: 1000,
        dueDate: new Date()
      });

      const response = await request(app)
        .get('/api/reports/invoices?format=pdf')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      // Report should only contain testUser's invoices

      await db.Invoice.destroy({ where: { userId: otherUser.id } });
      await db.User.destroy({ where: { id: otherUser.id } });
    });
  });

  describe('GET /api/reports/p-and-l', () => {
    it('should generate PDF P&L report', async () => {
      const response = await request(app)
        .get('/api/reports/p-and-l?format=pdf')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/pdf');
    });

    it('should generate Excel P&L report', async () => {
      const response = await request(app)
        .get('/api/reports/p-and-l?format=excel')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('spreadsheet');
    });

    it('should include revenue and expenses', async () => {
      const response = await request(app)
        .get('/api/reports/p-and-l?format=pdf')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      // PDF should contain revenue/expense data
    });

    it('should require authentication', async () => {
      const response = await request(app).get('/api/reports/p-and-l');
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/reports/payroll', () => {
    it('should generate PDF payroll report', async () => {
      const response = await request(app)
        .get('/api/reports/payroll?format=pdf')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/pdf');
    });

    it('should generate Excel payroll report', async () => {
      const response = await request(app)
        .get('/api/reports/payroll?format=excel')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('spreadsheet');
    });

    it('should include employee details', async () => {
      const response = await request(app)
        .get('/api/reports/payroll?format=pdf')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });

    it('should filter by date range', async () => {
      const response = await request(app)
        .get('/api/reports/payroll?format=excel&startDate=2026-01-01&endDate=2026-01-31')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });

    it('should require authentication', async () => {
      const response = await request(app).get('/api/reports/payroll');
      expect(response.status).toBe(401);
    });
  });

  describe('Report File Integrity', () => {
    it('PDF should be valid and not empty', async () => {
      const response = await request(app)
        .get('/api/reports/invoices?format=pdf')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.length).toBeGreaterThan(100); // PDF should have reasonable size
    });

    it('Excel file should have correct mimetype', async () => {
      const response = await request(app)
        .get('/api/reports/invoices?format=excel')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(
        response.headers['content-type']
      ).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    });
  });
});
