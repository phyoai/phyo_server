const mongoose = require('mongoose');

const faqSchema = new mongoose.Schema({
    question: { 
        type: String, 
        required: true 
    },
    answer: { 
        type: String, 
        required: true 
    },
    category: {
        type: String,
        enum: ['general', 'campaigns', 'billing', 'account', 'influencers', 'brands', 'payments'],
        default: 'general'
    },
    order: { 
        type: Number, 
        default: 0 
    },
    isPublished: { 
        type: Boolean, 
        default: true 
    },
    views: { 
        type: Number, 
        default: 0 
    },
    helpful: { 
        type: Number, 
        default: 0 
    },
    unhelpful: { 
        type: Number, 
        default: 0 
    },
    tags: [String],
    createdAt: { 
        type: Date, 
        default: Date.now 
    },
    updatedAt: { 
        type: Date, 
        default: Date.now 
    }
}, { timestamps: true });

faqSchema.index({ category: 1, isPublished: 1 });
faqSchema.index({ question: 'text', answer: 'text' });

module.exports = mongoose.model('FAQ', faqSchema);
