const User = require('../models/auth');
const Payment = require('../models/payment');
const Subscription = require('../models/subscription');
const mongoose = require('mongoose');

/**
 * GET /api/transactions
 * Get user transactions
 */
exports.getTransactions = async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 20, status } = req.query;
        const skip = (page - 1) * limit;

        let query = { userId };
        if (status) query.status = status;

        const total = await Payment.countDocuments(query);
        const transactions = await Payment.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        return res.status(200).json({
            success: true,
            data: transactions,
            pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error fetching transactions', error: error.message });
    }
};

/**
 * GET /api/payments/history
 * Get payment history
 */
exports.getPaymentHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 20, paymentMethod } = req.query;
        const skip = (page - 1) * limit;

        let query = { userId, status: 'completed' };
        if (paymentMethod) query.paymentMethod = paymentMethod;

        const total = await Payment.countDocuments(query);
        const history = await Payment.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .select('amount currency paymentMethod status createdAt description');

        return res.status(200).json({
            success: true,
            data: history,
            pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error fetching payment history', error: error.message });
    }
};

/**
 * POST /api/payments/methods
 * Add payment method
 */
exports.addPaymentMethod = async (req, res) => {
    try {
        const userId = req.user.id;
        const { type, cardNumber, expiryDate, cvv, holderName, isDefault } = req.body;

        if (!type || !cardNumber) {
            return res.status(400).json({ success: false, message: 'type and cardNumber are required' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const paymentMethod = {
            _id: new mongoose.Types.ObjectId(),
            type,
            cardNumber: cardNumber.slice(-4),
            expiryDate,
            holderName: holderName || '',
            isDefault: isDefault || false,
            addedAt: new Date()
        };

        if (!user.paymentMethods) user.paymentMethods = [];

        if (isDefault) {
            user.paymentMethods.forEach(m => m.isDefault = false);
        }

        user.paymentMethods.push(paymentMethod);
        await user.save();

        return res.status(201).json({
            success: true,
            message: 'Payment method added',
            data: paymentMethod
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error adding payment method', error: error.message });
    }
};

/**
 * GET /api/payments/methods
 * Get all payment methods
 */
exports.getPaymentMethods = async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await User.findById(userId).select('paymentMethods');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        return res.status(200).json({
            success: true,
            data: user.paymentMethods || []
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error fetching payment methods', error: error.message });
    }
};

/**
 * PUT /api/payments/methods/:id/default
 * Set payment method as default
 */
exports.setDefaultPaymentMethod = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid payment method ID' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const paymentMethod = user.paymentMethods?.find(m => m._id.toString() === id);
        if (!paymentMethod) {
            return res.status(404).json({ success: false, message: 'Payment method not found' });
        }

        user.paymentMethods.forEach(m => m.isDefault = false);
        paymentMethod.isDefault = true;
        await user.save();

        return res.status(200).json({
            success: true,
            message: 'Default payment method updated',
            data: paymentMethod
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error updating payment method', error: error.message });
    }
};

/**
 * DELETE /api/payments/methods/:id
 * Delete payment method
 */
exports.deletePaymentMethod = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid payment method ID' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const methodIndex = user.paymentMethods?.findIndex(m => m._id.toString() === id);
        if (methodIndex === -1 || methodIndex === undefined) {
            return res.status(404).json({ success: false, message: 'Payment method not found' });
        }

        const deleted = user.paymentMethods.splice(methodIndex, 1);
        await user.save();

        return res.status(200).json({
            success: true,
            message: 'Payment method deleted',
            data: deleted[0]
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error deleting payment method', error: error.message });
    }
};

/**
 * GET /api/subscriptions/current
 * Get current subscription
 */
exports.getCurrentSubscription = async (req, res) => {
    try {
        const userId = req.user.id;

        const subscription = await Subscription.findOne({ userId, status: 'active' });
        if (!subscription) {
            return res.status(200).json({ success: true, data: null, message: 'No active subscription' });
        }

        return res.status(200).json({ success: true, data: subscription });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error fetching subscription', error: error.message });
    }
};

/**
 * GET /api/subscriptions/timeline
 * Get subscription timeline/history
 */
exports.getSubscriptionTimeline = async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 10 } = req.query;
        const skip = (page - 1) * limit;

        const total = await Subscription.countDocuments({ userId });
        const subscriptions = await Subscription.find({ userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        return res.status(200).json({
            success: true,
            data: subscriptions,
            pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error fetching subscription timeline', error: error.message });
    }
};

/**
 * GET /api/subscriptions/plans
 * Get available subscription plans
 */
exports.getSubscriptionPlans = async (req, res) => {
    try {
        const plans = [
            {
                id: 'free',
                name: 'Free',
                price: 0,
                currency: 'INR',
                duration: 'lifetime',
                features: ['Basic profile', 'Limited campaign access', 'Basic messaging']
            },
            {
                id: 'starter',
                name: 'Starter',
                price: 499,
                currency: 'INR',
                duration: 'monthly',
                features: ['Enhanced profile', 'Full campaign access', 'Advanced messaging', 'Priority support']
            },
            {
                id: 'professional',
                name: 'Professional',
                price: 999,
                currency: 'INR',
                duration: 'monthly',
                features: ['Premium profile', 'Unlimited campaigns', 'Advanced analytics', 'Dedicated support', 'Custom rates']
            }
        ];

        return res.status(200).json({
            success: true,
            data: plans
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error fetching plans', error: error.message });
    }
};

/**
 * POST /api/subscriptions/upgrade
 * Upgrade subscription
 */
exports.upgradeSubscription = async (req, res) => {
    try {
        const userId = req.user.id;
        const { planId, paymentMethodId } = req.body;

        if (!planId || !paymentMethodId) {
            return res.status(400).json({ success: false, message: 'planId and paymentMethodId are required' });
        }

        const subscription = new Subscription({
            userId,
            planId,
            status: 'active',
            startDate: new Date(),
            renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            paymentMethodId
        });

        await subscription.save();

        return res.status(201).json({
            success: true,
            message: 'Subscription upgraded',
            data: subscription
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error upgrading subscription', error: error.message });
    }
};

/**
 * POST /api/subscriptions/downgrade
 * Downgrade subscription
 */
exports.downgradeSubscription = async (req, res) => {
    try {
        const userId = req.user.id;
        const { planId } = req.body;

        if (!planId) {
            return res.status(400).json({ success: false, message: 'planId is required' });
        }

        const subscription = await Subscription.findOne({ userId, status: 'active' });
        if (!subscription) {
            return res.status(404).json({ success: false, message: 'No active subscription' });
        }

        subscription.planId = planId;
        subscription.downgradedAt = new Date();
        await subscription.save();

        return res.status(200).json({
            success: true,
            message: 'Subscription downgraded',
            data: subscription
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error downgrading subscription', error: error.message });
    }
};

/**
 * POST /api/subscriptions/cancel
 * Cancel subscription
 */
exports.cancelSubscription = async (req, res) => {
    try {
        const userId = req.user.id;
        const { reason } = req.body;

        const subscription = await Subscription.findOne({ userId, status: 'active' });
        if (!subscription) {
            return res.status(404).json({ success: false, message: 'No active subscription' });
        }

        subscription.status = 'cancelled';
        subscription.cancelledAt = new Date();
        subscription.cancellationReason = reason || '';
        await subscription.save();

        return res.status(200).json({
            success: true,
            message: 'Subscription cancelled',
            data: subscription
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error cancelling subscription', error: error.message });
    }
};

/**
 * GET /api/lists
 * Get user lists
 */
exports.getLists = async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 20 } = req.query;
        const skip = (page - 1) * limit;

        const user = await User.findById(userId).select('lists');
        const total = user.lists?.length || 0;
        const lists = user.lists?.slice(skip, skip + parseInt(limit)) || [];

        return res.status(200).json({
            success: true,
            data: lists,
            pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) || 1 }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error fetching lists', error: error.message });
    }
};

/**
 * POST /api/lists
 * Create new list
 */
exports.createList = async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, description, isPublic } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, message: 'name is required' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const list = {
            _id: new mongoose.Types.ObjectId(),
            name,
            description: description || '',
            isPublic: isPublic || false,
            items: [],
            createdAt: new Date()
        };

        if (!user.lists) user.lists = [];
        user.lists.push(list);
        await user.save();

        return res.status(201).json({
            success: true,
            message: 'List created',
            data: list
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error creating list', error: error.message });
    }
};

/**
 * GET /api/lists/:id/items
 * Get items in a list
 */
exports.getListItems = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { page = 1, limit = 50 } = req.query;
        const skip = (page - 1) * limit;

        const user = await User.findById(userId);
        const list = user.lists?.find(l => l._id.toString() === id);

        if (!list) {
            return res.status(404).json({ success: false, message: 'List not found' });
        }

        const total = list.items?.length || 0;
        const items = list.items?.slice(skip, skip + parseInt(limit)) || [];

        return res.status(200).json({
            success: true,
            data: items,
            pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) || 1 }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error fetching list items', error: error.message });
    }
};

/**
 * POST /api/lists/:id/items
 * Add item to list
 */
exports.addListItem = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { itemId, itemType, name } = req.body;

        if (!itemId || !itemType) {
            return res.status(400).json({ success: false, message: 'itemId and itemType are required' });
        }

        const user = await User.findById(userId);
        const list = user.lists?.find(l => l._id.toString() === id);

        if (!list) {
            return res.status(404).json({ success: false, message: 'List not found' });
        }

        const item = {
            _id: new mongoose.Types.ObjectId(),
            itemId,
            itemType,
            name: name || '',
            addedAt: new Date()
        };

        if (!list.items) list.items = [];
        list.items.push(item);
        await user.save();

        return res.status(201).json({
            success: true,
            message: 'Item added to list',
            data: item
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error adding item', error: error.message });
    }
};

/**
 * DELETE /api/lists/:id/items/:itemId
 * Remove item from list
 */
exports.removeListItem = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id, itemId } = req.params;

        const user = await User.findById(userId);
        const list = user.lists?.find(l => l._id.toString() === id);

        if (!list) {
            return res.status(404).json({ success: false, message: 'List not found' });
        }

        const itemIndex = list.items?.findIndex(i => i._id.toString() === itemId);
        if (itemIndex === -1 || itemIndex === undefined) {
            return res.status(404).json({ success: false, message: 'Item not found' });
        }

        const removed = list.items.splice(itemIndex, 1);
        await user.save();

        return res.status(200).json({
            success: true,
            message: 'Item removed from list',
            data: removed[0]
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error removing item', error: error.message });
    }
};
