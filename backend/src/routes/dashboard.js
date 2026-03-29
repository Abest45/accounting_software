const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard');
const { asyncHandler } = require('../middleware/errorHandler');

router.get('/stats', asyncHandler(dashboardController.getDashboardStats));
router.get('/revenue-expenses', asyncHandler(dashboardController.getRevenueVsExpenses));
router.get('/expense-breakdown', asyncHandler(dashboardController.getExpenseBreakdown));
router.get('/payroll-insights', asyncHandler(dashboardController.getPayrollInsights));
router.get('/inventory-status', asyncHandler(dashboardController.getInventoryStatus));
router.get('/audit-logs', asyncHandler(dashboardController.getAuditLogs));

module.exports = router;
