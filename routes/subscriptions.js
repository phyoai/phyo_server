const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const authMiddleware = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

// Get subscription plans
router.get('/plans', subscriptionController.getSubscriptionPlans);

// Get current subscription
router.get('/current', subscriptionController.getCurrentSubscription);

// Upgrade subscription
router.post('/upgrade', subscriptionController.upgradeSubscription);

// Downgrade subscription
router.post('/downgrade', subscriptionController.downgradeSubscription);

// Pause subscription
router.post('/pause', subscriptionController.pauseSubscription);

// Resume subscription
router.post('/resume', subscriptionController.resumeSubscription);

// Cancel subscription
router.post('/cancel', subscriptionController.cancelSubscription);

// Toggle auto-renewal
router.post('/toggle-autorenew', subscriptionController.toggleAutoRenewal);

// Get subscription history
router.get('/history', subscriptionController.getSubscriptionHistory);

// Get billing dates
router.get('/billing-dates', subscriptionController.getBillingDates);

module.exports = router;
