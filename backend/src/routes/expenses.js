const express = require('express');
const router = express.Router();
const expensesController = require('../controllers/expenses');
const { asyncHandler } = require('../middleware/errorHandler');

// Expense routes
router.post('/expenses', asyncHandler(expensesController.createExpense));
router.get('/expenses', asyncHandler(expensesController.getExpenses));
router.put('/expenses/:id', asyncHandler(expensesController.updateExpense));
router.delete('/expenses/:id', asyncHandler(expensesController.deleteExpense));

// Receipt routes
router.post('/receipts', asyncHandler(expensesController.createReceipt));
router.get('/receipts', asyncHandler(expensesController.getReceipts));
router.delete('/receipts/:id', asyncHandler(expensesController.deleteReceipt));

module.exports = router;
