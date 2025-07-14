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
  engagement_rate?: number; // Added for Bright Data analytics
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
  source?: 'local' | 'brightdata'; // Added to identify data source
  recentPosts?: Array<{ // Added for recent posts from Bright Data
    id: string;
    caption: string;
    like_count: number;
    comment_count: number;
    timestamp: string;
  }>;
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
  about?: string;
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
  brightDataResults?: IInfluencer[];
  dataSource?: 'local' | 'brightdata' | 'both';
}

// Bright Data interfaces
export interface BrightDataInfluencer {
  username: string;
  full_name: string;
  followers_count: number;
  following_count: number;
  biography: string;
  external_url?: string;
  profile_pic_url: string;
  is_private: boolean;
  is_verified: boolean;
  media_count: number;
  location?: string;
  category?: string;
  engagement_rate?: number;
  average_likes?: number;
  average_comments?: number;
  gender_distribution?: {
    male: number;
    female: number;
  };
  age_distribution?: {
    '13-17': number;
    '18-24': number;
    '25-34': number;
    '35-44': number;
    '45-64': number;
    '65+': number;
  };
  top_countries?: Array<{
    country: string;
    percentage: number;
  }>;
}

export interface BrightDataSearchParams {
  query?: string;
  location?: string;
  category?: string;
  min_followers?: number;
  max_followers?: number;
  gender?: 'male' | 'female';
  age_range?: string;
  country?: string;
  limit?: number;
}

// Project interfaces for Service Providers
export interface IProject {
  serviceProviderId: string;
  name: string;
  description: string;
  progressPercentage: number;
  date: Date;
  status: 'Planning' | 'In Progress' | 'Completed' | 'On Hold' | 'Cancelled';
  createdAt?: Date;
  updatedAt?: Date;
}

// Portfolio interfaces for Service Providers
export interface IPortfolioClient {
  projectTitle: string;
  servicesProvided: string[];
  projectDuration: string;
  projectStatus: 'Completed' | 'In Progress' | 'On Hold' | 'Cancelled';
  projectDescription: string;
  startDate?: Date;
  endDate?: Date;
  clientName?: string;
  budget?: number;
  images?: string[];
}

export interface IPortfolio {
  serviceProviderId: string;
  title: string;
  description?: string;
  clients: IPortfolioClient[];
  createdAt?: Date;
  updatedAt?: Date;
}

 