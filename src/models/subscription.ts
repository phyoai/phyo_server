import mongoose, { Schema, Document } from 'mongoose';
import { ISubscriptionPlan, ISubscription, IPayment, SubscriptionPlan } from '../types';

// Subscription Plan Document
export interface SubscriptionPlanDocument extends Omit<ISubscriptionPlan, 'id'>, Document {
  id: string;
}

// Subscription Document
export interface SubscriptionDocument extends ISubscription, Document {}

// Payment Document
export interface PaymentDocument extends IPayment, Document {}

// Subscription Plan Schema
const subscriptionPlanSchema = new Schema<SubscriptionPlanDocument>({
  id: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    enum: ['BRONZE', 'SILVER', 'GOLD', 'PREMIUM'] as SubscriptionPlan[],
    required: true
  },
  displayName: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    required: true,
    default: 'INR'
  },
  interval: {
    type: String,
    enum: ['MONTHLY', 'YEARLY'],
    required: true
  },
  features: {
    creatorSearch: { type: Boolean, required: true },
    creatorInsights: {
      type: String,
      enum: ['BASIC', 'ADVANCED', null],
      default: null
    },
    advancedFilters: { type: Boolean, required: true },
    audienceBasedSearch: { type: Boolean, required: true },
    historicalCost: { type: Boolean, required: true },
    preCuratedList: { type: Boolean, required: true },
    brandAnalysis: { type: Boolean, required: true },
    costingInsights: { type: Boolean, required: true },
    openAccessInfluencerDatabase: { type: Boolean, required: true },
    campaignReports: { type: Boolean, required: true },
    roleBasedAccess: { type: Boolean, required: true },
    volumeBasedDiscount: { type: Boolean, required: true },
    platformTraining: { type: Boolean, required: true },
    dedicatedCustomerSuccess: { type: Boolean, required: true },
    credits: {
      type: Schema.Types.Mixed, // Can be number or 'UNLIMITED'
      required: true,
      validate: {
        validator: function(v: any) {
          return typeof v === 'number' || v === 'UNLIMITED';
        },
        message: 'Credits must be a number or "UNLIMITED"'
      }
    }
  },
  isActive: {
    type: Boolean,
    required: true,
    default: true
  }
}, {
  timestamps: true
});

// Subscription Schema
const subscriptionSchema = new Schema<SubscriptionDocument>({
  userId: {
    type: String,
    required: true,
    ref: 'User'
  },
  planId: {
    type: String,
    required: true,
    ref: 'SubscriptionPlan'
  },
  plan: {
    type: Object,
    required: true
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE', 'CANCELLED', 'EXPIRED', 'PENDING'],
    required: true,
    default: 'PENDING'
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date
  },
  nextBillingDate: {
    type: Date
  },
  razorpaySubscriptionId: {
    type: String,
    sparse: true
  },
  razorpayCustomerId: {
    type: String,
    sparse: true
  },
  creditsRemaining: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  creditsUsedThisMonth: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  lastCreditReset: {
    type: Date,
    required: true,
    default: Date.now
  },
  autoRenew: {
    type: Boolean,
    required: true,
    default: true
  }
}, {
  timestamps: true
});

