const mongoose = require('mongoose');

const notificationSettingsSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'user',
        required: true,
        unique: true
    },
    email: {
        campaigns: { type: Boolean, default: true },
        applications: { type: Boolean, default: true },
        offers: { type: Boolean, default: true },
        messages: { type: Boolean, default: true },
        promotions: { type: Boolean, default: false },
        weekly_digest: { type: Boolean, default: true },
        updates: { type: Boolean, default: true }
    },
    push: {
        campaigns: { type: Boolean, default: true },
        applications: { type: Boolean, default: true },
        offers: { type: Boolean, default: true },
        messages: { type: Boolean, default: true },
        promotions: { type: Boolean, default: false },
        updates: { type: Boolean, default: true }
    },
    sms: {
        campaigns: { type: Boolean, default: false },
        applications: { type: Boolean, default: false },
        offers: { type: Boolean, default: false },
        messages: { type: Boolean, default: false },
        promotions: { type: Boolean, default: false },
        urgent: { type: Boolean, default: true }
    },
    inApp: {
        campaigns: { type: Boolean, default: true },
        applications: { type: Boolean, default: true },
        offers: { type: Boolean, default: true },
        messages: { type: Boolean, default: true },
        updates: { type: Boolean, default: true }
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    },
    updatedAt: { 
        type: Date, 
        default: Date.now 
    }
}, { timestamps: true });

notificationSettingsSchema.index({ userId: 1 });

module.exports = mongoose.model('NotificationSettings', notificationSettingsSchema);
