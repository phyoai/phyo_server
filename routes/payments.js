const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
    getAllPlans,
    getCurrentPlan,
    getCredits,
    createSilverOrder,
    createGoldOrder,
    createPremiumOrder,
    verifyPayment,
    getPaymentHistory,
    cancelSubscription,
    testWebhook,
    pauseSubscription,
    resumeSubscription,
    getBillingSummary
} = require('../controllers/paymentController');

// Plans and current subscription
router.get('/plans', getAllPlans);
router.get('/current-plan', authMiddleware, getCurrentPlan);
router.get('/credits', authMiddleware, getCredits);

// Orders and payment
router.post('/order/silver', authMiddleware, createSilverOrder);
router.post('/order/gold', authMiddleware, createGoldOrder);
router.post('/order/premium', authMiddleware, createPremiumOrder);
router.post('/verify', authMiddleware, verifyPayment);

// Subscription management
router.get('/history', authMiddleware, getPaymentHistory);
router.post('/cancel', authMiddleware, cancelSubscription);
router.post('/pause', authMiddleware, pauseSubscription);
router.post('/resume', authMiddleware, resumeSubscription);

// Billing summary
router.get('/billing-summary', authMiddleware, getBillingSummary);

// Webhook testing
router.get('/webhook-test', authMiddleware, testWebhook);

module.exports = router;
