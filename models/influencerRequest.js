const mongoose = require('mongoose');

const influencerRequestSchema = mongoose.Schema({
    // Personal info
    full_name: String,
    stage_name: String,
    date_of_birth: Date,
    gender: { type: String, enum: ['Male', 'Female', 'Other', 'Prefer not to say'] },
    profile_picture: String,

    // Location
    location: {
        city: String,
        state: String,
        country: String
    },

    // Languages
    languages_spoken: [String],

    // Niches/categories
    niches: [String],

    // Social media
    social_media: {
        instagram: {
            username: String,
            link: String,
            connected: { type: Boolean, default: false }
        },
        youtube: {
            channel_url: String,
            connected: { type: Boolean, default: false }
        },
        tiktok: {
            username: String,
            connected: { type: Boolean, default: false }
        },
        facebook: {
            profile_url: String,
            connected: { type: Boolean, default: false }
        },
        twitter: {
            username: String,
            connected: { type: Boolean, default: false }
        }
    },

    // Auto-fetched data from Instagram
    auto_fetched_data: {
        follower_counts: {
            instagram: Number,
            youtube: Number,
            tiktok: Number
        },
        engagement_rates: {
            instagram: Number,
            youtube: Number,
            tiktok: Number
        },
        profile_pic_url: String,
        audience_demographics: {
            gender_distribution: {
                female: Number,
                male: Number,
                unknown: Number
            },
            age_distribution: {
                '13-17': Number,
                '18-24': Number,
                '25-34': Number,
                '35-44': Number,
                '45+': Number
            },
            country_distribution: mongoose.Schema.Types.Mixed,
            city_distribution: mongoose.Schema.Types.Mixed,
            language_distribution: mongoose.Schema.Types.Mixed,
            audience_quality_score: Number,
            fake_followers_percent: Number,
            total_comments_analyzed: Number,
            real_users_analyzed: Number
        },
        last_fetched: Date
    },

    // Portfolio
    portfolio: {
        sample_posts: [{
            url: String,
            caption: String,
            likes: Number,
            comments: Number,
            engagement: Number
        }],
        brand_collaborations: [{
            brand_name: String,
            campaign_name: String,
            url: String,
            engagement_metrics: mongoose.Schema.Types.Mixed
        }]
    },

    // Rate card
    rate_card: {
        instagram_post: Number,
        instagram_story: Number,
        instagram_reel: Number,
        youtube_video: Number,
        tiktok_video: Number,
        blog_post: Number,
        package_deals: [{
            name: String,
            description: String,
            price: Number,
            deliverables: [String]
        }]
    },

    // Availability
    availability: {
        current_availability: { type: String, enum: ['Available', 'Partially Available', 'Busy'], default: 'Available' },
        preferred_campaign_types: [String],
        industries_work_with: [String],
        industries_avoid: [String],
        monthly_campaign_capacity: Number
    },

    // Notifications
    notifications: {
        email_preferences: { type: Boolean, default: true },
        push_notifications: { type: Boolean, default: true },
        campaign_recommendations: { type: Boolean, default: true },
        sms_alerts: { type: Boolean, default: false }
    },

    // Contact
    contact: {
        email: String,
        phone: String
    },

    // Account info
    account: {
        signup_method: { type: String, enum: ['email', 'google', 'instagram'] }
    },

    // Status
    status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
    userId: mongoose.Schema.Types.ObjectId,
    influencerId: mongoose.Schema.Types.ObjectId,
    isUserConversion: { type: Boolean, default: false },

    // Admin review
    admin_notes: String,
    reviewed_at: Date,
    reviewed_by: mongoose.Schema.Types.ObjectId // Admin ID
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('InfluencerRequest', influencerRequestSchema);
