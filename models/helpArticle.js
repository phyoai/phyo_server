const mongoose = require('mongoose');

const helpArticleSchema = new mongoose.Schema({
    title: { 
        type: String, 
        required: true 
    },
    slug: { 
        type: String, 
        required: true, 
        unique: true 
    },
    content: { 
        type: String, 
        required: true 
    },
    category: {
        type: String,
        enum: ['getting-started', 'campaigns', 'influencers', 'billing', 'account', 'technical-support'],
        default: 'getting-started'
    },
    author: String,
    isPublished: { 
        type: Boolean, 
        default: true 
    },
    views: { 
        type: Number, 
        default: 0 
    },
    relatedArticles: [String],
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

helpArticleSchema.index({ slug: 1 });
helpArticleSchema.index({ category: 1, isPublished: 1 });
helpArticleSchema.index({ title: 'text', content: 'text' });

module.exports = mongoose.model('HelpArticle', helpArticleSchema);
