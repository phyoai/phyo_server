const mongoose = require('mongoose');

const supportTicketSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'user' 
    },
    name: String,
    email: String,
    subject: { 
        type: String, 
        required: true 
    },
    message: String,
    description: String,
    category: {
        type: String,
        enum: ['general', 'billing', 'technical', 'account', 'campaign', 'complaint'],
        default: 'general'
    },
    priority: { 
        type: String, 
        enum: ['low', 'normal', 'high', 'urgent'],
        default: 'normal' 
    },
    status: { 
        type: String, 
        enum: ['open', 'in-progress', 'resolved', 'closed'],
        default: 'open' 
    },
    attachments: [String],
    assignedTo: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'user' 
    },
    responses: [{
        respondentId: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
        message: String,
        attachments: [String],
        createdAt: { type: Date, default: Date.now }
    }],
    createdAt: { 
        type: Date, 
        default: Date.now 
    },
    updatedAt: { 
        type: Date, 
        default: Date.now 
    }
}, { timestamps: true });

supportTicketSchema.index({ userId: 1, createdAt: -1 });
supportTicketSchema.index({ status: 1 });
supportTicketSchema.index({ category: 1 });
supportTicketSchema.index({ email: 1 });

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
