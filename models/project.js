const mongoose = require('mongoose');

const projectSchema = mongoose.Schema({
    // Project basics
    title: { type: String, required: true },
    description: { type: String },
    serviceProviderId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
    serviceProviderName: String,

    // Project details
    category: String,
    budget: { type: Number },
    startDate: { type: Date },
    endDate: { type: Date },
    timeline: String,

    // Client info (if assigned)
    clientId: mongoose.Schema.Types.ObjectId,
    clientName: String,
    clientEmail: String,
    clientPhone: String,

    // Project scope
    deliverables: String,
    requirements: String,
    technologies: [String],

    // Status
    status: {
        type: String,
        enum: ['DRAFT', 'ACTIVE', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
        default: 'DRAFT'
    },

    // Media
    images: [String],
    documents: [{
        name: String,
        url: String
    }],

    // Rating and feedback
    rating: { type: Number, min: 1, max: 5 },
    feedback: String,
    completionPercentage: { type: Number, default: 0 },

    // Milestones
    milestones: [{
        title: String,
        description: String,
        dueDate: Date,
        isCompleted: { type: Boolean, default: false },
        completedAt: Date
    }]
}, { timestamps: true });

module.exports = mongoose.model('Project', projectSchema);
