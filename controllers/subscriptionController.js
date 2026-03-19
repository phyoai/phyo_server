const User = require('../models/auth');
const mongoose = require('mongoose');

/**
 * GET /api/subscriptions/plans
 * Get all subscription plans
 */
exports.getSubscriptionPlans = async (req, res) => {
    try {
        const plans = [
            {
                _id: new mongoose.Types.ObjectId(),
                name: 'STARTER',
                price: 4999,
                currency: 'INR',
                billingCycle: 'monthly',
                features: {
                    maxCampaigns: 5,
                    maxInfluencers: 20,
                    analytics: true,
                    teamMembers: 1,
                    prioritySupport: false,
                    customBranding: false
                },
                description: 'Perfect for getting started',
                badge: 'Popular'
            },
            {
                _id: new mongoose.Types.ObjectId(),
                name: 'PROFESSIONAL',
                price: 12999,
                currency: 'INR',
                billingCycle: 'monthly',
                features: {
                    maxCampaigns: 50,
                    maxInfluencers: 500,
                    analytics: true,
                    teamMembers: 5,
                    prioritySupport: true,
                    customBranding: false
                },
                description: 'For growing businesses',
                badge: 'Recommended'
            },
            {
                _id: new mongoose.Types.ObjectId(),
                name: 'ENTERPRISE',
                price: 49999,
                currency: 'INR',
                billingCycle: 'monthly',
                features: {
                    maxCampaigns: 500,
                    maxInfluencers: 10000,
                    analytics: true,
                    teamMembers: 50,
                    prioritySupport: true,
                    customBranding: true
                },
                description: 'For large organizations',
                badge: 'Premium'
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
 * GET /api/subscriptions/current
 * Get current user's active subscription
 */
exports.getCurrentSubscription = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        return res.status(200).json({
            success: true,
            data: {
                planName: user.subscription?.planName || 'FREE',
                status: user.subscription?.status || 'INACTIVE',
                startDate: user.subscription?.startDate,
                endDate: user.subscription?.endDate,
                autoRenewal: user.subscription?.autoRenewal || false,
                price: user.subscription?.price || 0,
                billingCycle: user.subscription?.billingCycle || 'monthly',
                features: user.subscription?.features || {
                    maxCampaigns: 1,
                    maxInfluencers: 5,
                    analytics: false,
                    teamMembers: 1
                }
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error fetching subscription', error: error.message });
    }
};

/**
 * POST /api/subscriptions/upgrade
 * Upgrade subscription plan
 */
exports.upgradeSubscription = async (req, res) => {
    try {
        const userId = req.user.id;
        const { newPlanName, paymentMethodId } = req.body;

        if (!newPlanName) {
            return res.status(400).json({ success: false, message: 'newPlanName is required' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const validPlans = ['STARTER', 'PROFESSIONAL', 'ENTERPRISE'];
        if (!validPlans.includes(newPlanName)) {
            return res.status(400).json({ success: false, message: 'Invalid plan name' });
        }

        const oldPlan = user.subscription?.planName || 'FREE';

        const subscriptionHistory = {
            _id: new mongoose.Types.ObjectId(),
            oldPlan: oldPlan,
            newPlan: newPlanName,
            upgradedAt: new Date(),
            paymentMethodId: paymentMethodId || null
        };

        user.subscription = {
            planName: newPlanName,
            status: 'ACTIVE',
            startDate: new Date(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            autoRenewal: true,
            price: getPlanPrice(newPlanName),
            billingCycle: 'monthly',
            features: getPlanFeatures(newPlanName)
        };

        if (!user.subscriptionHistory) user.subscriptionHistory = [];
        user.subscriptionHistory.push(subscriptionHistory);

        await user.save();

        return res.status(200).json({
            success: true,
            message: `Upgraded from ${oldPlan} to ${newPlanName}`,
            data: {
                previousPlan: oldPlan,
                newPlan: newPlanName,
                upgradedAt: subscriptionHistory.upgradedAt,
                nextBillingDate: user.subscription.endDate
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error upgrading subscription', error: error.message });
    }
};

/**
 * POST /api/subscriptions/downgrade
 * Downgrade subscription plan
 */
exports.downgradeSubscription = async (req, res) => {
    try {
        const userId = req.user.id;
        const { newPlanName, reason } = req.body;

        if (!newPlanName) {
            return res.status(400).json({ success: false, message: 'newPlanName is required' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const oldPlan = user.subscription?.planName || 'FREE';

        if (oldPlan === 'FREE' || oldPlan === newPlanName) {
            return res.status(400).json({ success: false, message: 'Invalid downgrade' });
        }

        const subscriptionHistory = {
            _id: new mongoose.Types.ObjectId(),
            oldPlan: oldPlan,
            newPlan: newPlanName,
            downgradedAt: new Date(),
            reason: reason || ''
        };

        user.subscription = {
            planName: newPlanName,
            status: 'ACTIVE',
            startDate: new Date(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            autoRenewal: true,
            price: getPlanPrice(newPlanName),
            billingCycle: 'monthly',
            features: getPlanFeatures(newPlanName)
        };

        if (!user.subscriptionHistory) user.subscriptionHistory = [];
        user.subscriptionHistory.push(subscriptionHistory);

        await user.save();

        return res.status(200).json({
            success: true,
            message: `Downgraded from ${oldPlan} to ${newPlanName}`,
            data: {
                previousPlan: oldPlan,
                newPlan: newPlanName,
                downgradedAt: subscriptionHistory.downgradedAt,
                refundAmount: calculateRefund(oldPlan, newPlanName)
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error downgrading subscription', error: error.message });
    }
};

/**
 * POST /api/subscriptions/pause
 * Pause active subscription
 */
exports.pauseSubscription = async (req, res) => {
    try {
        const userId = req.user.id;
        const { pauseDurationDays = 30, reason } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (!user.subscription || user.subscription.status !== 'ACTIVE') {
            return res.status(400).json({
                success: false,
                message: 'No active subscription to pause'
            });
        }

        const pauseEndDate = new Date(Date.now() + pauseDurationDays * 24 * 60 * 60 * 1000);

        user.subscription.status = 'PAUSED';
        user.subscription.pausedAt = new Date();
        user.subscription.pauseReason = reason || '';
        user.subscription.pauseEndDate = pauseEndDate;

        if (!user.subscriptionEvents) user.subscriptionEvents = [];
        user.subscriptionEvents.push({
            _id: new mongoose.Types.ObjectId(),
            type: 'PAUSED',
            previousStatus: 'ACTIVE',
            newStatus: 'PAUSED',
            reason: reason || '',
            pauseDurationDays: pauseDurationDays,
            pauseEndDate: pauseEndDate,
            timestamp: new Date()
        });

        await user.save();

        return res.status(200).json({
            success: true,
            message: 'Subscription paused successfully',
            data: {
                status: 'PAUSED',
                pausedAt: user.subscription.pausedAt,
                pauseEndDate: pauseEndDate,
                pauseDuration: `${pauseDurationDays} days`,
                message: `Your subscription will resume on ${pauseEndDate.toLocaleDateString()}`
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error pausing subscription', error: error.message });
    }
};

/**
 * POST /api/subscriptions/resume
 * Resume paused subscription
 */
exports.resumeSubscription = async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (!user.subscription || user.subscription.status !== 'PAUSED') {
            return res.status(400).json({
                success: false,
                message: 'No paused subscription to resume'
            });
        }

        const previousStatus = user.subscription.status;
        user.subscription.status = 'ACTIVE';
        user.subscription.resumedAt = new Date();

        if (!user.subscriptionEvents) user.subscriptionEvents = [];
        user.subscriptionEvents.push({
            _id: new mongoose.Types.ObjectId(),
            type: 'RESUMED',
            previousStatus: previousStatus,
            newStatus: 'ACTIVE',
            resumedAt: new Date(),
            timestamp: new Date()
        });

        await user.save();

        return res.status(200).json({
            success: true,
            message: 'Subscription resumed successfully',
            data: {
                status: 'ACTIVE',
                resumedAt: user.subscription.resumedAt,
                nextBillingDate: user.subscription.endDate,
                features: user.subscription.features
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error resuming subscription', error: error.message });
    }
};

/**
 * POST /api/subscriptions/cancel
 * Cancel subscription
 */
exports.cancelSubscription = async (req, res) => {
    try {
        const userId = req.user.id;
        const { reason, immediateCancel = false, feedbackRating } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (!user.subscription || (user.subscription.status !== 'ACTIVE' && user.subscription.status !== 'PAUSED')) {
            return res.status(400).json({
                success: false,
                message: 'No active subscription to cancel'
            });
        }

        const cancellationDate = immediateCancel ? new Date() : user.subscription.endDate;
        const refundAmount = immediateCancel ? (user.subscription.price * 0.8) : 0;

        user.subscription.status = 'CANCELLED';
        user.subscription.cancelledAt = new Date();
        user.subscription.cancellationReason = reason || '';
        user.subscription.cancellationDate = cancellationDate;
        user.subscription.refundAmount = refundAmount;
        user.subscription.refundStatus = refundAmount > 0 ? 'PENDING' : 'N/A';
        user.subscription.feedbackRating = feedbackRating || null;

        if (!user.subscriptionEvents) user.subscriptionEvents = [];
        user.subscriptionEvents.push({
            _id: new mongoose.Types.ObjectId(),
            type: 'CANCELLED',
            previousStatus: user.subscription.status,
            newStatus: 'CANCELLED',
            reason: reason || '',
            immediateCancel: immediateCancel,
            refundAmount: refundAmount,
            cancellationDate: cancellationDate,
            timestamp: new Date()
        });

        await user.save();

        return res.status(200).json({
            success: true,
            message: 'Subscription cancelled successfully',
            data: {
                status: 'CANCELLED',
                cancelledAt: user.subscription.cancelledAt,
                cancellationDate: cancellationDate,
                reason: reason || 'No reason provided',
                refundAmount: refundAmount,
                refundStatus: user.subscription.refundStatus,
                message: immediateCancel ?
                    `Subscription cancelled. Refund of ₹${refundAmount} will be processed within 5-7 business days` :
                    `Subscription will be cancelled on ${cancellationDate.toLocaleDateString()}`
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error cancelling subscription', error: error.message });
    }
};

/**
 * POST /api/subscriptions/toggle-autorenew
 * Toggle auto-renewal
 */
exports.toggleAutoRenewal = async (req, res) => {
    try {
        const userId = req.user.id;
        const { autoRenewal } = req.body;

        if (typeof autoRenewal !== 'boolean') {
            return res.status(400).json({ success: false, message: 'autoRenewal must be boolean' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const previousStatus = user.subscription?.autoRenewal || false;
        if (user.subscription) {
            user.subscription.autoRenewal = autoRenewal;
        }

        await user.save();

        return res.status(200).json({
            success: true,
            message: `Auto-renewal ${autoRenewal ? 'enabled' : 'disabled'}`,
            data: {
                autoRenewal: autoRenewal,
                previousStatus: previousStatus,
                nextBillingDate: user.subscription?.endDate || null
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error toggling auto-renewal', error: error.message });
    }
};

/**
 * GET /api/subscriptions/history
 * Get subscription history
 */
exports.getSubscriptionHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 20 } = req.query;
        const skip = (page - 1) * limit;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const history = user.subscriptionHistory || [];
        const events = user.subscriptionEvents || [];
        const allHistory = [...history, ...events].sort((a, b) =>
            new Date(b.timestamp || b.upgradedAt || b.downgradedAt) -
            new Date(a.timestamp || a.upgradedAt || a.downgradedAt)
        );

        const paginated = allHistory.slice(skip, skip + parseInt(limit));

        return res.status(200).json({
            success: true,
            data: paginated,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: allHistory.length,
                pages: Math.ceil(allHistory.length / limit)
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error fetching history', error: error.message });
    }
};

/**
 * GET /api/subscriptions/billing-dates
 * Get billing dates and information
 */
exports.getBillingDates = async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const subscription = user.subscription;

        return res.status(200).json({
            success: true,
            data: {
                planName: subscription?.planName || 'FREE',
                status: subscription?.status || 'INACTIVE',
                currentBillingCycle: {
                    startDate: subscription?.startDate,
                    endDate: subscription?.endDate,
                    daysRemaining: subscription?.endDate ?
                        Math.ceil((new Date(subscription.endDate) - new Date()) / (1000 * 60 * 60 * 24)) : 0
                },
                billingAmount: subscription?.price || 0,
                billingFrequency: subscription?.billingCycle || 'monthly',
                autoRenewal: subscription?.autoRenewal || false,
                nextBillingDate: subscription?.endDate,
                lastBillingDate: subscription?.startDate,
                upcomingCharges: subscription?.price ? [{
                    amount: subscription.price,
                    date: subscription.endDate,
                    description: `${subscription.planName} subscription renewal`
                }] : []
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error fetching billing dates', error: error.message });
    }
};

/**
 * Helper functions
 */
function getPlanPrice(planName) {
    const prices = {
        'STARTER': 4999,
        'PROFESSIONAL': 12999,
        'ENTERPRISE': 49999
    };
    return prices[planName] || 0;
}

function getPlanFeatures(planName) {
    const features = {
        'STARTER': {
            maxCampaigns: 5,
            maxInfluencers: 20,
            analytics: true,
            teamMembers: 1,
            prioritySupport: false,
            customBranding: false
        },
        'PROFESSIONAL': {
            maxCampaigns: 50,
            maxInfluencers: 500,
            analytics: true,
            teamMembers: 5,
            prioritySupport: true,
            customBranding: false
        },
        'ENTERPRISE': {
            maxCampaigns: 500,
            maxInfluencers: 10000,
            analytics: true,
            teamMembers: 50,
            prioritySupport: true,
            customBranding: true
        }
    };
    return features[planName] || {};
}

function calculateRefund(oldPlan, newPlan) {
    const prices = {
        'STARTER': 4999,
        'PROFESSIONAL': 12999,
        'ENTERPRISE': 49999
    };
    const oldPrice = prices[oldPlan] || 0;
    const newPrice = prices[newPlan] || 0;
    const difference = oldPrice - newPrice;
    return difference > 0 ? difference : 0;
}
