const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth');

// pending user approvals (super-admin only)
router.get('/pending-users', authController.getPendingUsers);
router.post('/approve-user', authController.approveUserById);

module.exports = router;
