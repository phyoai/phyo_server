import mongoose, { Schema, Document } from 'mongoose';
import { IUser, IBrand, IInfluencerAuth, IServiceProvider, IUserAuth, UserType, SubscriptionPlan } from '../types';

// Base User Document
export interface UserDocument extends IUser, Document {}

// Brand Document
export interface BrandDocument extends IBrand, Document {}

// Influencer Auth Document  
export interface InfluencerAuthDocument extends IInfluencerAuth, Document {}

// Service Provider Document
export interface ServiceProviderDocument extends IServiceProvider, Document {}

// User Auth Document
export interface UserAuthDocument extends IUserAuth, Document {}

// Base User Schema
const userSchema = new Schema<UserDocument>({
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true
  },
  pendingEmail: {
    type: String,
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true,
    select: false
  },
  pendingEmailVerificationOTP: {
    type: String,
    select: false
  },
  pendingEmailVerificationExpires: {
    type: Number,
    select: false
  },
  pendingEmailRequestedAt: {
    type: Date,
    select: false
  },
  password: { 
    type: String, 
    required: false, // Made optional for OAuth users
    minlength: 6
  },
  type: { 
    type: String, 
    enum: ['BRAND', 'INFLUENCER', 'SERVICE_PROVIDER', 'USER'] as UserType[],
    required: true
  },
  about: {
    type: String,
    trim: true,
    maxlength: 1000,
    default: ''
  },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Number },
  isCodeVerified: { type: Boolean, default: false },
  // OTP fields for email verification
  emailVerificationOTP: { type: String },
  emailVerificationExpires: { type: Number },
  isEmailVerified: { type: Boolean, default: false },
  isOnline: { type: Boolean, default: false },
  lastSeen: { type: Date, default: Date.now },
  socketId: { type: String },
  // Google OAuth fields
  googleId: { 
    type: String, 
    unique: true, 
    sparse: true 
  },
  googleEmail: { 
    type: String, 
    lowercase: true,
    trim: true
  },
  googleName: { 
    type: String, 
    trim: true 
  },
  googlePicture: { 
    type: String 
  },
  isOAuthUser: {
    type: Boolean,
    default: false
  },
  // Subscription fields
  currentPlan: {
    type: String,
    enum: ['BRONZE', 'SILVER', 'GOLD', 'PREMIUM'] as SubscriptionPlan[],
    default: 'BRONZE'
  },
  subscriptionId: {
    type: String,
    ref: 'Subscription'
  },
  subscriptionStatus: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE', 'CANCELLED', 'EXPIRED', 'PENDING'],
    default: 'ACTIVE'
  },
  subscription_plan:{type: String},
  creditsRemaining: {
    type: Number,
    default: 10, // Give 10 signup reward credits to new users
    min: 0
  },
  trialCreditsGiven: {
    type: Boolean,
    default: true // New users get trial credits automatically
  },
  demoCreditsUsed: {
    type: Boolean,
    default: false // Track if user has used their demo credits on first search
  },
  lastPlanUpdate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  discriminatorKey: 'type'
});

