const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: [
            'CAMPAIGN_APPLIED',
            'CAMPAIGN_SELECTED',
            'BRAND_APPROVED',
            'INFLUENCER_APPROVED',
            'PAYMENT_SUCCESS',
            'PAYMENT_FAILED',
            'SUBSCRIPTION_CANCELLED',
            'SUBSCRIPTION_PAUSED',
            'SUBSCRIPTION_RESUMED',
            'MESSAGE_RECEIVED',
            'SYSTEM',
            'ACCOUNT_DEACTIVATED'
        ],
        required: true
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    data: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    },
    isRead: {
        type: Boolean,
        default: false,
        index: true
    },
    readAt: Date,
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    }
});

// Compound index for efficient queries
notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ userId: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
