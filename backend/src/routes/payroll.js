const express = require('express');
const router = express.Router();
const payrollController = require('../controllers/payroll');
const { asyncHandler } = require('../middleware/errorHandler');

router.post('/', asyncHandler(payrollController.createPayroll));
router.get('/', asyncHandler(payrollController.getPayrolls));
router.post('/process', asyncHandler(payrollController.processPayroll));
router.get('/summary', asyncHandler(payrollController.getPayrollSummary));

module.exports = router;
