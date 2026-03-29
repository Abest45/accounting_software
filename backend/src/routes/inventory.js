const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventory');
const { asyncHandler } = require('../middleware/errorHandler');

// Inventory (Product) routes
router.post('/products', asyncHandler(inventoryController.createProduct));
router.get('/products', asyncHandler(inventoryController.getInventory));
router.put('/products/:id', asyncHandler(inventoryController.updateProduct));
router.put('/products/:id/stock', asyncHandler(inventoryController.updateStock));
router.get('/low-stock', asyncHandler(inventoryController.getLowStockProducts));

// Purchase routes
router.post('/purchases', asyncHandler(inventoryController.createPurchase));
router.get('/purchases', asyncHandler(inventoryController.getPurchases));
router.put('/purchases/:id', asyncHandler(inventoryController.updatePurchase));

module.exports = router;
