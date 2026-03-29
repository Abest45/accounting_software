const express = require('express');
const router = express.Router();
const purchaseController = require('../controllers/inventory');
const { asyncHandler } = require('../middleware/errorHandler');

router.post('/', asyncHandler(purchaseController.createPurchase));
router.get('/', asyncHandler(purchaseController.getPurchases));
router.put('/:id', asyncHandler(purchaseController.updatePurchase));

module.exports = router;
