const mongoose = require('mongoose');

const conversationSchema = mongoose.Schema({
    participants: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
        userType: { type: String, enum: ['BRAND', 'INFLUENCER', 'SERVICE_PROVIDER'] },
        userName: String
    }],

    // Related campaign or project
    campaignId: mongoose.Schema.Types.ObjectId,
    projectId: mongoose.Schema.Types.ObjectId,

    // Last message
    lastMessage: String,
    lastMessageAt: { type: Date, default: Date.now },
    lastMessageSenderId: mongoose.Schema.Types.ObjectId,

    // Status
    status: {
        type: String,
        enum: ['ACTIVE', 'ARCHIVED', 'CLOSED'],
        default: 'ACTIVE'
    },

    // Unread counts
    unreadMessages: [{
        userId: mongoose.Schema.Types.ObjectId,
        count: { type: Number, default: 0 }
    }]
}, { timestamps: true });

module.exports = mongoose.model('Conversation', conversationSchema);
