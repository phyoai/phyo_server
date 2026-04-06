import mongoose, { Schema, Document } from 'mongoose';

export interface IBrandRequest {
  // Step 1: Company Information
  company_name: string;
  website_url: string;
  industry: string;
  company_type?: string;
  company_size?: string;
  company_description?: string;
  location?: string;
  country?: string;
  
  // Step 2: Brand Identity
  company_logo?: string;
  brand_images?: string[];
  social_media?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
    youtube?: string;
    tiktok?: string;
  };
  brand_story?: string;
  
  // Step 3: Verification Documents (Optional)
  verification_documents?: {
    business_registration?: string;
    tax_id?: string;
    company_registration_number?: string;
    authorization_letter?: string;
  };
  
  // Step 4: Billing Information (Optional)
  billing_info?: {
    billing_address?: string;
    contact_person?: string;
    finance_email?: string;
  };
  
  // Step 5: Payment Method (Optional)
  payment_method?: {
    card_details?: any; // Store encrypted/tokenized
    bank_account?: any; // Store encrypted/tokenized
    default_payment?: 'card' | 'bank';
    budget_limit?: number;
  };
  
  // Step 6: Subscription Plan (Optional)
  subscription_plan?: 'BRONZE' | 'SILVER' | 'GOLD' | 'PREMIUM';
  
  // Step 7: Team Setup (Optional)
  team_members?: Array<{
    email: string;
    role: string;
    permissions: string[];
  }>;
  
  // Step 8: Preferences (Optional)
  preferences?: {
    notifications?: boolean;
    email_preferences?: string[];
    timezone?: string;
    language?: string;
  };
  
  contact: {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    job_title?: string;
  };
  account: {
    signup_method: 'email' | 'google' | 'linkedin' | 'sso';
  };
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  admin_notes?: string;
  reviewed_by?: string;
  reviewed_at?: Date;
  userId?: string; // ID of existing USER account (if conversion)
  isUserConversion?: boolean; // Flag to indicate USER to BRAND conversion
  created_at: Date;
  updated_at: Date;
}

export interface BrandRequestDocument extends IBrandRequest, Document {}

const brandRequestSchema = new Schema<BrandRequestDocument>({
  // Step 1: Company Information
  company_name: {
    type: String,
    required: true,
    trim: true
  },
  website_url: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: function(v: string) {
        return /^https?:\/\/.+\..+/.test(v);
      },
      message: 'Please enter a valid URL'
    }
  },
  industry: {
    type: String,
    required: true,
    trim: true
  },
  company_type: {
    type: String,
    enum: ['Brand', 'Agency', 'Marketplace', 'Startup', 'Enterprise', 'SMB'],
    trim: true
  },
  company_size: {
    type: String,
    enum: ['1-10', '11-50', '51-200', '201-1000', '1000+'],
    trim: true
  },
  company_description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  location: {
    type: String,
    trim: true
  },
  country: {
    type: String,
    trim: true
  },
  
  // Step 2: Brand Identity
  company_logo: {
    type: String,
    trim: true
  },
  brand_images: [{
    type: String,
    trim: true
  }],
  social_media: {
    facebook: { type: String, trim: true },
    instagram: { type: String, trim: true },
    twitter: { type: String, trim: true },
    linkedin: { type: String, trim: true },
    youtube: { type: String, trim: true },
    tiktok: { type: String, trim: true }
  },
  brand_story: {
    type: String,
    trim: true,
    maxlength: 2000
  },
  
  // Step 3: Verification Documents (Optional)
  verification_documents: {
    business_registration: { type: String, trim: true },
    tax_id: { type: String, trim: true },
    company_registration_number: { type: String, trim: true },
    authorization_letter: { type: String, trim: true }
  },
  
  // Step 4: Billing Information (Optional)
  billing_info: {
    billing_address: { type: String, trim: true },
    contact_person: { type: String, trim: true },
    finance_email: { type: String, trim: true, lowercase: true }
  },
  
  // Step 5: Payment Method (Optional)
  payment_method: {
    card_details: { type: Schema.Types.Mixed },
    bank_account: { type: Schema.Types.Mixed },
    default_payment: { 
      type: String, 
      enum: ['card', 'bank']
    },
    budget_limit: { type: Number, min: 0 }
  },
  
  // Step 6: Subscription Plan (Optional)
  subscription_plan: {
    type: String,
    enum: ['BRONZE', 'SILVER', 'GOLD', 'PREMIUM'],
    default: 'BRONZE'
  },
  
  // Step 7: Team Setup (Optional)
  team_members: [{
    email: { type: String, lowercase: true, trim: true },
    role: { type: String, trim: true },
    permissions: [{ type: String }]
  }],
  
  // Step 8: Preferences (Optional)
  preferences: {
    notifications: { type: Boolean, default: true },
    email_preferences: [{ type: String }],
    timezone: { type: String, default: 'UTC' },
    language: { type: String, default: 'en' }
  },
  
  contact: {
    first_name: {
      type: String,
      trim: true
    },
    last_name: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: function(v: string) {
          return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(v);
        },
        message: 'Please enter a valid email address'
      }
    },
    phone: {
      type: String,
      trim: true
    },
    job_title: {
      type: String,
      trim: true
    }
  },
  account: {
    signup_method: {
      type: String,
      enum: ['email', 'google', 'linkedin', 'sso'],
      required: true
    }
  },
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    default: 'PENDING'
  },
  admin_notes: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  reviewed_by: {
    type: String,
    trim: true
  },
  reviewed_at: {
    type: Date
  },
  userId: {
    type: String,
    ref: 'User'
  },
  isUserConversion: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for faster queries
brandRequestSchema.index({ status: 1 });
brandRequestSchema.index({ userId: 1 });
brandRequestSchema.index({ created_at: -1 });

const BrandRequest = mongoose.model<BrandRequestDocument>('BrandRequest', brandRequestSchema);

export default BrandRequest;
