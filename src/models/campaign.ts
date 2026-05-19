import mongoose, { Schema, Document } from 'mongoose';
import { ICampaign } from '../types';

export interface CampaignDocument extends ICampaign, Document {}

const compensationDetailsSchema = new Schema({
  type: {
    type: String,
    enum: ['Monetary', 'Barter/Gifting', 'Affiliate/Commission'],
    required: true
  },
  amount: {
    type: Number,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD'
  },
  description: {
    type: String,
    trim: true
  },
  commissionRate: {
    type: Number,
    min: 0,
    max: 100
  },
  giftValue: {
    type: Number,
    min: 0
  },
  products: [{
    type: String,
    trim: true
  }]
}, { _id: false });

const campaignTimelinesSchema = new Schema({
  applicationDeadline: {
    type: Date,
    required: true
  },
  campaignStartDate: {
    type: Date,
    required: true
  },
  campaignEndDate: {
    type: Date,
    required: true
  }
}, { _id: false });

const targetInfluencerSchema = new Schema({
  numberOfInfluencers: {
    type: Number,
    required: true,
    min: 1
  },
  targetNiche: [{
    type: String,
    required: true,
    trim: true
  }],
  followerCount: {
    min: {
      type: Number,
      required: true,
      min: 0
    },
    max: {
      type: Number,
      required: true,
      min: 0
    }
  },
  countries: [{
    type: String,
    required: true,
    trim: true
  }],
  gender: [{
    type: String,
    enum: ['Male', 'Female', 'Other'],
    required: true
  }],
  ageRange: {
    min: {
      type: Number,
      required: true,
      min: 13,
      max: 100
    },
    max: {
      type: Number,
      required: true,
      min: 13,
      max: 100
    }
  }
}, { _id: false });

const negotiationOfferSchema = new Schema({
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  message: {
    type: String,
    trim: true
  },
  proposedBy: {
    type: String,
    required: true,
    ref: 'User'
  },
  proposedByRole: {
    type: String,
    enum: ['brand', 'influencer'],
    required: true
  },
  proposedAt: {
    type: Date,
    required: true
  }
}, { _id: false });

const negotiationSchema = new Schema({
  influencerId: {
    type: String,
    required: true,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  },
  currentAmount: {
    type: Number,
    required: true,
    min: 0
  },
  currentMessage: {
    type: String,
    trim: true
  },
  lastOfferedBy: {
    type: String,
    required: true,
    ref: 'User'
  },
  lastOfferedByRole: {
    type: String,
    enum: ['brand', 'influencer'],
    required: true
  },
  offers: {
    type: [negotiationOfferSchema],
    default: []
  },
  acceptedAt: {
    type: Date
  },
  rejectedAt: {
    type: Date
  },
  acceptedBy: {
    type: String,
    ref: 'User'
  },
  rejectedBy: {
    type: String,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    required: true
  },
  updatedAt: {
    type: Date,
    required: true
  }
}, { _id: false });

const boostSchema = new Schema({
  duration: {
    type: String,
    enum: ['7days', '14days', '30days'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  startsAt: {
    type: Date,
    required: true
  },
  endsAt: {
    type: Date,
    required: true
  },
  estimatedReach: {
    type: Number,
    required: true,
    min: 0
  },
  estimatedLiftPercent: {
    type: Number,
    required: true,
    min: 0
  },
  boostedBy: {
    type: String,
    required: true,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    required: true
  },
  updatedAt: {
    type: Date,
    required: true
  }
}, { _id: false });

const campaignSchema = new Schema<CampaignDocument>({
  campaignId:{
    type: String,
    required: true,
    ref: 'User'
  },
  brandId: {
    type: String,
    required: true,
    ref: 'User'
  },
  productImages: [{
    type: String,
    required: true,
    trim: true
  }],

  campaignName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  campaignType: {
    type: String,
    required: true,
    trim: true
  },
  campaignBrief: {
    type: String,
    required: true,
    trim: true,
    maxlength: 5000
  },
  deliverables: [{
    type: String,
    required: true,
    trim: true
  }],
  compensation: {
    type: compensationDetailsSchema,
    required: true
  },
  budget: {
    type: Number,
    required: true,
    min: 0
  },
  timelines: {
    type: campaignTimelinesSchema,
    required: true
  },
  targetInfluencer: {
    type: targetInfluencerSchema,
    required: true
  },
  city: {
    type: String,
    trim: true
  },
  state: {
    type: String,
    trim: true
  },
  country: {
    type: String,
    trim: true
  },
  engagement: {
    type: Number,
    min: 0
  },
  numberOfLivePosts: {
    type: Number,
    required: false,
    min: 0
  },
  reels: [{
    type: String,
    required: false,
    trim: true
  }],
  status: {
    type: String,
    enum: ['Draft', 'Active', 'Paused', 'Completed', 'Cancelled'],
    default: 'Draft'
  },
  applicants: [{
    type: String,
    ref: 'User'
  }],
  selectedInfluencers: [{
    type: String,
    ref: 'User'
  }],
  negotiations: {
    type: [negotiationSchema],
    default: []
  },
  boost: {
    type: boostSchema
  },
  suggestedInfluencers: [{
    username: {
      type: String,
      trim: true
    },
    reason: {
      type: String,
      trim: true
    },
    matchScore: {
      type: Number,
      min: 0,
      max: 100
    }
  }],
  aiSuggestionMetadata: {
    generatedAt: Date,
    prompt: String,
    criteria: Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Add indexes for better query performance
campaignSchema.index({ brandId: 1 });
campaignSchema.index({ status: 1 });
campaignSchema.index({ 'timelines.applicationDeadline': 1 });
campaignSchema.index({ 'timelines.campaignStartDate': 1 });
campaignSchema.index({ city: 1, state: 1, country: 1 });
campaignSchema.index({ 'targetInfluencer.targetNiche': 1 });
campaignSchema.index({ 'negotiations.influencerId': 1 });
campaignSchema.index({ 'boost.endsAt': 1 });

// Validation middleware
campaignSchema.pre('save', function(next) {
  // Validate follower count range
  if (this.targetInfluencer.followerCount.min > this.targetInfluencer.followerCount.max) {
    const error = new Error('Minimum follower count cannot be greater than maximum follower count');
    return next(error);
  }
  
  // Validate age range
  if (this.targetInfluencer.ageRange.min > this.targetInfluencer.ageRange.max) {
    const error = new Error('Minimum age cannot be greater than maximum age');
    return next(error);
  }
  
  // Validate campaign timeline
  if (this.timelines.campaignStartDate > this.timelines.campaignEndDate) {
    const error = new Error('Campaign start date cannot be after end date');
    return next(error);
  }
  
  // Validate application deadline
  if (this.timelines.applicationDeadline > this.timelines.campaignStartDate) {
    const error = new Error('Application deadline cannot be after campaign start date');
    return next(error);
  }
  
  next();
});

const Campaign = mongoose.model<CampaignDocument>('Campaign', campaignSchema);

export default Campaign;
