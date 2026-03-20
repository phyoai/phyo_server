const express = require('express');
const router = express.Router();
const paymentMethodController = require('../controllers/paymentMethodController');
const authMiddleware = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

// GET all payment methods
router.get('/', paymentMethodController.getPaymentMethods);

// GET single payment method
router.get('/:methodId', paymentMethodController.getPaymentMethod);

// POST create new payment method
router.post('/', paymentMethodController.createPaymentMethod);

// PATCH update payment method
router.patch('/:methodId', paymentMethodController.updatePaymentMethod);

// PATCH set as default
router.patch('/:methodId/set-default', paymentMethodController.setDefaultPaymentMethod);

// DELETE payment method
router.delete('/:methodId', paymentMethodController.deletePaymentMethod);

module.exports = router;
