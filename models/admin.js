const mongoose = require('mongoose');

const adminSchema = mongoose.Schema({
    // Admin info
    email: { type: String, unique: true, required: true },
    password: String,
    name: { type: String, required: true },
    profileImage: String,

    // Admin role and permissions
    role: {
        type: String,
        enum: ['SUPER_ADMIN', 'ADMIN', 'MODERATOR'],
        default: 'ADMIN'
    },

    // Permissions
    permissions: {
        manageBrands: { type: Boolean, default: true },
        manageInfluencers: { type: Boolean, default: true },
        manageServiceProviders: { type: Boolean, default: true },
        manageCampaigns: { type: Boolean, default: false },
        managePlans: { type: Boolean, default: false },
        managePayments: { type: Boolean, default: false },
        manageAdmins: { type: Boolean, default: false },
        viewAnalytics: { type: Boolean, default: true }
    },

    // Status
    isActive: { type: Boolean, default: true },
    lastLogin: Date,

    // Token invalidation
    tokenVersion: { type: Number, default: 0 },

    // Pending approvals
    pendingBrandRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'user' }],
    pendingInfluencerRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'user' }],

    // Activity log
    activityLog: [{
        action: String,
        description: String,
        timestamp: { type: Date, default: Date.now },
        targetId: mongoose.Schema.Types.ObjectId,
        targetType: String
    }]
}, { timestamps: true });

module.exports = mongoose.model('Admin', adminSchema);
