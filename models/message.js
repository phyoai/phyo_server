const mongoose = require('mongoose');

const messageSchema = mongoose.Schema({
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
    senderName: String,
    senderType: { type: String, enum: ['BRAND', 'INFLUENCER', 'SERVICE_PROVIDER'] },

    // Message content
    content: String,
    type: { type: String, enum: ['TEXT', 'IMAGE', 'VIDEO', 'FILE', 'OFFER'], default: 'TEXT' },
    mediaUrl: String,
    fileName: String,

    // Status
    isRead: { type: Boolean, default: false },
    readAt: Date,
    isDeleted: { type: Boolean, default: false },

    // Offer details (for OFFER type)
    offer: {
        title: String,
        description: String,
        amount: Number,
        currency: { type: String, default: 'INR' },
        deliverables: String,
        deadline: Date
    },

    // Reactions/replies
    reactions: [{
        userId: mongoose.Schema.Types.ObjectId,
        emoji: String
    }],
    replyToMessageId: mongoose.Schema.Types.ObjectId
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);
