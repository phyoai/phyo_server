import mongoose, { Schema, Document } from 'mongoose';
import { IUser, IBrand, IInfluencerAuth, IServiceProvider, UserType } from '../types';

// Base User Document
export interface UserDocument extends IUser, Document {}

// Brand Document
export interface BrandDocument extends IBrand, Document {}

// Influencer Auth Document  
export interface InfluencerAuthDocument extends IInfluencerAuth, Document {}

// Service Provider Document
export interface ServiceProviderDocument extends IServiceProvider, Document {}

// Base User Schema
const userSchema = new Schema<UserDocument>({
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true
  },
  password: { 
    type: String, 
    required: true,
    minlength: 6
  },
  type: { 
    type: String, 
    enum: ['BRAND', 'INFLUENCER', 'SERVICE_PROVIDER'] as UserType[],
    required: true
  },
  about: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Number },
  isCodeVerified: { type: Boolean, default: false },
  isOnline: { type: Boolean, default: false },
  lastSeen: { type: Date, default: Date.now },
  socketId: { type: String }
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

// Create models
const User = mongoose.model<UserDocument>('User', userSchema);
const Brand = User.discriminator<BrandDocument>('BRAND', brandSchema);
const InfluencerAuth = User.discriminator<InfluencerAuthDocument>('INFLUENCER', influencerAuthSchema);
const ServiceProvider = User.discriminator<ServiceProviderDocument>('SERVICE_PROVIDER', serviceProviderSchema);

export { User as user, Brand as brand, InfluencerAuth as influencer, ServiceProvider as serviceProvider }; 