const db = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');
const Logger = require('../utils/logger');
const { Op } = require('sequelize');

// ==================== PAYROLL CONTROLLER ====================

const createPayroll = asyncHandler(async (req, res) => {
  const { employeeId, employeeName, email, department, position, payPeriod, basicSalary, overtimeHours, overtimeRate, bonus, deductions, taxRate, notes } = req.body;

  if (!employeeId || !employeeName || !payPeriod || !basicSalary) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields'
    });
  }

  // Calculate gross and net salary
  const overtimeAmount = (overtimeHours || 0) * (overtimeRate || 0);
  const grossSalary = basicSalary + overtimeAmount + (bonus || 0);
  const taxAmount = (grossSalary * taxRate) / 100;
  const netPay = grossSalary - taxAmount - (deductions || 0);

  const payroll = await db.Payroll.create({
    employeeId,
    employeeName,
    email,
    department,
    position,
    payPeriod,
    basicSalary,
    overtimeHours: overtimeHours || 0,
    overtimeRate: overtimeRate || 0,
    bonus: bonus || 0,
    deductions: deductions || 0,
    taxRate,
    grossSalary,
    taxAmount,
    netPay,
    notes
  });

  Logger.info(`Payroll created for employee: ${employeeId}`);

  res.status(201).json({
    success: true,
    message: 'Payroll created successfully',
    data: payroll
  });
});

const getPayrolls = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, startDate, endDate } = req.query;

  const offset = (page - 1) * limit;
  const where = {};

  if (status) where.status = status;
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt[Op.gte] = new Date(startDate);
    if (endDate) where.createdAt[Op.lte] = new Date(endDate);
  }

  const { count, rows } = await db.Payroll.findAndCountAll({
    where,
    offset,
    limit: parseInt(limit),
    order: [['createdAt', 'DESC']]
  });

  res.json({
    success: true,
    data: rows,
    pagination: {
      total: count,
      pages: Math.ceil(count / limit),
      currentPage: parseInt(page)
    }
  });
});

const processPayroll = asyncHandler(async (req, res) => {
  const { payrollIds } = req.body;

  if (!payrollIds || !Array.isArray(payrollIds) || payrollIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Payroll IDs are required'
    });
  }

  const payrolls = await db.Payroll.findAll({
    where: { id: payrollIds }
  });

  for (const payroll of payrolls) {
    payroll.status = 'processed';
    payroll.paymentDate = new Date();
    await payroll.save();
  }

  Logger.info(`Payroll processed for ${payrolls.length} employees`);

  res.json({
    success: true,
    message: `Payroll processed for ${payrolls.length} employees`,
    data: payrolls
  });
});

const getPayrollSummary = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  const where = {};
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt[Op.gte] = new Date(startDate);
    if (endDate) where.createdAt[Op.lte] = new Date(endDate);
  }

  const payrolls = await db.Payroll.findAll({ where });

  const summary = {
    totalEmployees: new Set(payrolls.map(p => p.employeeId)).size,
    totalGrossSalary: payrolls.reduce((sum, p) => sum + parseFloat(p.grossSalary), 0),
    totalTax: payrolls.reduce((sum, p) => sum + parseFloat(p.taxAmount), 0),
    totalDeductions: payrolls.reduce((sum, p) => sum + parseFloat(p.deductions), 0),
    totalNetPay: payrolls.reduce((sum, p) => sum + parseFloat(p.netPay), 0),
    averageSalary: payrolls.reduce((sum, p) => sum + parseFloat(p.grossSalary), 0) / (payrolls.length || 1)
  };

  res.json({
    success: true,
    data: summary
  });
});

module.exports = {
  createPayroll,
  getPayrolls,
  processPayroll,
  getPayrollSummary
};
