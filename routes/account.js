const express = require('express');
const router = express.Router();
const accountController = require('../controllers/accountController');
const authMiddleware = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

// Transactions
router.get('/transactions', accountController.getTransactions);
router.post('/transactions', accountController.createTransaction);

// Billing
router.get('/billing-summary', accountController.getBillingSummary);
router.get('/payments/history', accountController.getPaymentHistory);

// Statements
router.get('/statements/:id', accountController.getStatement);

module.exports = router;
