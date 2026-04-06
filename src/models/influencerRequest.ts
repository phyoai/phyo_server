import mongoose, { Schema, Document } from 'mongoose';

export interface IInfluencerRequest {
  // Step 1: Personal Information
  full_name: string;
  stage_name?: string;
  date_of_birth?: Date;
  gender?: 'Male' | 'Female' | 'Other' | 'Prefer not to say';
  location?: {
    city?: string;
    state?: string;
    country?: string;
  };
  languages_spoken?: string[];

  // Step 2: Profile Setup
  profile_picture?: string; // AWS S3 URL
  cover_photo?: string; // AWS S3 URL
  bio?: string; // 500 chars max
  personal_website?: string;

  // Step 3: Content Categories (Multi-select niches)
  niches?: string[]; // ['Fashion', 'Beauty', 'Food', 'Fitness', etc.]

  // Step 4: Social Media Linking
  social_media: {
    instagram?: {
      username?: string;
      link?: string;
      connected?: boolean;
    };
    youtube?: {
      channel_url?: string;
      connected?: boolean;
    };
    tiktok?: {
      username?: string;
      connected?: boolean;
    };
    facebook?: {
      profile_url?: string;
      connected?: boolean;
    };
    twitter?: {
      username?: string;
      connected?: boolean;
    };
  };

  // Auto-fetched data from Step 4 (populated after Instagram link)
  auto_fetched_data?: {
    follower_counts?: {
      instagram?: number;
      youtube?: number;
      tiktok?: number;
      facebook?: number;
      twitter?: number;
    };
    engagement_rates?: {
      instagram?: number;
      youtube?: number;
      tiktok?: number;
    };
    profile_pic_url?: string; // Auto-fetched profile picture from Instagram
    audience_demographics?: any; // Will be populated from BrightScraper
    last_fetched?: Date;
  };

  // Step 5: Portfolio
  portfolio?: {
    sample_posts?: Array<{
      platform: string;
      url: string;
      description?: string;
    }>;
    brand_collaborations?: Array<{
      brand_name: string;
      description: string;
      year?: number;
    }>;
    content_highlights?: string;
    media_kit?: string; // AWS S3 URL for PDF
  };

  // Step 6: Rate Card (Optional - can be filled after approval)
  rate_card?: {
    instagram_post?: number;
    instagram_story?: number;
    instagram_reel?: number;
    youtube_video?: number;
    tiktok_video?: number;
    blog_post?: number;
    package_deals?: Array<{
      name: string;
      description: string;
      price: number;
    }>;
  };

  // Step 7: Payment Details (Optional - can be filled after approval)
  payment_details?: {
    account_holder_name?: string;
    bank_name?: string;
    account_number?: string;
    ifsc_code?: string;
    paypal_email?: string;
    tax_info?: {
      pan_number?: string;
      gstin?: string;
    };
  };

  // Step 8: Availability & Preferences (Optional - can be filled after approval)
  availability?: {
    current_availability?: 'Available' | 'Busy' | 'Not Available';
    preferred_campaign_types?: string[];
    industries_work_with?: string[];
    industries_avoid?: string[];
    monthly_campaign_capacity?: number;
  };

  // Step 9: Notifications (Optional - can be filled after approval)
  notifications?: {
    email_preferences?: boolean;
    push_notifications?: boolean;
    sms_alerts?: boolean;
    campaign_recommendations?: boolean;
  };

  // Contact & Account
  contact: {
    email: string;
    phone?: string;
  };
  
  account: {
    signup_method: 'email' | 'google' | 'facebook';
  };

  // Admin Review Fields
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  admin_notes?: string;
  reviewed_by?: string;
  reviewed_at?: Date;
  
  // User Conversion Fields
  userId?: string; // ID of existing USER account (if conversion)
  isUserConversion?: boolean; // Flag to indicate USER to INFLUENCER conversion
  
  // Influencer ID (after approval and creation)
  influencerId?: string; // Reference to the Influencer model after approval
  
  created_at: Date;
  updated_at: Date;
}

export interface InfluencerRequestDocument extends IInfluencerRequest, Document {}

const influencerRequestSchema = new Schema<InfluencerRequestDocument>({
  // Step 1: Personal Information
  full_name: {
    type: String,
    required: true,
    trim: true
  },
  stage_name: {
    type: String,
    trim: true
  },
  date_of_birth: {
    type: Date
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other', 'Prefer not to say']
  },
  location: {
    city: String,
    state: String,
    country: String
  },
  languages_spoken: [String],

  // Step 2: Profile Setup
  profile_picture: String,
  cover_photo: String,
  bio: {
    type: String,
    maxlength: 500
  },
  personal_website: String,

  // Step 3: Content Categories
  niches: [String],

  // Step 4: Social Media Linking
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

  // Auto-fetched data
  auto_fetched_data: {
    follower_counts: {
      instagram: Number,
      youtube: Number,
      tiktok: Number,
      facebook: Number,
      twitter: Number
    },
    engagement_rates: {
      instagram: Number,
      youtube: Number,
      tiktok: Number
    },
    profile_pic_url: String,
    audience_demographics: Schema.Types.Mixed,
    last_fetched: Date
  },

  // Step 5: Portfolio
  portfolio: {
    sample_posts: [{
      platform: String,
      url: String,
      description: String
    }],
    brand_collaborations: [{
      brand_name: String,
      description: String,
      year: Number
    }],
    content_highlights: String,
    media_kit: String
  },

  // Step 6: Rate Card
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
      price: Number
    }]
  },

  // Step 7: Payment Details
  payment_details: {
    account_holder_name: String,
    bank_name: String,
    account_number: String,
    ifsc_code: String,
    paypal_email: String,
    tax_info: {
      pan_number: String,
      gstin: String
    }
  },

  // Step 8: Availability & Preferences
  availability: {
    current_availability: {
      type: String,
      enum: ['Available', 'Busy', 'Not Available']
    },
    preferred_campaign_types: [String],
    industries_work_with: [String],
    industries_avoid: [String],
    monthly_campaign_capacity: Number
  },

  // Step 9: Notifications
  notifications: {
    email_preferences: { type: Boolean, default: true },
    push_notifications: { type: Boolean, default: true },
    sms_alerts: { type: Boolean, default: false },
    campaign_recommendations: { type: Boolean, default: true }
  },

  // Contact & Account
  contact: {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    phone: String
  },
  
  account: {
    signup_method: {
      type: String,
      required: true,
      enum: ['email', 'google', 'facebook']
    }
  },

  // Admin Review Fields
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    default: 'PENDING'
  },
  admin_notes: String,
  reviewed_by: String,
  reviewed_at: Date,
  
  // User Conversion Fields
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'user'
  },
  isUserConversion: {
    type: Boolean,
    default: false
  },
  
  // Influencer ID
  influencerId: {
    type: Schema.Types.ObjectId,
    ref: 'influencer'
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

const InfluencerRequest = mongoose.model<InfluencerRequestDocument>('InfluencerRequest', influencerRequestSchema);

export default InfluencerRequest;
