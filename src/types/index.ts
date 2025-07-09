import { Request } from 'express';
import { JwtPayload } from 'jsonwebtoken';

// Extend Express Request to include user
export interface AuthenticatedRequest<P = any, ResBody = any, ReqBody = any, ReqQuery = any> extends Request<P, ResBody, ReqBody, ReqQuery> {
  user?: {
    id: string;
    email: string;
    type: string;
  };
}

// JWT Payload interface
export interface JWTPayload extends JwtPayload {
  id: string;
}

// User types
export type UserType = 'BRAND' | 'INFLUENCER' | 'SERVICE_PROVIDER';

// Gender distribution interface
export interface GenderDistribution {
  gender: string;
  distribution: number;
}

// Age distribution interface
export interface AgeDistribution {
  age: string;
  value: number;
}

// Audience by country interface
export interface AudienceByCountry {
  category: string;
  name: string;
  value: number;
}

// Collaboration charges interface
export interface CollaborationCharges {
  reel: number;
  story: number;
  post: number;
  oneMonthDigitalRights: number;
}

// Social media data interface
export interface SocialMediaData {
  followers: number;
  link: string;
  genderDistribution: GenderDistribution[];
  ageDistribution: AgeDistribution[];
  audienceByCountry: AudienceByCountry[];
  collaborationCharges: CollaborationCharges;
}

// Influencer interface
export interface IInfluencer {
  name: string;
  categoryInstagram: string;
  categoryYouTube: string;
  user_name: string;
  city: string;
  state: string;
  language: string;
  gender: 'Male' | 'Female' | 'Other';
  instagramData: SocialMediaData;
  youtubeData: SocialMediaData;
  averageLikes: number;
  averageViews: number;
  averageComments: number;
  averageEngagement: number;
  image: string;
}

// OpenAI structured response interface
export interface OpenAIRequirements {
  city: string;
  state: string;
  minFollowers: number;
  maxFollowers: number;
  category: string;
  maleRatio: number;
  femaleRatio: number;
  maleComparison: '>=' | '<=';
  femaleComparison: '>=' | '<=';
  country: string;
  countryComparison: '>=' | '<=';
  countryValue: number;
  ageRange: string;
  ageComparison: '>=' | '<=';
  ageValue: number;
}

// Message interfaces for chat functionality
export interface IMessage {
  conversationId: string;
  senderId: string;
  content?: string;
  timestamp: Date;
  messageType: 'text' | 'image' | 'file';
  mediaUrl?: string;
  mediaKey?: string;
  fileName?: string;
  fileSize?: number;
  isRead: boolean;
  readAt?: Date;
  isDelivered: boolean;
  deliveredAt?: Date;
}

export interface IConversation {
  participants: string[];
  lastMessage?: string;
  lastMessageTime?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Auth interfaces
export interface IUser {
  email: string;
  password: string;
  type: UserType;
  resetPasswordToken?: string;
  resetPasswordExpires?: number;
  isCodeVerified?: boolean;
  isOnline?: boolean;
  lastSeen?: Date;
  socketId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IBrand extends IUser {
  companyName: string;
  industry: string;
  website?: string;
  description?: string;
}

export interface IInfluencerAuth extends IUser {
  name: string;
  username: string;
  bio?: string;
  profilePicture?: string;
}

export interface IServiceProvider extends IUser {
  companyName: string;
  services: string[];
  description?: string;
}

// Campaign interfaces
export interface CompensationDetails {
  type: 'Monetary' | 'Barter/Gifting' | 'Affiliate/Commission';
  amount?: number;
  currency?: string;
  description?: string;
  commissionRate?: number;
  giftValue?: number;
  products?: string[];
}

export interface CampaignTimelines {
  applicationDeadline: Date;
  campaignStartDate: Date;
  campaignEndDate: Date;
}

export interface TargetInfluencer {
  numberOfInfluencers: number;
  targetNiche: string[];
  followerCount: {
    min: number;
    max: number;
  };
  countries: string[];
  gender: ('Male' | 'Female' | 'Other')[];
  ageRange: {
    min: number;
    max: number;
  };
}

export interface ICampaign {
  brandId: string;
  productImages: string[];
  campaignName: string;
  campaignType: string;
  campaignBrief: string;
  deliverables: string[];
  compensation: CompensationDetails;
  timelines: CampaignTimelines;
  targetInfluencer: TargetInfluencer;
  status: 'Draft' | 'Active' | 'Paused' | 'Completed' | 'Cancelled';
  applicants?: string[];
  selectedInfluencers?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

// Ask endpoint interfaces
export interface AskRequest {
  prompt: string;
}

export interface ProcessedRequirements {
  city: string;
  state: string;
  minFollowers: number;
  maxFollowers: number;
  category: string;
  maleRatio: number | null;
  femaleRatio: number | null;
  maleComparison: string;
  femaleComparison: string;
  countryComparison: string;
  countryValue: number | null;
  country: string | null;
  ageRanges: string | null;
  ageComparison: string;
  ageValue: number | null;
}

export interface AskResponse {
  success: boolean;
  result: ProcessedRequirements;
  data: IInfluencer[];
  error?: string;
  debug?: {
    totalInfluencers: number;
    categoryMatches: number;
    cityMatches: number;
    query: any;
  };
}

 