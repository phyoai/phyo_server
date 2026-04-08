import { Request } from 'express';
import { JwtPayload } from 'jsonwebtoken';

// Extend Express Request to include user
export interface AuthenticatedRequest<P = any, ResBody = any, ReqBody = any, ReqQuery = any> extends Request<P, ResBody, ReqBody, ReqQuery> {
  user?: {
    id: string;
    email: string;
    type: string;
  };
  requestId?: string;
}

// JWT Payload interface
export interface JWTPayload extends JwtPayload {
  id: string;
}

// User types
export type UserType = 'BRAND' | 'INFLUENCER' | 'SERVICE_PROVIDER' | 'USER';

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
  category?: string;
  name: string;
  value: number;
}

// Audience by city interface
export interface AudienceByCity {
  name: string;
  value: number;
}

// Language distribution interface
export interface LanguageDistribution {
  language: string;
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
  following?: number;
  posts_count?: number;
  avg_engagement?: number;
  link?: string;
  genderDistribution?: GenderDistribution[];
  ageDistribution?: AgeDistribution[];
  audienceByCountry?: AudienceByCountry[];
  audienceByCity?: AudienceByCity[];
  languageDistribution?: LanguageDistribution[];
  audienceQualityScore?: number;
  fakeFollowersPercent?: number;
  totalCommentsAnalyzed?: number;
  realUsersAnalyzed?: number;
  collaborationCharges?: CollaborationCharges;
}

