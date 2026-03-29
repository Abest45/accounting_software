const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reports');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/auth');

// All report endpoints require authentication
router.use(authenticateToken);

// Invoice report (PDF or Excel)
// GET /api/reports/invoices?format=pdf&startDate=2026-01-01&endDate=2026-01-31
router.get('/invoices', asyncHandler(reportsController.getInvoiceReport));

// P&L report (PDF or Excel)
// GET /api/reports/p-and-l?format=excel&startDate=2026-01-01&endDate=2026-01-31
router.get('/p-and-l', asyncHandler(reportsController.getProfitLossReport));

// Payroll report (PDF or Excel)
// GET /api/reports/payroll?format=pdf&startDate=2026-01-01&endDate=2026-01-31
router.get('/payroll', asyncHandler(reportsController.getPayrollReport));

module.exports = router;
