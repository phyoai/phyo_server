const Payment = require('../models/payment');
const { SubscriptionPlan, UserSubscription } = require('../models/subscription');
const Razorpay = require('razorpay');
const crypto = require('crypto');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

const PLANS = {
    silver: { name: 'Silver', price: 99900, credits: 10, billingCycle: 'MONTHLY' },
    gold: { name: 'Gold', price: 249900, credits: 30, billingCycle: 'MONTHLY' },
    premium: { name: 'Premium', price: 499900, credits: 100, billingCycle: 'MONTHLY' }
};

exports.getAllPlans = async (req, res) => {
    try {
        const plans = await SubscriptionPlan.find({ isActive: true }).sort({ displayOrder: 1 });
        res.json({ success: true, data: plans });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getCurrentPlan = async (req, res) => {
    try {
        const subscription = await UserSubscription.findOne({ userId: req.user.id, isActive: true });
        if (!subscription) return res.status(404).json({ success: false, message: 'No active subscription' });
        res.json({ success: true, data: subscription });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getCredits = async (req, res) => {
    try {
        const subscription = await UserSubscription.findOne({ userId: req.user.id, isActive: true });
        if (!subscription) {
            return res.json({ success: true, data: { creditsTotal: 0, creditsUsed: 0, creditsRemaining: 0 } });
        }
        res.json({
            success: true,
            data: {
                creditsTotal: subscription.creditsTotal,
                creditsUsed: subscription.creditsUsed,
                creditsRemaining: subscription.creditsRemaining
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const createOrder = async (req, res, planKey) => {
    try {
        const plan = PLANS[planKey];
        if (!plan) return res.status(400).json({ success: false, message: 'Invalid plan' });

        const options = {
            amount: plan.price,
            currency: 'INR',
            receipt: `receipt_${Date.now()}`,
            notes: { planKey, userId: req.user.id }
        };

        const order = await razorpay.orders.create(options);

        const payment = await Payment.create({
            userId: req.user.id,
            orderId: order.id,
            amount: plan.price,
            planName: plan.name,
            status: 'INITIATED',
            razorpayOrderId: order.id,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });

        res.status(201).json({
            success: true,
            data: {
                orderId: order.id,
                amount: order.amount,
                currency: order.currency,
                key: process.env.RAZORPAY_KEY_ID
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.createSilverOrder = (req, res) => createOrder(req, res, 'silver');
exports.createGoldOrder = (req, res) => createOrder(req, res, 'gold');
exports.createPremiumOrder = (req, res) => createOrder(req, res, 'premium');

exports.verifyPayment = async (req, res) => {
    try {
        const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

        const generated_signature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(razorpayOrderId + '|' + razorpayPaymentId)
            .digest('hex');

        if (generated_signature !== razorpaySignature) {
            return res.status(400).json({ success: false, message: 'Payment verification failed' });
        }

        const payment = await Payment.findOne({ razorpayOrderId });
        if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });

        payment.status = 'CAPTURED';
        payment.razorpayPaymentId = razorpayPaymentId;
        payment.razorpaySignature = razorpaySignature;
        payment.completedAt = new Date();
        await payment.save();

        // Create subscription
        const plan = PLANS[payment.planName.toLowerCase()];
        const startDate = new Date();
        const endDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);

        await UserSubscription.create({
            userId: req.user.id,
            planName: payment.planName,
            startDate,
            endDate,
            creditsTotal: plan.credits,
            creditsUsed: 0,
            creditsRemaining: plan.credits,
            status: 'ACTIVE',
            nextBillingDate: endDate
        });

        res.json({ success: true, message: 'Payment verified and subscription activated', data: payment });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getPaymentHistory = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const payments = await Payment.find({ userId: req.user.id })
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));
        const total = await Payment.countDocuments({ userId: req.user.id });
        res.json({ success: true, total, page, limit, data: payments });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.cancelSubscription = async (req, res) => {
    try {
        const subscription = await UserSubscription.findOneAndUpdate(
            { userId: req.user.id, isActive: true },
            { isActive: false, status: 'CANCELLED' },
            { new: true }
        );
        res.json({ success: true, message: 'Subscription cancelled', data: subscription });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.testWebhook = async (req, res) => {
    try {
        res.json({
            success: true,
            webhookTest: {
                event: 'payment.authorized',
                payload: {
                    payment: { id: 'pay_123456', entity: 'payment', status: 'authorized' },
                    order: { id: 'order_123456', entity: 'order' }
                }
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.pauseSubscription = async (req, res) => {
    try {
        const { pauseReason } = req.body;

        const subscription = await UserSubscription.findOneAndUpdate(
            { userId: req.user.id, status: 'ACTIVE' },
            {
                status: 'PAUSED',
                pausedAt: new Date(),
                pauseReason: pauseReason || 'User paused subscription'
            },
            { new: true }
        );

        if (!subscription) {
            return res.status(404).json({ success: false, message: 'No active subscription found' });
        }

        res.json({
            success: true,
            message: 'Subscription paused successfully',
            data: subscription
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.resumeSubscription = async (req, res) => {
    try {
        const subscription = await UserSubscription.findOne({
            userId: req.user.id,
            status: 'PAUSED'
        });

        if (!subscription) {
            return res.status(404).json({ success: false, message: 'No paused subscription found' });
        }

        // Recalculate billing dates
        const resumedAt = new Date();
        const pausedDays = Math.floor((resumedAt - subscription.pausedAt) / (1000 * 60 * 60 * 24));
        const originalEndDate = subscription.endDate;
        const newEndDate = new Date(originalEndDate.getTime() + pausedDays * 24 * 60 * 60 * 1000);
        const newNextBillingDate = newEndDate;

        subscription.status = 'ACTIVE';
        subscription.resumedAt = resumedAt;
        subscription.endDate = newEndDate;
        subscription.nextBillingDate = newNextBillingDate;
        subscription.pauseReason = null;

        await subscription.save();

        res.json({
            success: true,
            message: 'Subscription resumed successfully',
            data: subscription
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getBillingSummary = async (req, res) => {
    try {
        // Get current subscription
        const currentSubscription = await UserSubscription.findOne({
            userId: req.user.id,
            status: { $in: ['ACTIVE', 'PAUSED'] }
        });

        // Get payment history
        const payments = await Payment.find({ userId: req.user.id });

        // Calculate totals
        const totalSpent = payments.reduce((sum, payment) => {
            return payment.status === 'CAPTURED' ? sum + payment.amount : sum;
        }, 0);

        const capturedPayments = payments.filter(p => p.status === 'CAPTURED');
        const failedPayments = payments.filter(p => p.status === 'FAILED');

        res.json({
            success: true,
            data: {
                currentPlan: currentSubscription ? {
                    name: currentSubscription.plan?.name,
                    status: currentSubscription.status,
                    startDate: currentSubscription.startDate,
                    endDate: currentSubscription.endDate,
                    nextBillingDate: currentSubscription.nextBillingDate,
                    creditsTotal: currentSubscription.creditsTotal,
                    creditsUsed: currentSubscription.creditsUsed,
                    creditsRemaining: currentSubscription.creditsRemaining
                } : null,
                paymentSummary: {
                    totalSpent: totalSpent / 100, // Convert from paise to rupees
                    currency: 'INR',
                    successfulPayments: capturedPayments.length,
                    failedPayments: failedPayments.length,
                    totalPaymentAttempts: payments.length
                },
                recentPayments: payments.slice(0, 5).map(p => ({
                    id: p._id,
                    amount: p.amount / 100,
                    planName: p.planName,
                    status: p.status,
                    date: p.completedAt || p.createdAt
                }))
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
