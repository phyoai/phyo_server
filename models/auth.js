const mongoose = require("mongoose")

const userSchema = mongoose.Schema({
    email: String,
    password: String,
    type: {
        type: String,
        enum: ["BRAND", "INFLUENCER", "SERVICE_PROVIDER"],
        default: "BRAND",
    },
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    isCodeVerified: {
        type: Boolean,
        default: false,
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