// Influencer interface
export interface IInfluencer {
  name?: string;
  categoryInstagram?: string;
  categoryYouTube?: string;
  user_name: string;
  profile_name?: string;
  profile_pic_url?: string;
  biography?: string;
  is_verified?: boolean;
  is_business?: boolean;
  city?: string;
  state?: string;
  language?: string;
  gender?: 'Male' | 'Female' | 'Other';
  lastDemographicsFetch?: Date;
  instagramData?: SocialMediaData;
  youtubeData?: SocialMediaData;
  averageLikes?: number;
  averageViews?: number;
  averageComments?: number;
  averageEngagement?: number;
  image?: string;
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
  password?: string; // Made optional for OAuth users
  type: UserType;
  about?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: number;
  isCodeVerified?: boolean;
  // OTP fields for email verification
  emailVerificationOTP?: string;
  emailVerificationExpires?: number;
  isEmailVerified?: boolean;
  isOnline?: boolean;
  lastSeen?: Date;
  socketId?: string;
  // Google OAuth fields
  googleId?: string;
  googleEmail?: string;
  googleName?: string;
  googlePicture?: string;
  isOAuthUser?: boolean;
  // Subscription fields
  currentPlan?: SubscriptionPlan;
  subscriptionId?: string;
  subscriptionStatus?: 'ACTIVE' | 'INACTIVE' | 'CANCELLED' | 'EXPIRED' | 'PENDING';
  creditsRemaining?: number;
  trialCreditsGiven?: boolean;
  demoCreditsUsed?: boolean;
  lastPlanUpdate?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IBrand extends IUser {
  companyName: string;
  industry: string;
  website?: string;
  description?: string;
  company_type?: 'Brand' | 'Agency' | 'Marketplace';
  company_size?: '1-10' | '11-50' | '51-200' | '201-500' | '501-1000' | '1000+';
  location?: string;
  country?: string;
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
  verification_documents?: {
    business_registration?: string;
    tax_id?: string;
    company_registration_number?: string;
    authorization_letter?: string;
  };
  billing_info?: {
    billing_address?: string;
    contact_person?: string;
    finance_email?: string;
  };
  payment_method?: {
    card_details?: any;
    bank_account?: any;
    default_payment?: 'card' | 'bank';
    budget_limit?: number;
  };
  subscription_plan?: 'FREE' | 'BASIC' | 'PROFESSIONAL' | 'ENTERPRISE';
  team_members?: Array<{
    email: string;
    role: string;
    permissions: string[];
  }>;
  preferences?: {
    notifications?: boolean;
    email_preferences?: string[];
    timezone?: string;
    language?: string;
  };
  contact?: {
    first_name?: string;
    last_name?: string;
    phone?: string;
    job_title?: string;
  };
  signup_method?: 'email' | 'google' | 'linkedin' | 'sso';
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

export interface IUserAuth extends IUser {
  name: string;
  username: string;
  bio?: string;
  profilePicture?: string;
  gender?: 'Male' | 'Female' | 'Other';
  phoneNumber?: string;
  brandRegistrationStatus?: 'NONE' | 'PENDING' | 'APPROVED' | 'DECLINED';
  influencerRegistrationStatus?: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
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
  campaignId:string;
  brandId: string;
  productImages: string[];
  campaignName: string;
  campaignType: string;
  campaignBrief: string;
  deliverables: string[];
  compensation: CompensationDetails;
  budget: number;
  timelines: CampaignTimelines;
  targetInfluencer: TargetInfluencer;
  numberOfLivePosts?: number;
  reels?: string[];
  status: 'Draft' | 'Active' | 'Paused' | 'Completed' | 'Cancelled';
  applicants?: string[];
  selectedInfluencers?: string[];
  suggestedInfluencers?: Array<{
    username: string;
    reason: string;
    matchScore: number;
  }>;
  aiSuggestionMetadata?: {
    generatedAt: Date;
    prompt: string;
    criteria: any;
  };
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

// Enhanced influencer with Bright Data information
export interface EnhancedInfluencer extends IInfluencer {
  brightDataProfile?: {
    // Raw profile data from Bright Data
    [key: string]: any;
    lastUpdated?: string;
    profileUrl?: string;
  };
  brightDataPosts?: {
    // Raw posts data from Bright Data
    posts?: any[];
    postsCount?: number;
    lastUpdated?: string;
  };
}

export interface AskResponse {
  success: boolean;
  result?: ProcessedRequirements | any; // Allow any for new format searchCriteria
  data: EnhancedInfluencer[] | any[]; // Allow any[] for new demographics format
  error?: string;
  message?: string; // Add message field for AI no-results case
  warning?: string; // Add warning field for partial results
  searchCriteria?: any; // Add searchCriteria from AI response
  creditsUsed?: number; // Add creditsUsed field
  total_found?: number; // Total influencers returned (after filtering)
  total_fetched?: number; // Total influencers fetched (before filtering)
  filtered_out?: number; // Number of influencers filtered out
  suggestedUsernames?: string[]; // Add suggestedUsernames for error cases
  serviceUrl?: string; // Add serviceUrl for BrightScraper errors
  troubleshooting?: any; // Add troubleshooting steps
  citations?: string[]; // Add citations from Perplexity
  brightDataStatus?: {
    enabled: boolean;
    profilesEnhanced: number;
    errors: number;
  };
  debug?: {
    totalInfluencers?: number;
    categoryMatches?: number;
    cityMatches?: number;
    query?: any;
    // New flow debug fields
    totalProcessed?: number;
    tooFewFollowers?: number;
    tooManyFollowers?: number;
    errors?: number;
    requestedRange?: string;
  };
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

// Subscription and Payment interfaces
export type SubscriptionPlan = 'BRONZE' | 'SILVER' | 'GOLD' | 'PREMIUM';

export interface PlanFeatures {
  creatorSearch: boolean;
  creatorInsights: 'BASIC' | 'ADVANCED' | null;
  advancedFilters: boolean;
  audienceBasedSearch: boolean;
  historicalCost: boolean;
  preCuratedList: boolean;
  brandAnalysis: boolean;
  costingInsights: boolean;
  openAccessInfluencerDatabase: boolean;
  campaignReports: boolean;
  roleBasedAccess: boolean;
  volumeBasedDiscount: boolean;
  platformTraining: boolean;
  dedicatedCustomerSuccess: boolean;
  credits: number | 'UNLIMITED'; // Credits per month, UNLIMITED for premium
}

export interface ISubscriptionPlan {
  id: string;
  name: SubscriptionPlan;
  displayName: string;
  price: number; // Price in INR
  currency: string;
  interval: 'MONTHLY' | 'YEARLY';
  features: PlanFeatures;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ISubscription {
  userId: string;
  planId: string;
  plan: ISubscriptionPlan;
  status: 'ACTIVE' | 'INACTIVE' | 'CANCELLED' | 'EXPIRED' | 'PENDING';
  startDate: Date;
  endDate?: Date;
  nextBillingDate?: Date;
  razorpaySubscriptionId?: string;
  razorpayCustomerId?: string;
  creditsRemaining: number;
  creditsUsedThisMonth: number;
  lastCreditReset: Date;
  autoRenew: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IPayment {
  userId: string;
  subscriptionId?: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  paymentMethod: 'RAZORPAY' | 'OTHER';
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  description: string;
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreatePaymentOrderRequest {
  planId: string;
  interval?: 'MONTHLY' | 'YEARLY';
}

export interface PaymentOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  plan: ISubscriptionPlan;
  razorpayKey: string;
}

export interface VerifyPaymentRequest {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  planId: string;
}

export interface UserPlanInfo {
  currentPlan: SubscriptionPlan | null;
  subscription: ISubscription | null;
  creditsRemaining: number;
  features: PlanFeatures | null;
  isActive: boolean;
}

 
