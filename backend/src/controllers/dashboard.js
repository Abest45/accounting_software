const db = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');
const Logger = require('../utils/logger');
const { Op, sequelize } = require('sequelize');

// ==================== DASHBOARD CONTROLLER ====================

const getDashboardStats = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const { startDate, endDate } = req.query;

  const dateWhere = {};
  if (startDate || endDate) {
    dateWhere[Op.or] = [
      { invoiceDate: { [Op.gte]: new Date(startDate) } },
      { receiptDate: { [Op.gte]: new Date(startDate) } },
      { expenseDate: { [Op.gte]: new Date(startDate) } }
    ];
    if (endDate) {
      dateWhere[Op.and] = [
        { invoiceDate: { [Op.lte]: new Date(endDate) } },
        { receiptDate: { [Op.lte]: new Date(endDate) } },
        { expenseDate: { [Op.lte]: new Date(endDate) } }
      ];
    }
  }

  // Get invoices data
  const invoices = await db.Invoice.findAll({
    where: { userId, ...dateWhere },
    attributes: [
      [sequelize.fn('SUM', sequelize.col('totalAmount')), 'totalRevenue'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'totalInvoices']
    ]
  });

  // Get expenses data
  const expenses = await db.Expense.findAll({
    where: { userId, ...dateWhere },
    attributes: [
      [sequelize.fn('SUM', sequelize.col('amount')), 'totalExpenses'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'totalExpenseRecords']
    ]
  });

  // Get receipts data
  const receipts = await db.Receipt.findAll({
    where: { userId, ...dateWhere },
    attributes: [
      [sequelize.fn('SUM', sequelize.col('amount')), 'totalReceipts']
    ]
  });

  // Get inventory data
  const inventory = await db.Inventory.findAll({
    attributes: [
      [sequelize.fn('COUNT', sequelize.col('id')), 'totalProducts'],
      [sequelize.fn('SUM', sequelize.col('currentStock')), 'totalStock'],
      [sequelize.fn('SUM', sequelize.col('unitCost'), sequelize.col('currentStock')), 'inventoryValue']
    ]
  });

  const totalRevenue = parseFloat(invoices[0]?.dataValues?.totalRevenue || 0);
  const totalExpenses = parseFloat(expenses[0]?.dataValues?.totalExpenses || 0);
  const netProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(2) : 0;

  res.json({
    success: true,
    data: {
      totalRevenue,
      totalExpenses,
      netProfit,
      profitMargin: `${profitMargin}%`,
      totalInvoices: invoices[0]?.dataValues?.totalInvoices || 0,
      totalReceipts: parseFloat(receipts[0]?.dataValues?.totalReceipts || 0),
      totalProducts: inventory[0]?.dataValues?.totalProducts || 0,
      totalInventoryValue: parseFloat(inventory[0]?.dataValues?.inventoryValue || 0),
      cashFlow: parseFloat(receipts[0]?.dataValues?.totalReceipts || 0) - totalExpenses
    }
  });
});

const getRevenueVsExpenses = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const { period = 'monthly' } = req.query;

  let dateFormat = '%Y-%m'; // monthly
  if (period === 'daily') dateFormat = '%Y-%m-%d';
  if (period === 'yearly') dateFormat = '%Y';

  const data = await db.sequelize.query(
    `
    SELECT 
      DATE_TRUNC('${period}', i."invoiceDate") as date,
      SUM(i."totalAmount") as revenue,
      SUM(COALESCE(e."amount", 0)) as expenses
    FROM invoices i
    LEFT JOIN expenses e ON DATE_TRUNC('${period}', i."invoiceDate") = DATE_TRUNC('${period}', e."expenseDate")
    WHERE i."userId" = :userId
    GROUP BY DATE_TRUNC('${period}', i."invoiceDate")
    ORDER BY date DESC
    LIMIT 12
    `,
    {
      replacements: { userId },
      type: sequelize.QueryTypes.SELECT
    }
  );

  res.json({
    success: true,
    data: data.reverse()
  });
});

const getExpenseBreakdown = asyncHandler(async (req, res) => {
  const { userId } = req.user;

  const breakdown = await db.Expense.findAll({
    where: { userId },
    attributes: [
      'category',
      [sequelize.fn('SUM', sequelize.col('amount')), 'total'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'count']
    ],
    group: ['category'],
    raw: true
  });

  res.json({
    success: true,
    data: breakdown
  });
});

const getPayrollInsights = asyncHandler(async (req, res) => {
  const summary = await db.Payroll.findAll({
    attributes: [
      [sequelize.fn('COUNT', sequelize.col('id')), 'totalPayrolls'],
      [sequelize.fn('SUM', sequelize.col('grossSalary')), 'totalGrossSalary'],
      [sequelize.fn('SUM', sequelize.col('taxAmount')), 'totalTax'],
      [sequelize.fn('AVG', sequelize.col('grossSalary')), 'averageSalary']
    ],
    where: { status: 'paid' }
  });

  res.json({
    success: true,
    data: summary[0]
  });
});

const getInventoryStatus = asyncHandler(async (req, res) => {
  const lowStock = await db.Inventory.findAll({
    where: {
      currentStock: { [Op.lte]: sequelize.col('reorderLevel') }
    },
    limit: 10
  });

  const outOfStock = await db.Inventory.findAll({
    where: { currentStock: 0 }
  });

  const totalValue = await db.Inventory.findAll({
    attributes: [
      [sequelize.fn('SUM', sequelize.literal('currentStock * unitCost')), 'totalValue']
    ]
  });

  res.json({
    success: true,
    data: {
      lowStockItems: lowStock,
      outOfStockCount: outOfStock.length,
      totalInventoryValue: totalValue[0]?.dataValues?.totalValue || 0
    }
  });
});

const getAuditLogs = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const { page = 1, limit = 20 } = req.query;

  const offset = (page - 1) * limit;

  const { count, rows } = await db.AuditLog.findAndCountAll({
    where: { userId },
    offset,
    limit: parseInt(limit),
    order: [['timestamp', 'DESC']]
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

module.exports = {
  getDashboardStats,
  getRevenueVsExpenses,
  getExpenseBreakdown,
  getPayrollInsights,
  getInventoryStatus,
  getAuditLogs
};
