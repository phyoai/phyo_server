const mongoose = require("mongoose")

const userSchema = mongoose.Schema({
    email: { type: String, unique: true },
    password: String,
    type: {
        type: String,
        enum: ["BRAND", "INFLUENCER", "SERVICE_PROVIDER", "ADMIN"],
        default: "BRAND",
    },
    name: String,
    profileImage: String,
    mobileNumber: String,
    agencyName: String,
    website: String,

    // Username and bio
    username: String,
    bio: String,

    // Email OTP verification
    emailOTP: String,
    emailOTPExpires: Date,
    emailVerified: { type: Boolean, default: false },
    isEmailVerified: { type: Boolean, default: false },

    // Password reset
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    isCodeVerified: { type: Boolean, default: false },

    // Account status
    isApproved: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    isOnline: { type: Boolean, default: false },
    isOAuthUser: { type: Boolean, default: false },

    // Subscription and credits
    currentPlan: { type: String, default: 'BRONZE' },
    subscriptionStatus: { type: String, enum: ['ACTIVE', 'EXPIRED', 'CANCELLED', 'PAUSED'], default: 'ACTIVE' },
    creditsRemaining: { type: Number, default: 0 },
    trialCreditsGiven: { type: Boolean, default: false },
    lastPlanUpdate: Date,

    // Last seen
    lastSeen: Date,

    // Profile picture
    profilePicture: String,

    // Admin flag
    isAdmin: { type: Boolean, default: false },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },

    // Logout invalidation
    tokenVersion: { type: Number, default: 0 },

    // Notification preferences
    notificationPreferences: {
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
        sms: { type: Boolean, default: false },
        campaignUpdates: { type: Boolean, default: true },
        paymentAlerts: { type: Boolean, default: true },
        marketingEmails: { type: Boolean, default: false }
    }
}, { timestamps: true })

const brandSchema = mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    website: {
        type: String,
        required: false,
    },
}, { timestamps: true })

const influencerSchema = mongoose.Schema({
    gender: {
        type: String,
    },
    age: {
        type: Number,
    },
    followers: {
        type: Number,
    },
}, { timestamps: true })

const serviceProviderSchema = mongoose.Schema({
    mobileNumber: {
        type: String,
    },
    profession: {
        type: String,
    },
    experience: {
        type: String,
    },
    description: {
        type: String,
    },
    portfolio: {
        type: String,
    },
    availability: {
        type: String,
        enum: ["PART_TIME", "FULL_TIME", "FREELANCE"],
        default: "FULL_TIME",
    },

}, { timestamps: true })

userSchema.set("discriminatorKey", "type")

const user = mongoose.model("user", userSchema)
const brand = user.discriminator("brand", brandSchema)
const influencer = user.discriminator("Influencer", influencerSchema)
const serviceProvider = user.discriminator("serviceProvider", serviceProviderSchema)


module.exports = {
    user,
    brand,
    influencer,
    serviceProvider
}