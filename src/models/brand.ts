import mongoose, { Schema, Document } from 'mongoose';

export interface IBrandProfile {
  name: string;
  industry: string;
  website?: string;
  description?: string;
  logo?: string;
  location: {
    city: string;
    state: string;
    country: string;
  };
  contactInfo: {
    email: string;
    phone?: string;
  };
  socialMedia?: {
    instagram?: string;
    facebook?: string;
    twitter?: string;
    linkedin?: string;
  };
  targetAudience?: {
    ageRange: string;
    gender: string[];
    interests: string[];
    locations: string[];
  };
  campaignBudget?: {
    min: number;
    max: number;
    currency: string;
  };
  preferredCollaborationTypes: string[];
  isVerified: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface BrandProfileDocument extends IBrandProfile, Document {}

const brandProfileSchema = new Schema<BrandProfileDocument>({
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  industry: { 
    type: String, 
    required: true,
    trim: true
  },
  website: { 
    type: String,
    trim: true
  },
  description: { 
    type: String,
    trim: true,
    maxlength: 2000
  },
  logo: { 
    type: String,
    trim: true
  },
  location: {
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true }
  },
  contactInfo: {
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, trim: true }
  },
  socialMedia: {
    instagram: { type: String, trim: true },
    facebook: { type: String, trim: true },
    twitter: { type: String, trim: true },
    linkedin: { type: String, trim: true }
  },
  targetAudience: {
    ageRange: { type: String, trim: true },
    gender: [{ type: String, enum: ['Male', 'Female', 'Other'] }],
    interests: [{ type: String, trim: true }],
    locations: [{ type: String, trim: true }]
  },
  campaignBudget: {
    min: { type: Number, min: 0 },
    max: { type: Number, min: 0 },
    currency: { type: String, default: 'USD', trim: true }
  },
  preferredCollaborationTypes: [{
    type: String,
    enum: ['sponsored_post', 'product_review', 'brand_ambassador', 'event_coverage', 'content_creation'],
    trim: true
  }],
  isVerified: { 
    type: Boolean, 
    default: false 
  }
}, {
  timestamps: true
});

// Add indexes for better query performance
brandProfileSchema.index({ industry: 1 });
brandProfileSchema.index({ 'location.city': 1, 'location.state': 1 });
brandProfileSchema.index({ isVerified: 1 });

const BrandProfile = mongoose.model<BrandProfileDocument>('BrandProfile', brandProfileSchema);

export default BrandProfile; 