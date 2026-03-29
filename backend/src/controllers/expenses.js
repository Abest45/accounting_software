const db = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');
const Logger = require('../utils/logger');
const { Op } = require('sequelize');

// ==================== EXPENSE CONTROLLER ====================

const createExpense = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const { description, category, amount, expenseDate, vendor, paymentMethod, receiptNumber, status, notes } = req.body;

  if (!description || !category || !amount) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields'
    });
  }

  const expense = await db.Expense.create({
    userId,
    description,
    category,
    amount,
    expenseDate: expenseDate || new Date(),
    vendor,
    paymentMethod,
    receiptNumber,
    status: status || 'pending',
    notes
  });

  Logger.info(`Expense created by user ${userId}`);

  res.status(201).json({
    success: true,
    message: 'Expense created successfully',
    data: expense
  });
});

const getExpenses = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const { page = 1, limit = 10, category, status, startDate, endDate } = req.query;

  const offset = (page - 1) * limit;
  const where = { userId };

  if (category) where.category = category;
  if (status) where.status = status;
  if (startDate || endDate) {
    where.expenseDate = {};
    if (startDate) where.expenseDate[Op.gte] = new Date(startDate);
    if (endDate) where.expenseDate[Op.lte] = new Date(endDate);
  }

  const { count, rows } = await db.Expense.findAndCountAll({
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

const updateExpense = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { userId } = req.user;

  const expense = await db.Expense.findOne({
    where: { id, userId }
  });

  if (!expense) {
    return res.status(404).json({
      success: false,
      message: 'Expense not found'
    });
  }

  await expense.update(req.body);

  Logger.info(`Expense updated: ${id}`);

  res.json({
    success: true,
    message: 'Expense updated successfully',
    data: expense
  });
});

const deleteExpense = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { userId } = req.user;

  const expense = await db.Expense.findOne({
    where: { id, userId }
  });

  if (!expense) {
    return res.status(404).json({
      success: false,
      message: 'Expense not found'
    });
  }

  await expense.destroy();

  Logger.info(`Expense deleted: ${id}`);

  res.json({
    success: true,
    message: 'Expense deleted successfully'
  });
});

// ==================== RECEIPT CONTROLLER ====================

const createReceipt = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const { receivedFrom, amount, category, paymentMethod, description, referenceNumber } = req.body;

  if (!receivedFrom || !amount || !category || !paymentMethod) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields'
    });
  }

  const receiptNumber = `RCP-${Date.now()}`;

  const receipt = await db.Receipt.create({
    receiptNumber,
    userId,
    receivedFrom,
    amount,
    category,
    paymentMethod,
    description,
    referenceNumber,
    receiptDate: new Date()
  });

  Logger.info(`Receipt created: ${receiptNumber}`);

  res.status(201).json({
    success: true,
    message: 'Receipt created successfully',
    data: receipt
  });
});

const getReceipts = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const { page = 1, limit = 10, category, startDate, endDate } = req.query;

  const offset = (page - 1) * limit;
  const where = { userId };

  if (category) where.category = category;
  if (startDate || endDate) {
    where.receiptDate = {};
    if (startDate) where.receiptDate[Op.gte] = new Date(startDate);
    if (endDate) where.receiptDate[Op.lte] = new Date(endDate);
  }

  const { count, rows } = await db.Receipt.findAndCountAll({
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

const deleteReceipt = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { userId } = req.user;

  const receipt = await db.Receipt.findOne({
    where: { id, userId }
  });

  if (!receipt) {
    return res.status(404).json({
      success: false,
      message: 'Receipt not found'
    });
  }

  await receipt.destroy();

  Logger.info(`Receipt deleted: ${id}`);

  res.json({
    success: true,
    message: 'Receipt deleted successfully'
  });
});

module.exports = {
  createExpense,
  getExpenses,
  updateExpense,
  deleteExpense,
  createReceipt,
  getReceipts,
  deleteReceipt
};
