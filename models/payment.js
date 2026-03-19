const mongoose = require('mongoose');

const paymentSchema = mongoose.Schema({
    // User info
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
    userEmail: String,

    // Order info
    orderId: { type: String, unique: true },
    receiptId: String,
    planId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionPlan' },
    planName: String,

    // Payment details
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    paymentMethod: { type: String, enum: ['RAZORPAY', 'STRIPE', 'PAYPAL', 'WALLET'], default: 'RAZORPAY' },
    description: String,

    // Razorpay fields
    razorpayOrderId: String,
    razorpayPaymentId: String,
    razorpaySignature: String,

    // Status
    status: {
        type: String,
        enum: ['PENDING', 'INITIATED', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'CANCELLED', 'REFUNDED'],
        default: 'PENDING'
    },

    // Timestamps
    initiatedAt: { type: Date, default: Date.now },
    completedAt: Date,
    failureReason: String,

    // Invoice
    invoiceUrl: String,
    receiptUrl: String,

    // Subscription period
    subscriptionStartDate: Date,
    subscriptionEndDate: Date,
    billingCycle: String,

    // Metadata
    ipAddress: String,
    userAgent: String,
    metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
