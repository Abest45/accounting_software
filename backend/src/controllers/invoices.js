const db = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');
const Logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');
const notifications = require('../services/notifications');

// ==================== INVOICE CONTROLLER ====================

const createInvoice = asyncHandler(async (req, res, io) => {
  const { userId } = req.user;
  const { clientName, clientEmail, clientPhone, invoiceDate, dueDate, items, taxRate, discount, status, notes } = req.body;

  // Validate required fields
  if (!clientName || !items || items.length === 0 || !dueDate) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields'
    });
  }

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  const taxAmount = (subtotal * taxRate) / 100;
  const totalAmount = subtotal + taxAmount - discount;

  const invoiceNumber = `INV-${Date.now()}`;

  const invoice = await db.Invoice.create({
    invoiceNumber,
    userId,
    clientName,
    clientEmail,
    clientPhone,
    invoiceDate: invoiceDate || new Date(),
    dueDate,
    items,
    subtotal,
    taxRate,
    taxAmount,
    discount,
    totalAmount,
    status: status || 'draft',
    notes
  });

  Logger.info(`Invoice created: ${invoiceNumber}`);

  // Send notification email
  if (clientEmail) {
    await notifications.notifyInvoiceCreated(clientEmail, invoiceNumber, clientName, totalAmount);
  }

  // Emit real-time update
  if (io) {
    io.to(`dashboard_${userId}`).emit('invoice_created', { invoice });
  }

  res.status(201).json({
    success: true,
    message: 'Invoice created successfully',
    data: invoice
  });
});

const getInvoices = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const { page = 1, limit = 10, status, startDate, endDate } = req.query;

  const offset = (page - 1) * limit;
  const where = { userId };

  if (status) where.status = status;
  if (startDate || endDate) {
    where.invoiceDate = {};
    if (startDate) where.invoiceDate[Op.gte] = new Date(startDate);
    if (endDate) where.invoiceDate[Op.lte] = new Date(endDate);
  }

  const { count, rows } = await db.Invoice.findAndCountAll({
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

const getInvoiceById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { userId } = req.user;

  const invoice = await db.Invoice.findOne({
    where: { id, userId }
  });

  if (!invoice) {
    return res.status(404).json({
      success: false,
      message: 'Invoice not found'
    });
  }

  res.json({
    success: true,
    data: invoice
  });
});

const updateInvoice = asyncHandler(async (req, res, io) => {
  const { id } = req.params;
  const { userId } = req.user;
  const updates = req.body;

  const invoice = await db.Invoice.findOne({
    where: { id, userId }
  });

  if (!invoice) {
    return res.status(404).json({
      success: false,
      message: 'Invoice not found'
    });
  }

  // Recalculate if items changed
  if (updates.items) {
    const subtotal = updates.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    updates.subtotal = subtotal;
    updates.taxAmount = (subtotal * (updates.taxRate || invoice.taxRate)) / 100;
    updates.totalAmount = subtotal + updates.taxAmount - (updates.discount || invoice.discount);
  }

  await invoice.update(updates);

  Logger.info(`Invoice updated: ${invoice.invoiceNumber}`);

  if (io) {
    io.to(`dashboard_${userId}`).emit('invoice_updated', { invoice });
  }

  res.json({
    success: true,
    message: 'Invoice updated successfully',
    data: invoice
  });
});

const deleteInvoice = asyncHandler(async (req, res, io) => {
  const { id } = req.params;
  const { userId } = req.user;

  const invoice = await db.Invoice.findOne({
    where: { id, userId }
  });

  if (!invoice) {
    return res.status(404).json({
      success: false,
      message: 'Invoice not found'
    });
  }

  await invoice.destroy();

  Logger.info(`Invoice deleted: ${invoice.invoiceNumber}`);

  if (io) {
    io.to(`dashboard_${userId}`).emit('invoice_deleted', { invoiceId: id });
  }

  res.json({
    success: true,
    message: 'Invoice deleted successfully'
  });
});

module.exports = {
  createInvoice,
  getInvoices,
  getInvoiceById,
  updateInvoice,
  deleteInvoice
};
