const mongoose = require("mongoose")

const influencerSchema = mongoose.Schema({
    name: String,
    profile_name: String,
    biography: String,
    profile_pic_url: String,
    is_verified: { type: Boolean, default: false },
    is_business: { type: Boolean, default: false },
    isApproved: { type: Boolean, default: false },
    categoryInstagram: String,
    categoryYouTube: String,
    user_name: String,
    city: String,
    state: String,
    language: String,
    gender: { type: String, enum: ['Male', 'Female', 'Other'] },
    lastDemographicsFetch: { type: Date },
    instagramData: {
        followers: { type: Number, default: 0 },
        following: { type: Number, default: 0 },
        posts_count: { type: Number, default: 0 },
        avg_engagement: { type: Number, default: 0 },
        link: String,
        genderDistribution: [
            {
                gender: { type: String },
                distribution: { type: Number },
            }
        ],
        ageDistribution: [
            {
                age: { type: String },
                value: { type: Number },
            }
        ],
        audienceByCountry: [
            {
                category: { type: String },
                name: { type: String },
                value: { type: Number },
            }
        ],
        audienceByCity: [
            {
                name: { type: String },
                value: { type: Number },
            }
        ],
        languageDistribution: [
            {
                language: { type: String },
                value: { type: Number },
            }
        ],
        audienceQualityScore: { type: Number, default: 0 },
        fakeFollowersPercent: { type: Number, default: 0 },
        totalCommentsAnalyzed: { type: Number, default: 0 },
        realUsersAnalyzed: { type: Number, default: 0 },
        collaborationCharges: {
            reel: { type: Number },
            story: { type: Number },
            post: { type: Number },
            oneMonthDigitalRights: { type: Number },
        },
    },
    youtubeData: {
        followers: { type: Number, default: 0 },
        link: { type: String },
        genderDistribution: [
            {
                gender: { type: String },
                distribution: { type: Number },
            }
        ],
        ageDistribution: [
            {
                age: { type: String },
                value: { type: Number },
            }
        ],
        audienceByCountry: [
            {
                category: { type: String },
                name: { type: String },
                value: { type: Number },
            }
        ],
        collaborationCharges: {
            reel: { type: Number },
            story: { type: Number },
            post: { type: Number },
            oneMonthDigitalRights: { type: Number },
        },
    },
    averageLikes: Number,
    averageViews: Number,
    averageComments: Number,
    averageEngagement: Number,
    image: String
}, {
    timestamps: true 
})

const influencer = mongoose.model("influencer", influencerSchema)
module.exports = influencer