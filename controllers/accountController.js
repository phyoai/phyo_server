const Transaction = require('../models/transaction');
const User = require('../models/auth');
const mongoose = require('mongoose');

/**
 * GET /api/account/transactions
 * Get user's transaction history with pagination
 */
exports.getTransactions = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const { page = 1, limit = 20, type, status } = req.query;
        const skip = (page - 1) * limit;

        // Build filter
        const filter = { userId };
        if (type) filter.type = type;
        if (status) filter.status = status;

        const transactions = await Transaction.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        const total = await Transaction.countDocuments(filter);

        return res.status(200).json({
            success: true,
            data: transactions,
            pagination: {
                current: parseInt(page),
                total: Math.ceil(total / limit),
                count: transactions.length,
                total_items: total
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error fetching transactions',
            error: error.message
        });
    }
};

/**
 * POST /api/account/transactions
 * Create a new transaction record
 */
exports.createTransaction = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const { amount, type, status, description, referenceId } = req.body;

        if (!amount || !type) {
            return res.status(400).json({
                success: false,
                message: 'amount and type are required'
            });
        }

        const transaction = new Transaction({
            userId,
            amount,
            type, // 'credit', 'debit', 'campaign', 'subscription', 'refund'
            status: status || 'completed', // 'pending', 'completed', 'failed'
            description,
            referenceId,
            createdAt: new Date()
        });

        await transaction.save();

        return res.status(201).json({
            success: true,
            data: transaction
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error creating transaction',
            error: error.message
        });
    }
};

/**
 * GET /api/account/billing-summary
 * Get billing summary for current user
 */
exports.getBillingSummary = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const user = await User.findById(userId).select('totalSpent currentPlan planExpiry credits').lean();
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Get this month's transactions
        const startOfMonth = new Date();
        startOfMonth.setDate(1);

        const currentMonthTransactions = await Transaction.find({
            userId,
            createdAt: { $gte: startOfMonth }
        }).lean();

        const monthlySpent = currentMonthTransactions.reduce((sum, t) =>
            (t.type === 'debit' || t.type === 'campaign' ? sum + t.amount : sum), 0
        );

        // Get this month's invoices (transactions with status completed)
        const completedTransactions = currentMonthTransactions.filter(t => t.status === 'completed');

        return res.status(200).json({
            success: true,
            data: {
                totalSpent: user.totalSpent || 0,
                currentMonthSpent: monthlySpent,
                currentPlan: user.currentPlan || 'free',
                planExpiry: user.planExpiry,
                availableCredits: user.credits || 0,
                totalTransactions: completedTransactions.length,
                invoices: completedTransactions.length
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error fetching billing summary',
            error: error.message
        });
    }
};

/**
 * GET /api/account/payments/history
 * Get payment history
 */
exports.getPaymentHistory = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const { page = 1, limit = 20 } = req.query;
        const skip = (page - 1) * limit;

        // Get transactions with type 'subscription' or 'payment'
        const payments = await Transaction.find({
            userId,
            type: { $in: ['subscription', 'payment', 'credit_purchase'] },
            status: 'completed'
        })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        const total = await Transaction.countDocuments({
            userId,
            type: { $in: ['subscription', 'payment', 'credit_purchase'] },
            status: 'completed'
        });

        return res.status(200).json({
            success: true,
            data: payments,
            pagination: {
                current: parseInt(page),
                total: Math.ceil(total / limit),
                count: payments.length,
                total_items: total
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error fetching payment history',
            error: error.message
        });
    }
};

/**
 * GET /api/account/statements/:id
 * Get and download transaction/statement details
 */
exports.getStatement = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { id } = req.params;

        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const transaction = await Transaction.findOne({
            _id: id,
            userId
        }).lean();

        if (!transaction) {
            return res.status(404).json({ success: false, message: 'Statement not found' });
        }

        return res.status(200).json({
            success: true,
            data: {
                ...transaction,
                statementDate: transaction.createdAt,
                invoiceNumber: `INV-${transaction._id.toString().slice(-8).toUpperCase()}`,
                downloadUrl: `/api/account/statements/${id}/download`
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error fetching statement',
            error: error.message
        });
    }
};
