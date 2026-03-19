const mongoose = require('mongoose');

const subscriptionPlanSchema = mongoose.Schema({
    // Plan identification
    id: String,
    name: { type: String, required: true }, // BRONZE, SILVER, GOLD, PREMIUM
    displayName: String,
    price: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    interval: { type: String, enum: ['MONTHLY', 'QUARTERLY', 'YEARLY'], default: 'MONTHLY' },

    // Features
    features: {
        creatorSearch: Boolean,
        creatorInsights: mongoose.Schema.Types.Mixed,
        advancedFilters: Boolean,
        audienceBasedSearch: Boolean,
        historicalCost: Boolean,
        preCuratedList: Boolean,
        brandAnalysis: Boolean,
        costingInsights: Boolean,
        openAccessInfluencerDatabase: Boolean,
        campaignReports: Boolean,
        roleBasedAccess: Boolean,
        volumeBasedDiscount: Boolean,
        platformTraining: Boolean,
        dedicatedCustomerSuccess: Boolean,
        credits: Number
    },

    // Status
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

const userSubscriptionSchema = mongoose.Schema({
    // User and plan
    userId: mongoose.Schema.Types.ObjectId,
    planId: String,

    // Complete plan object
    plan: {
        id: String,
        name: String,
        displayName: String,
        price: Number,
        currency: String,
        interval: String,
        features: mongoose.Schema.Types.Mixed,
        isActive: Boolean
    },

    // Subscription period
    startDate: { type: Date, default: Date.now },
    endDate: Date,
    nextBillingDate: Date,

    // Credits
    creditsRemaining: Number,
    creditsUsedThisMonth: { type: Number, default: 0 },
    lastCreditReset: Date,
    creditsTotal: { type: Number, default: 0 },
    creditsUsed: { type: Number, default: 0 },

    // Status
    status: {
        type: String,
        enum: ['ACTIVE', 'EXPIRED', 'CANCELLED', 'PAUSED'],
        default: 'ACTIVE'
    },
    isActive: { type: Boolean, default: true },

    // Pause/Resume tracking
    pausedAt: Date,
    resumedAt: Date,
    pauseReason: String,

    // Auto-renewal
    autoRenew: { type: Boolean, default: true }
}, { timestamps: true });

const SubscriptionPlan = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);
const UserSubscription = mongoose.model('Subscription', userSubscriptionSchema);

module.exports = { SubscriptionPlan, UserSubscription };