// Payment Schema
const paymentSchema = new Schema<PaymentDocument>({
  userId: {
    type: String,
    required: true,
    ref: 'User'
  },
  subscriptionId: {
    type: String,
    ref: 'Subscription'
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    required: true,
    default: 'INR'
  },
  status: {
    type: String,
    enum: ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'],
    required: true,
    default: 'PENDING'
  },
  paymentMethod: {
    type: String,
    enum: ['RAZORPAY', 'OTHER'],
    required: true,
    default: 'RAZORPAY'
  },
  razorpayOrderId: {
    type: String,
    unique: true,
    sparse: true
  },
  razorpayPaymentId: {
    type: String,
    sparse: true
  },
  razorpaySignature: {
    type: String
  },
  description: {
    type: String,
    required: true
  },
  metadata: {
    type: Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Create indexes
subscriptionPlanSchema.index({ name: 1, isActive: 1 });
subscriptionSchema.index({ userId: 1, status: 1 });
subscriptionSchema.index({ userId: 1, endDate: 1 });
paymentSchema.index({ userId: 1, status: 1 });

// Create models
const SubscriptionPlan = mongoose.model<SubscriptionPlanDocument>('SubscriptionPlan', subscriptionPlanSchema);
const Subscription = mongoose.model<SubscriptionDocument>('Subscription', subscriptionSchema);
const Payment = mongoose.model<PaymentDocument>('Payment', paymentSchema);

export { SubscriptionPlan as subscriptionPlan, Subscription as subscription, Payment as payment };

// Predefined plans data
export const PREDEFINED_PLANS = [
  {
    id: 'bronze-monthly',
    name: 'BRONZE' as SubscriptionPlan,
    displayName: 'Bronze Plan',
    price: 0, // Free
    currency: 'INR',
    interval: 'MONTHLY' as const,
    features: {
      creatorSearch: true,
      creatorInsights: 'BASIC' as const,
      advancedFilters: false,
      audienceBasedSearch: false,
      historicalCost: false,
      preCuratedList: false,
      brandAnalysis: false,
      costingInsights: false,
      openAccessInfluencerDatabase: false,
      campaignReports: false,
      roleBasedAccess: false,
      volumeBasedDiscount: false,
      platformTraining: false,
      dedicatedCustomerSuccess: false,
      credits: 0 // No credits for free plan
    },
    isActive: true
  },
  {
    id: 'silver-monthly',
    name: 'SILVER' as SubscriptionPlan,
    displayName: 'Silver Plan',
    price: 1900, // $19 in INR (approx)
    currency: 'INR',
    interval: 'MONTHLY' as const,
    features: {
      creatorSearch: true,
      creatorInsights: null,
      advancedFilters: true,
      audienceBasedSearch: true,
      historicalCost: true,
      preCuratedList: true,
      brandAnalysis: true,
      costingInsights: true,
      openAccessInfluencerDatabase: true,
      campaignReports: true,
      roleBasedAccess: false,
      volumeBasedDiscount: false,
      platformTraining: false,
      dedicatedCustomerSuccess: false,
      credits: 50
    },
    isActive: true
  },
  {
    id: 'gold-monthly',
    name: 'GOLD' as SubscriptionPlan,
    displayName: 'Gold Plan',
    price: 7900, // $79 in INR (approx)
    currency: 'INR',
    interval: 'MONTHLY' as const,
    features: {
      creatorSearch: true,
      creatorInsights: null,
      advancedFilters: true,
      audienceBasedSearch: true,
      historicalCost: true,
      preCuratedList: true,
      brandAnalysis: true,
      costingInsights: true,
      openAccessInfluencerDatabase: true,
      campaignReports: true,
      roleBasedAccess: true,
      volumeBasedDiscount: true,
      platformTraining: true,
      dedicatedCustomerSuccess: true,
      credits: 250
    },
    isActive: true
  },
  {
    id: 'premium-monthly',
    name: 'PREMIUM' as SubscriptionPlan,
    displayName: 'Premium Plan',
    price: 19900, // $199 in INR (approx)
    currency: 'INR',
    interval: 'MONTHLY' as const,
    features: {
      creatorSearch: true,
      creatorInsights: null,
      advancedFilters: true,
      audienceBasedSearch: true,
      historicalCost: true,
      preCuratedList: true,
      brandAnalysis: true,
      costingInsights: true,
      openAccessInfluencerDatabase: true,
      campaignReports: true,
      roleBasedAccess: true,
      volumeBasedDiscount: true,
      platformTraining: true,
      dedicatedCustomerSuccess: true,
      credits: 'UNLIMITED' as const
    },
    isActive: true
  }
];
