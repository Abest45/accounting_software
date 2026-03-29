const db = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');
const Logger = require('../utils/logger');
const { Op } = require('sequelize');

// ==================== INVENTORY CONTROLLER ====================

const createProduct = asyncHandler(async (req, res) => {
  const { productCode, productName, category, openingStock, currentStock, reorderLevel, unitCost, sellingPrice, supplier, description } = req.body;

  if (!productCode || !productName || !category || !unitCost || !sellingPrice) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields'
    });
  }

  // Check if product already exists
  const existing = await db.Inventory.findOne({ where: { productCode } });
  if (existing) {
    return res.status(409).json({
      success: false,
      message: 'Product code already exists'
    });
  }

  const product = await db.Inventory.create({
    productCode,
    productName,
    category,
    openingStock: openingStock || 0,
    currentStock: currentStock || 0,
    reorderLevel: reorderLevel || 10,
    unitCost,
    sellingPrice,
    supplier,
    description,
    isActive: true
  });

  Logger.info(`Product added to inventory: ${productCode}`);

  res.status(201).json({
    success: true,
    message: 'Product added successfully',
    data: product
  });
});

const getInventory = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, category, isActive = true, lowStock = false } = req.query;

  const offset = (page - 1) * limit;
  const where = { isActive: isActive === 'true' };

  if (category) where.category = category;
  if (lowStock === 'true') {
    where[Op.or] = [
      { currentStock: { [Op.lte]: sequelize.col('reorderLevel') } }
    ];
  }

  const { count, rows } = await db.Inventory.findAndCountAll({
    where,
    offset,
    limit: parseInt(limit),
    order: [['productCode', 'ASC']]
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

const updateProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const product = await db.Inventory.findByPk(id);

  if (!product) {
    return res.status(404).json({
      success: false,
      message: 'Product not found'
    });
  }

  await product.update(req.body);

  Logger.info(`Product updated: ${product.productCode}`);

  res.json({
    success: true,
    message: 'Product updated successfully',
    data: product
  });
});

const updateStock = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { quantity, type } = req.body; // type: 'add' or 'subtract'

  if (!quantity || !type) {
    return res.status(400).json({
      success: false,
      message: 'Quantity and type are required'
    });
  }

  const product = await db.Inventory.findByPk(id);

  if (!product) {
    return res.status(404).json({
      success: false,
      message: 'Product not found'
    });
  }

  if (type === 'add') {
    product.currentStock += quantity;
  } else if (type === 'subtract') {
    if (product.currentStock < quantity) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient stock'
      });
    }
    product.currentStock -= quantity;
  }

  product.lastRestockDate = new Date();
  await product.save();

  Logger.info(`Stock updated for product: ${product.productCode}`);

  res.json({
    success: true,
    message: 'Stock updated successfully',
    data: product
  });
});

const getLowStockProducts = asyncHandler(async (req, res) => {
  const products = await db.Inventory.findAll({
    where: {
      isActive: true,
      currentStock: { [Op.lte]: db.sequelize.col('reorderLevel') }
    },
    order: [['currentStock', 'ASC']]
  });

  res.json({
    success: true,
    data: products
  });
});

// ==================== PURCHASE CONTROLLER ====================

const createPurchase = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const { supplierName, supplierContact, purchaseDate, expectedDeliveryDate, category, items, shippingCost, taxAmount, notes } = req.body;

  if (!supplierName || !category || !items || items.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields'
    });
  }

  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.cost), 0);
  const totalAmount = subtotal + (shippingCost || 0) + (taxAmount || 0);
  const purchaseNumber = `PO-${Date.now()}`;

  const purchase = await db.Purchase.create({
    purchaseNumber,
    userId,
    supplierName,
    supplierContact,
    purchaseDate: purchaseDate || new Date(),
    expectedDeliveryDate,
    category,
    items,
    subtotal,
    shippingCost: shippingCost || 0,
    taxAmount: taxAmount || 0,
    totalAmount,
    notes
  });

  Logger.info(`Purchase order created: ${purchaseNumber}`);

  res.status(201).json({
    success: true,
    message: 'Purchase order created successfully',
    data: purchase
  });
});

const getPurchases = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const { page = 1, limit = 10, status, startDate, endDate } = req.query;

  const offset = (page - 1) * limit;
  const where = { userId };

  if (status) where.status = status;
  if (startDate || endDate) {
    where.purchaseDate = {};
    if (startDate) where.purchaseDate[Op.gte] = new Date(startDate);
    if (endDate) where.purchaseDate[Op.lte] = new Date(endDate);
  }

  const { count, rows } = await db.Purchase.findAndCountAll({
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

const updatePurchase = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { userId } = req.user;

  const purchase = await db.Purchase.findOne({
    where: { id, userId }
  });

  if (!purchase) {
    return res.status(404).json({
      success: false,
      message: 'Purchase order not found'
    });
  }

  await purchase.update(req.body);

  Logger.info(`Purchase order updated: ${purchase.purchaseNumber}`);

  res.json({
    success: true,
    message: 'Purchase order updated successfully',
    data: purchase
  });
});

module.exports = {
  createProduct,
  getInventory,
  updateProduct,
  updateStock,
  getLowStockProducts,
  createPurchase,
  getPurchases,
  updatePurchase
};
