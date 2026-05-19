import express from 'express';
import {
  getPlans,
  getUserPlan,
  createPaymentOrder,
  verifyPayment,
  getPaymentHistory,
  pauseSubscription,
  cancelSubscription,
  getUserCredits,
  razorpayWebhook,
  createRazorpayPlan,
  fetchRazorpayPlans,
  fetchRazorpayPlanById,
  createRazorpaySubscription,
  createRazorpaySubscriptionLink,
  fetchRazorpaySubscriptions,
  fetchRazorpaySubscriptionById,
  cancelRazorpaySubscription,
  updateRazorpaySubscription,
  fetchRazorpayPendingUpdate,
  cancelRazorpayPendingUpdate,
  pauseRazorpaySubscription,
  resumeRazorpaySubscription,
  fetchRazorpaySubscriptionInvoices
} from '../controllers/payment';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Razorpay webhook - no authentication required (comes from Razorpay servers)
router.post('/webhook', razorpayWebhook);

// All other payment routes require authentication
router.use(authenticateToken);

// Get all available plans
router.get('/plans', getPlans);

// Get user's current plan information
router.get('/user-plan', getUserPlan);

// Create payment order
router.post('/create-order', createPaymentOrder);

// Verify payment
router.post('/verify-payment', verifyPayment);

// Get payment history
router.get('/history', getPaymentHistory);

// Get user credits
router.get('/credits', getUserCredits);

// Cancel subscription
router.post('/cancel-subscription', cancelSubscription);

// Pause subscription
router.post('/pause-subscription', pauseSubscription);

// Razorpay Plan APIs
router.post('/razorpay/plans', createRazorpayPlan);
router.get('/razorpay/plans', fetchRazorpayPlans);
router.get('/razorpay/plans/:planId', fetchRazorpayPlanById);

// Razorpay Subscription APIs
router.post('/razorpay/subscriptions', createRazorpaySubscription);
router.post('/razorpay/subscription-links', createRazorpaySubscriptionLink);
router.get('/razorpay/subscriptions', fetchRazorpaySubscriptions);
router.get('/razorpay/subscriptions/:subscriptionId', fetchRazorpaySubscriptionById);
router.post('/razorpay/subscriptions/:subscriptionId/cancel', cancelRazorpaySubscription);
router.patch('/razorpay/subscriptions/:subscriptionId', updateRazorpaySubscription);
router.get('/razorpay/subscriptions/:subscriptionId/pending-update', fetchRazorpayPendingUpdate);
router.post('/razorpay/subscriptions/:subscriptionId/pending-update/cancel', cancelRazorpayPendingUpdate);
router.post('/razorpay/subscriptions/:subscriptionId/pause', pauseRazorpaySubscription);
router.post('/razorpay/subscriptions/:subscriptionId/resume', resumeRazorpaySubscription);
router.get('/razorpay/subscriptions/:subscriptionId/invoices', fetchRazorpaySubscriptionInvoices);

export default router;
