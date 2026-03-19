const mongoose = require('mongoose');

const brandRequestSchema = mongoose.Schema({
    // Company info
    company_name: String,
    website_url: String,
    industry: String,
    company_type: String,
    location: String,
    country: String,
    company_logo: String,

    // Brand images
    brand_images: [String],

    // Social media
    social_media: {
        facebook: String,
        instagram: String,
        twitter: String,
        linkedin: String,
        youtube: String,
        tiktok: String
    },

    // Verification documents
    verification_documents: {
        tax_id: String,
        company_registration_number: String
    },

    // Billing info
    billing_info: {
        billing_address: String,
        finance_email: String,
        subscription_plan: { type: String, enum: ['BRONZE', 'SILVER', 'GOLD', 'PREMIUM'] }
    },

    // Team members
    team_members: [{
        name: String,
        email: String,
        role: String,
        phone: String
    }],

    // Preferences
    preferences: {
        notifications: { type: Boolean, default: true },
        email_preferences: [String],
        timezone: { type: String, default: 'UTC' },
        language: { type: String, default: 'en' }
    },

    // Contact info
    contact: {
        first_name: String,
        last_name: String,
        email: String
    },

    // Account info
    account: {
        signup_method: { type: String, enum: ['email', 'google', 'linkedin'] },
        status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
        userId: mongoose.Schema.Types.ObjectId,
        isUserConversion: { type: Boolean, default: false }
    },

    // Admin review
    admin_notes: String,
    reviewed_at: Date,
    reviewed_by: String // Admin email or ID
}, { timestamps: true });

module.exports = mongoose.model('BrandRequest', brandRequestSchema);
