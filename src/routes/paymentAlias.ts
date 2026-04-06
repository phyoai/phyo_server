import { Router } from 'express';
import {
  getPlans,
  getUserPlan,
  createPaymentOrder,
  verifyPayment,
  getPaymentHistory,
  cancelSubscription,
  getUserCredits
} from '../controllers/payment';
import { authenticateToken } from '../middleware/auth';
import paymentRouter from './payment';

const router = Router();

router.get('/plans', authenticateToken, getPlans);
router.get('/current-plan', authenticateToken, getUserPlan);
router.get('/history', authenticateToken, getPaymentHistory);
router.get('/credits', authenticateToken, getUserCredits);
router.post('/order/:planId', authenticateToken, createPaymentOrder);
router.post('/order', authenticateToken, createPaymentOrder);
router.post('/verify', authenticateToken, verifyPayment);
router.post('/cancel', authenticateToken, cancelSubscription);

router.use('/', paymentRouter);

export default router;
