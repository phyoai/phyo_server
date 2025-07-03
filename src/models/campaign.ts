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

const campaignSchema = new Schema<CampaignDocument>({
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
  timelines: {
    type: campaignTimelinesSchema,
    required: true
  },
  targetInfluencer: {
    type: targetInfluencerSchema,
    required: true
  },
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
  }]
}, {
  timestamps: true
});

// Add indexes for better query performance
campaignSchema.index({ brandId: 1 });
campaignSchema.index({ status: 1 });
campaignSchema.index({ 'timelines.applicationDeadline': 1 });
campaignSchema.index({ 'timelines.campaignStartDate': 1 });
campaignSchema.index({ 'targetInfluencer.targetNiche': 1 });

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