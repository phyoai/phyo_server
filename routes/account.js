const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
    getTransactions,
    getPaymentHistory,
    addPaymentMethod,
    getPaymentMethods,
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
} = require('../controllers/accountBillingController');

// Transactions
router.get('/transactions', authMiddleware, getTransactions);

// Payments
router.get('/payments/history', authMiddleware, getPaymentHistory);
router.post('/payments/methods', authMiddleware, addPaymentMethod);
router.get('/payments/methods', authMiddleware, getPaymentMethods);
router.put('/payments/methods/:id/default', authMiddleware, setDefaultPaymentMethod);
router.delete('/payments/methods/:id', authMiddleware, deletePaymentMethod);

// Subscriptions
router.get('/subscriptions/current', authMiddleware, getCurrentSubscription);
router.get('/subscriptions/timeline', authMiddleware, getSubscriptionTimeline);
router.get('/subscriptions/plans', getSubscriptionPlans);
router.post('/subscriptions/upgrade', authMiddleware, upgradeSubscription);
router.post('/subscriptions/downgrade', authMiddleware, downgradeSubscription);
router.post('/subscriptions/cancel', authMiddleware, cancelSubscription);

// Lists
router.get('/lists', authMiddleware, getLists);
router.post('/lists', authMiddleware, createList);
router.get('/lists/:id/items', authMiddleware, getListItems);
router.post('/lists/:id/items', authMiddleware, addListItem);
router.delete('/lists/:id/items/:itemId', authMiddleware, removeListItem);

module.exports = router;
