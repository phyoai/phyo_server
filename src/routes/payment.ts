import express from 'express';
import {
  getPlans,
  getUserPlan,
  createPaymentOrder,
  verifyPayment,
  getPaymentHistory,
  cancelSubscription,
  getUserCredits,
  razorpayWebhook
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

export default router;
