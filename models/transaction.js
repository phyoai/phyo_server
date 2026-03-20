const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'user',
        required: true 
    },
    amount: { 
        type: Number, 
        required: true 
    },
    type: { 
        type: String, 
        enum: ['credit', 'debit', 'campaign', 'subscription', 'refund', 'payment'],
        required: true 
    },
    status: { 
        type: String, 
        enum: ['pending', 'completed', 'failed'],
        default: 'completed' 
    },
    description: String,
    referenceId: String,
    paymentMethod: String,
    invoiceNumber: String,
    createdAt: { 
        type: Date, 
        default: Date.now 
    },
    updatedAt: { 
        type: Date, 
        default: Date.now 
    }
}, { timestamps: true });

transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ type: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
