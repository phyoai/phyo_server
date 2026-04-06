import express from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  getTransactions,
  getPaymentHistory,
  getPaymentMethods,
  addPaymentMethod,
  setDefaultPaymentMethod,
  deletePaymentMethod,
  getCurrentSubscription,
  getSubscriptionTimeline,
  getSubscriptionPlans,
  upgradeSubscription,
  downgradeSubscription,
  cancelSubscription,
  getLists,
  createList,
  getListItems,
  addListItem,
  removeListItem
} from '../controllers/account';

const router = express.Router();

// Transactions
router.get('/transactions', authenticateToken, getTransactions);

// Payments
router.get('/payments/history', authenticateToken, getPaymentHistory);
router.get('/payments/methods', authenticateToken, getPaymentMethods);
router.post('/payments/methods', authenticateToken, addPaymentMethod);
router.put('/payments/methods/:id/default', authenticateToken, setDefaultPaymentMethod);
router.delete('/payments/methods/:id', authenticateToken, deletePaymentMethod);

// Subscriptions
router.get('/subscriptions/current', authenticateToken, getCurrentSubscription);
router.get('/subscriptions/timeline', authenticateToken, getSubscriptionTimeline);
router.get('/subscriptions/plans', authenticateToken, getSubscriptionPlans);
router.post('/subscriptions/upgrade', authenticateToken, upgradeSubscription);
router.post('/subscriptions/downgrade', authenticateToken, downgradeSubscription);
router.post('/subscriptions/cancel', authenticateToken, cancelSubscription);

// Lists
router.get('/lists', authenticateToken, getLists);
router.post('/lists', authenticateToken, createList);
router.get('/lists/:id/items', authenticateToken, getListItems);
router.post('/lists/:id/items', authenticateToken, addListItem);
router.delete('/lists/:id/items/:itemId', authenticateToken, removeListItem);

export default router;
