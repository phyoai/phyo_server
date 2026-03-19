const mongoose = require('mongoose');

const campaignSchema = mongoose.Schema({
    // Brand info
    brandId: mongoose.Schema.Types.ObjectId,

    // Campaign images
    productImages: [String],

    // Campaign basics
    campaignName: String,
    campaignType: String, // instagram, youtube, tiktok, etc.
    campaignBrief: String,

    // Deliverables
    deliverables: [String],

    // Compensation
    compensation: {
        type: { type: String, enum: ['Monetary', 'Products', 'Services', 'Mixed'] },
        amount: Number,
        currency: { type: String, default: 'USD' },
        description: String
    },

    // Products
    products: [{
        name: String,
        description: String,
        price: Number,
        quantity: Number,
        image: String
    }],

    // Budget
    budget: Number,

    // Timelines
    timelines: {
        applicationDeadline: Date,
        campaignStartDate: Date,
        campaignEndDate: Date
    },

    // Target influencer criteria
    targetInfluencer: {
        numberOfInfluencers: Number,
        targetNiche: [String],
        followerCount: {
            min: Number,
            max: Number
        },
        countries: [String],
        gender: [String],
        ageRange: {
            min: Number,
            max: Number
        },
        numberOfLivePosts: Number
    },

    // Content requirements
    reels: [String],

    // Status
    status: {
        type: String,
        enum: ['Draft', 'Active', 'Paused', 'Completed', 'Cancelled'],
        default: 'Active'
    },

    // Applicants
    applicants: [mongoose.Schema.Types.ObjectId],

    // Selected influencers
    selectedInfluencers: [mongoose.Schema.Types.ObjectId],

    // AI Suggested influencers
    suggestedInfluencers: [{
        username: String,
        reason: String,
        matchScore: Number
    }],

    // AI Suggestion metadata
    aiSuggestionMetadata: {
        generatedAt: Date,
        prompt: String,
        criteria: mongoose.Schema.Types.Mixed
    }
}, { timestamps: true });

module.exports = mongoose.model('Campaign', campaignSchema);
