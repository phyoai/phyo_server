const mongoose = require('mongoose');

const portfolioSchema = mongoose.Schema({
    // Portfolio basics
    title: { type: String, required: true },
    description: { type: String },
    serviceProviderId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
    serviceProviderName: String,

    // Category and skills
    category: String,
    skills: [String],
    experience: String,

    // Portfolio items
    projects: [{
        projectId: mongoose.Schema.Types.ObjectId,
        name: String,
        description: String,
        imageUrl: String,
        link: String
    }],

    // Clients worked with
    clients: [{
        clientId: mongoose.Schema.Types.ObjectId,
        clientName: { type: String, required: true },
        clientEmail: String,
        clientPhone: String,
        projectDescription: String,
        startDate: Date,
        endDate: Date,
        testimonial: String,
        rating: { type: Number, min: 1, max: 5 },
        imageUrl: String
    }],

    // Media
    profileImage: String,
    coverImage: String,
    mediaGallery: [String],

    // Rating and statistics
    averageRating: { type: Number, default: 0 },
    totalProjects: { type: Number, default: 0 },
    totalClients: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },

    // Visibility
    isPublic: { type: Boolean, default: true },
    slug: String,

    // Social links
    socialLinks: {
        website: String,
        linkedin: String,
        github: String,
        twitter: String,
        instagram: String,
        portfolio: String
    }
}, { timestamps: true });

module.exports = mongoose.model('Portfolio', portfolioSchema);
