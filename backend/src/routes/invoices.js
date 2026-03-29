const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoices');
const { asyncHandler } = require('../middleware/errorHandler');

router.post('/', asyncHandler((req, res, next) => {
  const io = req.app.get('io');
  invoiceController.createInvoice(req, res, io);
}));

router.get('/', asyncHandler(invoiceController.getInvoices));
router.get('/:id', asyncHandler(invoiceController.getInvoiceById));

router.put('/:id', asyncHandler((req, res, next) => {
  const io = req.app.get('io');
  invoiceController.updateInvoice(req, res, io);
}));

router.delete('/:id', asyncHandler((req, res, next) => {
  const io = req.app.get('io');
  invoiceController.deleteInvoice(req, res, io);
}));

module.exports = router;
