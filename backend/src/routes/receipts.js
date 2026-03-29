const express = require('express');
const router = express.Router();
const receiptController = require('../controllers/expenses');
const { asyncHandler } = require('../middleware/errorHandler');

router.post('/', asyncHandler(receiptController.createReceipt));
router.get('/', asyncHandler(receiptController.getReceipts));
router.delete('/:id', asyncHandler(receiptController.deleteReceipt));

module.exports = router;