// Brand Schema
const brandSchema = new Schema<BrandDocument>({
  companyName: { 
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
    maxlength: 1000
  },
  // New fields for enhanced brand profile
  company_type: {
    type: String,
    trim: true,
    maxlength: 100
  },
  company_size: {
    type: String,
    enum: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'],
    trim: true
  },
  location: {
    type: String,
    trim: true
  },
  country: {
    type: String,
    trim: true
  },
  company_logo: {
    type: String,
    trim: true
  },
  brand_images: [{
    type: String,
    trim: true
  }],
  categories: [{
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
  verification_documents: {
    business_registration: { type: String, trim: true },
    tax_id: { type: String, trim: true },
    company_registration_number: { type: String, trim: true },
    authorization_letter: { type: String, trim: true }
  },
  billing_info: {
    billing_address: { type: String, trim: true },
    contact_person: { type: String, trim: true },
    finance_email: { type: String, trim: true, lowercase: true }
  },
  payment_method: {
    card_details: { type: Schema.Types.Mixed },
    bank_account: { type: Schema.Types.Mixed },
    default_payment: { 
      type: String, 
      enum: ['card', 'bank']
    },
    budget_limit: { type: Number, min: 0 }
  },
  // DEPRECATED: Use currentPlan instead. subscription_plan is kept for backwards compatibility
  subscription_plan: {
    type: String,
    enum: ['BRONZE', 'SILVER', 'GOLD', 'PREMIUM'],
    default: 'BRONZE',
    deprecated: true
  },
  team_members: [{
    email: { type: String, lowercase: true, trim: true },
    role: { type: String, trim: true },
    permissions: [{ type: String }]
  }],
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
    phone: {
      type: String,
      trim: true
    },
    job_title: {
      type: String,
      trim: true
    }
  },
  signup_method: {
    type: String,
    enum: ['email', 'google', 'linkedin', 'sso'],
    default: 'email'
  }
});

// Influencer Auth Schema
const influencerAuthSchema = new Schema<InfluencerAuthDocument>({
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  username: { 
    type: String, 
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  bio: { 
    type: String,
    trim: true,
    maxlength: 500
  },
  profilePicture: { 
    type: String,
    trim: true
  }
});

// Service Provider Schema
const serviceProviderSchema = new Schema<ServiceProviderDocument>({
  companyName: { 
    type: String, 
    required: true,
    trim: true
  },
  services: [{ 
    type: String,
    trim: true
  }],
  description: { 
    type: String,
    trim: true,
    maxlength: 1000
  }
});

// User Auth Schema
const userAuthSchema = new Schema<UserAuthDocument>({
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  username: { 
    type: String, 
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  bio: { 
    type: String,
    trim: true,
    maxlength: 500
  },
  profilePicture: { 
    type: String,
    trim: true
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other'],
    required: false
  },
  phoneNumber: {
    type: String,
    trim: true
  },
  brandRegistrationStatus: {
    type: String,
    enum: ['NONE', 'PENDING', 'APPROVED', 'DECLINED'],
    default: 'NONE'
  },
  influencerRegistrationStatus: {
    type: String,
    enum: ['NONE', 'PENDING', 'APPROVED', 'REJECTED'],
    default: 'NONE'
  }
});

// Add pre-save hook to sync subscription_plan with currentPlan (for backwards compatibility)
userSchema.pre('save', function(next) {
  // Always keep subscription_plan in sync with currentPlan
  if (this.currentPlan) {
    (this as any).subscription_plan = this.currentPlan;
  }
  next();
});

// Add pre-update hooks to keep subscription_plan in sync
userSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate() as any;
  if (update.currentPlan && !update.subscription_plan) {
    update.subscription_plan = update.currentPlan;
  }
  next();
});

userSchema.pre('updateOne', function(next) {
  const update = this.getUpdate() as any;
  if (update.$set?.currentPlan) {
    update.$set.subscription_plan = update.$set.currentPlan;
  }
  next();
});

// Create models - re-use existing registrations when present
const User = (mongoose.models.User as mongoose.Model<UserDocument>) || mongoose.model<UserDocument>('User', userSchema);

const existingDiscriminators = User.discriminators || {};

const Brand =
  (existingDiscriminators.BRAND as mongoose.Model<BrandDocument>) ||
  User.discriminator<BrandDocument>('BRAND', brandSchema);

const InfluencerAuth =
  (existingDiscriminators.INFLUENCER as mongoose.Model<InfluencerAuthDocument>) ||
  User.discriminator<InfluencerAuthDocument>('INFLUENCER', influencerAuthSchema);

const ServiceProvider =
  (existingDiscriminators.SERVICE_PROVIDER as mongoose.Model<ServiceProviderDocument>) ||
  User.discriminator<ServiceProviderDocument>('SERVICE_PROVIDER', serviceProviderSchema);

const UserAuth =
  (existingDiscriminators.USER as mongoose.Model<UserAuthDocument>) ||
  User.discriminator<UserAuthDocument>('USER', userAuthSchema);

export { User as user, Brand as brand, InfluencerAuth as influencer, ServiceProvider as serviceProvider, UserAuth as userAuth }; 
