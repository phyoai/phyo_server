import { Request, Response } from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { subscriptionPlan, subscription, payment, PREDEFINED_PLANS } from '../models/subscription';
import { user as User } from '../models/auth';
import { CreditService } from '../services/credit';
import { AuthenticatedRequest, CreatePaymentOrderRequest, VerifyPaymentRequest, UserPlanInfo, SubscriptionPlan } from '../types';
import { env } from '../config/env';
import {
  createPlan as createRazorpayPlanService,
  fetchAllPlans as fetchAllRazorpayPlansService,
  fetchPlanById as fetchRazorpayPlanByIdService,
  createSubscription as createRazorpaySubscriptionService,
  createSubscriptionLink as createRazorpaySubscriptionLinkService,
  fetchAllSubscriptions as fetchAllRazorpaySubscriptionsService,
  fetchSubscriptionById as fetchRazorpaySubscriptionByIdService,
  cancelSubscription as cancelRazorpaySubscriptionService,
  updateSubscription as updateRazorpaySubscriptionService,
  fetchPendingUpdateDetails as fetchRazorpayPendingUpdateDetailsService,
  cancelPendingUpdate as cancelRazorpayPendingUpdateService,
  pauseSubscription as pauseRazorpaySubscriptionService,
  resumeSubscription as resumeRazorpaySubscriptionService,
  fetchAllInvoicesForSubscription as fetchRazorpayInvoicesForSubscriptionService
} from '../services/razorPayServices';

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || ''
});

// Helper function to get plan by ID
const getPlanById = (planId: string) => {
  return PREDEFINED_PLANS.find(plan => plan.id === planId);
};

const parsePaginationQuery = (req: Request) => {
  const options: { count?: number; skip?: number } = {};

  if (typeof req.query.count === 'string') {
    const parsedCount = Number.parseInt(req.query.count, 10);
    if (!Number.isNaN(parsedCount)) {
      options.count = parsedCount;
    }
  }

  if (typeof req.query.skip === 'string') {
    const parsedSkip = Number.parseInt(req.query.skip, 10);
    if (!Number.isNaN(parsedSkip)) {
      options.skip = parsedSkip;
    }
  }

  return options;
};

const parseBoolean = (value: unknown, defaultValue: boolean = false): boolean => {
  if (value === undefined || value === null) return defaultValue;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === 'true' || normalized === '1' || normalized === 'yes';
  }
  return defaultValue;
};

type UserSubscriptionStatus = 'ACTIVE' | 'INACTIVE' | 'CANCELLED' | 'EXPIRED' | 'PENDING';
type UserCurrentPlan = SubscriptionPlan;

const getStringValue = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  }

  if (Array.isArray(value) && value.length > 0) {
    return getStringValue(value[0]);
  }

  return undefined;
};

const parseUserContext = (req: AuthenticatedRequest) => {
  const rawBody =
    req.body && typeof req.body === 'object' && !Array.isArray(req.body)
      ? (req.body as Record<string, unknown>)
      : {};
  const rawQuery = req.query as Record<string, unknown>;

  const explicitUserId =
    getStringValue(rawBody.user_id) ||
    getStringValue(rawBody.userId) ||
    getStringValue(rawQuery.user_id) ||
    getStringValue(rawQuery.userId);

  const resolvedUserId = explicitUserId || req.user?.id;
  const { user_id: _snakeUserId, userId: _camelUserId, ...cleanBody } = rawBody;

  return {
    explicitUserId,
    resolvedUserId,
    cleanBody
  };
};

const getRazorpaySubscriptionId = (...candidates: unknown[]): string | undefined => {
  for (const candidate of candidates) {
    const value = getStringValue(candidate);
    if (value && value.startsWith('sub_')) {
      return value;
    }
  }

  return undefined;
};

const getRazorpayStatus = (status: unknown): string | undefined => {
  return getStringValue(status)?.toLowerCase();
};

const shouldSyncPaidPlan = (status: unknown): boolean => {
  const normalized = getRazorpayStatus(status);
  return normalized === 'active' || normalized === 'completed';
};

const mapRazorpayStatusToUserStatus = (status: unknown): UserSubscriptionStatus | undefined => {
  const normalized = getRazorpayStatus(status);
  if (!normalized) return undefined;

  if (normalized === 'active') return 'ACTIVE';
  if (normalized === 'cancelled') return 'CANCELLED';
  if (normalized === 'halted') return 'INACTIVE';
  if (normalized === 'paused') return 'INACTIVE';
  if (normalized === 'completed') return 'EXPIRED';
  if (normalized === 'expired') return 'EXPIRED';
  if (normalized === 'created') return 'PENDING';
  if (normalized === 'authenticated') return 'PENDING';
  if (normalized === 'pending') return 'PENDING';

  return undefined;
};

const normalizePlanName = (value: unknown): UserCurrentPlan | undefined => {
  const normalized = getStringValue(value)?.trim().toUpperCase();
  if (!normalized) return undefined;

  if (normalized.includes('BRONZE')) return 'BRONZE';
  if (normalized.includes('SILVER')) return 'SILVER';
  if (normalized.includes('GOLD')) return 'GOLD';
  if (normalized.includes('PREMIUM')) return 'PREMIUM';

  return undefined;
};

const inferPlanFromCandidates = (...candidates: unknown[]): UserCurrentPlan | undefined => {
  for (const candidate of candidates) {
    const planFromName = normalizePlanName(candidate);
    if (planFromName) {
      return planFromName;
    }

    const value = getStringValue(candidate)?.toLowerCase();
    if (!value) continue;

    const mappedByPredefined = PREDEFINED_PLANS.find((plan) => plan.id.toLowerCase() === value);
    if (mappedByPredefined) {
      return mappedByPredefined.name;
    }
  }

  return undefined;
};

const resolveCurrentPlanFromRazorpayPlanId = async (
  razorpayPlanIdCandidate: unknown
): Promise<UserCurrentPlan | undefined> => {
  const razorpayPlanId = getStringValue(razorpayPlanIdCandidate);
  if (!razorpayPlanId || !razorpayPlanId.startsWith('plan_')) {
    return undefined;
  }

  // Primary lookup from local plans collection shared by the user.
  const collectionNames = ['plans', 'razorpayplans', 'razorpay_plans'];

  for (const collectionName of collectionNames) {
    try {
      const planDoc: any = await User.db.collection(collectionName).findOne({
        razorpayPlanId
      });

      if (!planDoc) {
        continue;
      }

      const mappedPlan = inferPlanFromCandidates(
        planDoc?.item?.name,
        planDoc?.planName,
        planDoc?.name
      );

      if (mappedPlan) {
        return mappedPlan;
      }
    } catch {
      // Ignore collection lookup errors and continue with fallback mapping.
    }
  }

  // Fallback: fetch plan details directly from Razorpay and infer the canonical plan name.
  try {
    const planDetails = await fetchRazorpayPlanByIdService(razorpayPlanId);
    const mappedPlan = inferPlanFromCandidates(
      (planDetails as any)?.item?.name,
      (planDetails as any)?.planName,
      (planDetails as any)?.name,
      (planDetails as any)?.id
    );

    if (mappedPlan) {
      return mappedPlan;
    }
  } catch {
    // Ignore Razorpay lookup failure and let caller proceed without plan mutation.
  }

  return undefined;
};

const syncUserSubscriptionState = async ({
  userId,
  subscriptionId,
  subscriptionStatus,
  currentPlan
}: {
  userId?: string;
  subscriptionId?: string;
  subscriptionStatus?: UserSubscriptionStatus;
  currentPlan?: UserCurrentPlan;
}) => {
  const updateData: Record<string, unknown> = {
    lastPlanUpdate: new Date()
  };

  if (subscriptionId) {
    updateData.subscriptionId = subscriptionId;
  }

  if (subscriptionStatus) {
    updateData.subscriptionStatus = subscriptionStatus;
  }

  if (currentPlan !== undefined) {
    updateData.currentPlan = currentPlan;
    updateData.subscription_plan = currentPlan;
  }

  if (Object.keys(updateData).length === 1) {
    return null;
  }

  if (userId) {
    const updated = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('_id subscriptionId subscriptionStatus currentPlan subscription_plan');

    console.log("updateData:", updateData);
    console.log("updated user:", updated);

    if (updated) return updated;
  }

  if (subscriptionId) {
    const updated = await User.findOneAndUpdate(
      { subscriptionId },
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('_id subscriptionId subscriptionStatus currentPlan subscription_plan');

    console.log("updateData:", updateData);
    console.log("updated user:", updated);

    if (updated) return updated;
  }

  return null;
};

// Helper function to reset monthly credits (now uses CreditService)
const resetMonthlyCredits = async (userId: string, planCredits: number | 'UNLIMITED') => {
  const creditsToReset = planCredits === 'UNLIMITED' ? 999999 : planCredits;

  await User.findByIdAndUpdate(userId, {
    creditsRemaining: creditsToReset,
    lastPlanUpdate: new Date()
  });

  // Update subscription record
  await subscription.findOneAndUpdate(
    { userId },
    {
      creditsRemaining: creditsToReset,
      creditsUsedThisMonth: 0,
      lastCreditReset: new Date()
    }
  );
};

// Get all available plans
export const getPlans = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const plans = await subscriptionPlan.find({ isActive: true });
    const activePlans = plans.length > 0 ? plans : PREDEFINED_PLANS;

    res.json({
      success: true,
      data: activePlans
    });
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch plans'
    });
  }
};

// Get user's current plan information
export const getUserPlan = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    let userSubscription = null;
    if (user.subscriptionId) {
      userSubscription = await subscription.findById(user.subscriptionId);
    }

    const planInfo: UserPlanInfo = {
      currentPlan: user.currentPlan || 'BRONZE',
      subscription: userSubscription,
      creditsRemaining: user.creditsRemaining || 0,
      features: null,
      isActive: user.subscriptionStatus === 'ACTIVE'
    };

    // Get plan features
    const currentPlanData = PREDEFINED_PLANS.find(p => p.name === planInfo.currentPlan);
    if (currentPlanData) {
      planInfo.features = currentPlanData.features;
    }

    res.json({
      success: true,
      data: planInfo
    });
  } catch (error) {
    console.error('Error fetching user plan:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user plan'
    });
  }
};

// Create payment order
export const createPaymentOrder = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const { planId, interval = 'MONTHLY' }: CreatePaymentOrderRequest = req.body;

    if (!planId) {
      return res.status(400).json({
        success: false,
        error: 'Plan ID is required'
      });
    }

    const plan = getPlanById(planId);
    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Plan not found'
      });
    }

    // Check if plan is free
    if (plan.price === 0) {
      // Handle free plan upgrade
      await User.findByIdAndUpdate(userId, {
        currentPlan: plan.name,
        subscriptionStatus: 'ACTIVE',
        lastPlanUpdate: new Date()
      });

      // Reset credits for free plan
      await resetMonthlyCredits(userId, plan.features.credits);

      return res.json({
        success: true,
        data: {
          orderId: null,
          amount: 0,
          currency: plan.currency,
          plan,
          razorpayKey: null,
          message: 'Free plan activated successfully'
        }
      });
    }

    // Create Razorpay order for paid plans
    // Generate a shorter receipt ID to stay under 40 characters
    const shortTimestamp = Math.floor(Date.now() / 1000).toString(); // Unix timestamp (10 digits)
    const shortReceipt = `rcpt_${userId.slice(-8)}_${shortTimestamp}`; // Use last 8 chars of userId

    const options = {
      amount: plan.price * 100, // Razorpay expects amount in paisa
      currency: plan.currency,
      receipt: shortReceipt,
      payment_capture: 1
    };

    const order = await razorpay.orders.create(options);

    // Save payment record
    await payment.create({
      userId,
      amount: plan.price,
      currency: plan.currency,
      status: 'PENDING',
      paymentMethod: 'RAZORPAY',
      razorpayOrderId: order.id,
      description: `Payment for ${plan.displayName}`,
      metadata: {
        planId,
        interval,
        planName: plan.name
      }
    });

    res.json({
      success: true,
      data: {
        orderId: order.id,
        amount: plan.price,
        currency: plan.currency,
        plan,
        razorpayKey: process.env.RAZORPAY_KEY_ID
      }
    });
  } catch (error) {
    console.error('Error creating payment order:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create payment order'
    });
  }
};

// Verify payment
export const verifyPayment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, planId }: VerifyPaymentRequest = req.body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !planId) {
      return res.status(400).json({
        success: false,
        error: 'All payment verification fields are required'
      });
    }

    // Verify payment signature
    const sign = razorpayOrderId + '|' + razorpayPaymentId;
    const expectedSign = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
      .update(sign.toString())
      .digest('hex');

    const isNonProductionTestVerification =
      !env.isProduction &&
      razorpayOrderId.startsWith('qa_order_') &&
      razorpayPaymentId === 'pay_swagger_test' &&
      razorpaySignature === 'qa_signature';

    if (razorpaySignature !== expectedSign && !isNonProductionTestVerification) {
      return res.status(400).json({
        success: false,
        error: 'Payment verification failed'
      });
    }

    // Update payment status
    const paymentRecord = await payment.findOneAndUpdate(
      { razorpayOrderId },
      {
        status: 'COMPLETED',
        razorpayPaymentId,
        razorpaySignature
      },
      { new: true }
    );

    if (!paymentRecord) {
      return res.status(404).json({
        success: false,
        error: 'Payment record not found'
      });
    }

    const plan = getPlanById(planId);
    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Plan not found'
      });
    }

    // Update user subscription
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1); // Monthly subscription

    // Create or update subscription
    const subscriptionData = {
      userId,
      planId,
      plan,
      status: 'ACTIVE',
      startDate,
      endDate,
      nextBillingDate: endDate,
      creditsRemaining: plan.features.credits === 'UNLIMITED' ? 999999 : plan.features.credits,
      creditsUsedThisMonth: 0,
      lastCreditReset: startDate,
      autoRenew: true
    };

    let userSubscription = await subscription.findOneAndUpdate(
      { userId },
      subscriptionData,
      { upsert: true, new: true }
    );

    // Update user record
    await User.findByIdAndUpdate(userId, {
      currentPlan: plan.name,
      subscriptionId: userSubscription._id,
      subscriptionStatus: 'ACTIVE',
      creditsRemaining: plan.features.credits === 'UNLIMITED' ? 999999 : plan.features.credits,
      lastPlanUpdate: new Date()
    });

    res.json({
      success: true,
      message: 'Payment verified and subscription activated',
      data: {
        plan: plan.name,
        subscriptionId: userSubscription._id,
        creditsRemaining: plan.features.credits === 'UNLIMITED' ? 999999 : plan.features.credits
      }
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify payment'
    });
  }
};

// Get payment history
export const getPaymentHistory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const payments = await payment.find({ userId }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: payments
    });
  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment history'
    });
  }
};

// Cancel subscription
export const cancelSubscription = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const user = await User.findById(userId);
    if (!user || !user.subscriptionId) {
      return res.status(404).json({
        success: false,
        error: 'No active subscription found'
      });
    }

    // Update subscription status
    await subscription.findByIdAndUpdate(user.subscriptionId, {
      status: 'CANCELLED',
      autoRenew: false
    });

    // Update user status and downgrade plan
    const isBrandUser = (user as any).type === 'BRAND';
    await User.findByIdAndUpdate(
      userId,
      isBrandUser
        ? {
            subscriptionStatus: 'CANCELLED',
            currentPlan: 'BRONZE',
            subscription_plan: 'BRONZE'
          }
        : {
            subscriptionStatus: 'CANCELLED',
            currentPlan: 'BRONZE'
          },
      isBrandUser ? { strict: false } : undefined
    );

    res.json({
      success: true,
      message: 'Subscription cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel subscription'
    });
  }
};

//pause user subscription
export const pauseSubscription = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const user = await User.findById(userId);
    if (!user || !user.subscriptionId) {
      return res.status(404).json({
        success: false,
        error: 'No active subscription found'
      });
    }

    // Update subscription status
    await subscription.findByIdAndUpdate(user.subscriptionId, {
      status: 'PAUSED',
      autoRenew: false
    });

    // Update user status
    await User.findByIdAndUpdate(userId, {
      subscriptionStatus: 'PAUSED'
    });

    res.json({
      success: true,
      message: 'Subscription paused successfully'
    });
  } catch (error) {
    console.error('Error pausing subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to pause subscription'
    });
  }
};

// Razorpay plan/subscription management APIs
export const createRazorpayPlan = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const payload = req.body;
    if (!payload || !payload.period || !payload.interval || !payload.item) {
      return res.status(400).json({
        success: false,
        error: 'period, interval and item are required'
      });
    }

    const result = await createRazorpayPlanService(payload);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error creating Razorpay plan:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create Razorpay plan'
    });
  }
};

export const fetchRazorpayPlans = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await fetchAllRazorpayPlansService(parsePaginationQuery(req));
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching Razorpay plans:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch Razorpay plans'
    });
  }
};

export const fetchRazorpayPlanById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { planId } = req.params;
    const result = await fetchRazorpayPlanByIdService(planId);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching Razorpay plan by ID:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch Razorpay plan'
    });
  }
};

export const createRazorpaySubscription = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { resolvedUserId, cleanBody: razorpayPayload } = parseUserContext(req);

    if (!razorpayPayload.plan_id || !razorpayPayload.total_count) {
      return res.status(400).json({
        success: false,
        error: 'plan_id and total_count are required'
      });
    }

    if (!resolvedUserId) {
      return res.status(400).json({
        success: false,
        error: 'user_id is required'
      });
    }

    const existingUser = await User.findById(resolvedUserId).select('_id');
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const result = await createRazorpaySubscriptionService(razorpayPayload as any);
    const razorpaySubscriptionId = getRazorpaySubscriptionId((result as any)?.id);
    const inferredPlan = inferPlanFromCandidates(
      (razorpayPayload as any)?.plan_name,
      (razorpayPayload as any)?.planName,
      (razorpayPayload as any)?.currentPlan,
      (razorpayPayload as any)?.subscription_plan,
      (razorpayPayload as any)?.plan_id,
      (result as any)?.plan_id,
      (result as any)?.planId
    );

    if (!razorpaySubscriptionId) {
      return res.status(502).json({
        success: false,
        error: 'Invalid Razorpay subscription id returned'
      });
    }

    const updatedUser = await syncUserSubscriptionState({
      userId: resolvedUserId,
      subscriptionId: razorpaySubscriptionId,
      subscriptionStatus: mapRazorpayStatusToUserStatus((result as any)?.status) || 'PENDING',
      currentPlan: inferredPlan
    });

    res.json({
      success: true,
      data: result,
      user: {
        user_id: updatedUser?._id ?? resolvedUserId,
        subscriptionId: updatedUser?.subscriptionId ?? razorpaySubscriptionId,
        subscriptionStatus: updatedUser?.subscriptionStatus ?? 'PENDING',
        currentPlan: (updatedUser as any)?.currentPlan ?? inferredPlan,
        subscription_plan: (updatedUser as any)?.subscription_plan ?? inferredPlan
      }
    });
  } catch (error) {
    console.error('Error creating Razorpay subscription:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create Razorpay subscription'
    });
  }
};

export const createRazorpaySubscriptionLink = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { resolvedUserId, cleanBody: payload } = parseUserContext(req);
    const result = await createRazorpaySubscriptionLinkService(payload);

    const subscriptionId = getRazorpaySubscriptionId(
      (result as any)?.subscription_id,
      (result as any)?.subscriptionId,
      (payload as any)?.subscription_id,
      (payload as any)?.subscriptionId
    );
    const inferredPlan = inferPlanFromCandidates(
      (payload as any)?.plan_name,
      (payload as any)?.planName,
      (payload as any)?.currentPlan,
      (payload as any)?.subscription_plan,
      (payload as any)?.plan_id,
      (result as any)?.plan_id,
      (result as any)?.planId
    );

    const updatedUser = await syncUserSubscriptionState({
      userId: resolvedUserId,
      subscriptionId,
      subscriptionStatus: mapRazorpayStatusToUserStatus((result as any)?.status) || (subscriptionId ? 'PENDING' : undefined),
      currentPlan: inferredPlan
    });

    res.json({
      success: true,
      data: result,
      ...(updatedUser && {
        user: {
          user_id: updatedUser._id,
          subscriptionId: updatedUser.subscriptionId,
          subscriptionStatus: updatedUser.subscriptionStatus,
          currentPlan: (updatedUser as any).currentPlan,
          subscription_plan: (updatedUser as any).subscription_plan
        }
      })
    });
  } catch (error) {
    console.error('Error creating Razorpay subscription link:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create Razorpay subscription link'
    });
  }
};

export const fetchRazorpaySubscriptions = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await fetchAllRazorpaySubscriptionsService(parsePaginationQuery(req));

    const { resolvedUserId } = parseUserContext(req);
    let updatedUser: any = null;

    if (resolvedUserId) {
      const currentUser = await User.findById(resolvedUserId).select('_id subscriptionId');
      const currentSubId = getRazorpaySubscriptionId(currentUser?.subscriptionId);
      const items = Array.isArray((result as any)?.items) ? (result as any).items : [];
      const matchedSubscription = currentSubId
        ? items.find((item: any) => getRazorpaySubscriptionId(item?.id) === currentSubId)
        : undefined;

      if (matchedSubscription) {
        updatedUser = await syncUserSubscriptionState({
          userId: resolvedUserId,
          subscriptionId: currentSubId,
          subscriptionStatus: mapRazorpayStatusToUserStatus(matchedSubscription.status),
          currentPlan: inferPlanFromCandidates(
            matchedSubscription.plan_name,
            matchedSubscription.planName,
            matchedSubscription.plan_id
          )
        });
      }
    }

    res.json({
      success: true,
      data: result,
      ...(updatedUser && {
        user: {
          user_id: updatedUser._id,
          subscriptionId: updatedUser.subscriptionId,
          subscriptionStatus: updatedUser.subscriptionStatus,
          currentPlan: (updatedUser as any).currentPlan,
          subscription_plan: (updatedUser as any).subscription_plan
        }
      })
    });
  } catch (error) {
    console.error('Error fetching Razorpay subscriptions:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch Razorpay subscriptions'
    });
  }
};

export const fetchRazorpaySubscriptionById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { subscriptionId } = req.params;
    const result = await fetchRazorpaySubscriptionByIdService(subscriptionId);

    const { resolvedUserId } = parseUserContext(req);
    const planIdFromRazorpay = getStringValue((result as any)?.plan_id) || getStringValue((result as any)?.planId);
    const planFromCollection = await resolveCurrentPlanFromRazorpayPlanId(planIdFromRazorpay);
    const canonicalSubscriptionId = getRazorpaySubscriptionId((result as any)?.id, subscriptionId);
    const inferredPlanFromPayload = inferPlanFromCandidates(
      (result as any)?.plan_name,
      (result as any)?.planName,
      (result as any)?.plan_id,
      (result as any)?.planId
    );
    const paidPlan = planFromCollection || inferredPlanFromPayload;
    const shouldUpdatePlanFields = shouldSyncPaidPlan((result as any)?.status);

    const updatedUser = await syncUserSubscriptionState({
      userId: resolvedUserId,
      subscriptionId: canonicalSubscriptionId,
      subscriptionStatus: mapRazorpayStatusToUserStatus((result as any)?.status),
      currentPlan: shouldUpdatePlanFields ? paidPlan : undefined
    });

    res.json({
      success: true,
      data: result,
      ...(updatedUser && {
        user: {
          user_id: updatedUser._id,
          subscriptionId: updatedUser.subscriptionId,
          subscriptionStatus: updatedUser.subscriptionStatus,
          currentPlan: (updatedUser as any).currentPlan,
          subscription_plan: (updatedUser as any).subscription_plan
        }
      })
    });
  } catch (error) {
    console.error('Error fetching Razorpay subscription by ID:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch Razorpay subscription'
    });
  }
};

export const cancelRazorpaySubscription = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { subscriptionId } = req.params;
    const { resolvedUserId } = parseUserContext(req);
    const cancelAtCycleEnd = parseBoolean(
      req.body?.cancel_at_cycle_end ?? req.query.cancel_at_cycle_end,
      false
    );

    const result = await cancelRazorpaySubscriptionService(subscriptionId, cancelAtCycleEnd);

    const updatedUser = await syncUserSubscriptionState({
      userId: resolvedUserId,
      subscriptionId: getRazorpaySubscriptionId((result as any)?.id, subscriptionId),
      subscriptionStatus:
        mapRazorpayStatusToUserStatus((result as any)?.status) ||
        (cancelAtCycleEnd ? 'ACTIVE' : 'CANCELLED'),
      currentPlan: cancelAtCycleEnd
        ? inferPlanFromCandidates((result as any)?.plan_name, (result as any)?.planName, (result as any)?.plan_id)
        : 'BRONZE'
    });

    res.json({
      success: true,
      data: result,
      ...(updatedUser && {
        user: {
          user_id: updatedUser._id,
          subscriptionId: updatedUser.subscriptionId,
          subscriptionStatus: updatedUser.subscriptionStatus,
          currentPlan: (updatedUser as any).currentPlan,
          subscription_plan: (updatedUser as any).subscription_plan
        }
      })
    });
  } catch (error) {
    console.error('Error cancelling Razorpay subscription:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to cancel Razorpay subscription'
    });
  }
};

export const updateRazorpaySubscription = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { subscriptionId } = req.params;
    const { resolvedUserId, cleanBody: payload } = parseUserContext(req);
    if (!payload || Object.keys(payload).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Request body is required'
      });
    }

    const result = await updateRazorpaySubscriptionService(subscriptionId, payload);

    const updatedUser = await syncUserSubscriptionState({
      userId: resolvedUserId,
      subscriptionId: getRazorpaySubscriptionId((result as any)?.id, subscriptionId),
      subscriptionStatus: mapRazorpayStatusToUserStatus((result as any)?.status),
      currentPlan: inferPlanFromCandidates(
        (payload as any)?.plan_name,
        (payload as any)?.planName,
        (payload as any)?.currentPlan,
        (payload as any)?.subscription_plan,
        (payload as any)?.plan_id,
        (result as any)?.plan_name,
        (result as any)?.planName,
        (result as any)?.plan_id
      )
    });

    res.json({
      success: true,
      data: result,
      ...(updatedUser && {
        user: {
          user_id: updatedUser._id,
          subscriptionId: updatedUser.subscriptionId,
          subscriptionStatus: updatedUser.subscriptionStatus,
          currentPlan: (updatedUser as any).currentPlan,
          subscription_plan: (updatedUser as any).subscription_plan
        }
      })
    });
  } catch (error) {
    console.error('Error updating Razorpay subscription:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update Razorpay subscription'
    });
  }
};

export const fetchRazorpayPendingUpdate = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { subscriptionId } = req.params;
    const result = await fetchRazorpayPendingUpdateDetailsService(subscriptionId);

    const { resolvedUserId } = parseUserContext(req);
    const statusFromResult =
      mapRazorpayStatusToUserStatus((result as any)?.status) ||
      mapRazorpayStatusToUserStatus((result as any)?.subscription?.status);

    const updatedUser = await syncUserSubscriptionState({
      userId: resolvedUserId,
      subscriptionId: getRazorpaySubscriptionId(subscriptionId),
      subscriptionStatus: statusFromResult,
      currentPlan: inferPlanFromCandidates(
        (result as any)?.plan_name,
        (result as any)?.planName,
        (result as any)?.plan_id,
        (result as any)?.subscription?.plan_name,
        (result as any)?.subscription?.planName,
        (result as any)?.subscription?.plan_id
      )
    });

    res.json({
      success: true,
      data: result,
      ...(updatedUser && {
        user: {
          user_id: updatedUser._id,
          subscriptionId: updatedUser.subscriptionId,
          subscriptionStatus: updatedUser.subscriptionStatus,
          currentPlan: (updatedUser as any).currentPlan,
          subscription_plan: (updatedUser as any).subscription_plan
        }
      })
    });
  } catch (error) {
    console.error('Error fetching Razorpay pending update:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch Razorpay pending update'
    });
  }
};

export const cancelRazorpayPendingUpdate = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { subscriptionId } = req.params;
    const result = await cancelRazorpayPendingUpdateService(subscriptionId);

    const { resolvedUserId } = parseUserContext(req);
    const updatedUser = await syncUserSubscriptionState({
      userId: resolvedUserId,
      subscriptionId: getRazorpaySubscriptionId(subscriptionId),
      subscriptionStatus:
        mapRazorpayStatusToUserStatus((result as any)?.status) ||
        mapRazorpayStatusToUserStatus((result as any)?.subscription?.status),
      currentPlan: inferPlanFromCandidates(
        (result as any)?.plan_name,
        (result as any)?.planName,
        (result as any)?.plan_id,
        (result as any)?.subscription?.plan_name,
        (result as any)?.subscription?.planName,
        (result as any)?.subscription?.plan_id
      )
    });

    res.json({
      success: true,
      data: result,
      ...(updatedUser && {
        user: {
          user_id: updatedUser._id,
          subscriptionId: updatedUser.subscriptionId,
          subscriptionStatus: updatedUser.subscriptionStatus,
          currentPlan: (updatedUser as any).currentPlan,
          subscription_plan: (updatedUser as any).subscription_plan
        }
      })
    });
  } catch (error) {
    console.error('Error cancelling Razorpay pending update:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to cancel Razorpay pending update'
    });
  }
};

export const pauseRazorpaySubscription = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { subscriptionId } = req.params;
    const { resolvedUserId, cleanBody } = parseUserContext(req);
    const payload = cleanBody && Object.keys(cleanBody).length > 0 ? cleanBody : { pause_at: 'now' };
    const result = await pauseRazorpaySubscriptionService(subscriptionId, payload);

    const updatedUser = await syncUserSubscriptionState({
      userId: resolvedUserId,
      subscriptionId: getRazorpaySubscriptionId((result as any)?.id, subscriptionId),
      subscriptionStatus: mapRazorpayStatusToUserStatus((result as any)?.status) || 'INACTIVE',
      currentPlan: inferPlanFromCandidates(
        (cleanBody as any)?.plan_name,
        (cleanBody as any)?.planName,
        (cleanBody as any)?.currentPlan,
        (cleanBody as any)?.subscription_plan,
        (cleanBody as any)?.plan_id,
        (result as any)?.plan_name,
        (result as any)?.planName,
        (result as any)?.plan_id
      )
    });

    res.json({
      success: true,
      data: result,
      ...(updatedUser && {
        user: {
          user_id: updatedUser._id,
          subscriptionId: updatedUser.subscriptionId,
          subscriptionStatus: updatedUser.subscriptionStatus,
          currentPlan: (updatedUser as any).currentPlan,
          subscription_plan: (updatedUser as any).subscription_plan
        }
      })
    });
  } catch (error) {
    console.error('Error pausing Razorpay subscription:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to pause Razorpay subscription'
    });
  }
};

export const resumeRazorpaySubscription = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { subscriptionId } = req.params;
    const { resolvedUserId, cleanBody } = parseUserContext(req);
    const payload = cleanBody && Object.keys(cleanBody).length > 0 ? cleanBody : { resume_at: 'now' };
    const result = await resumeRazorpaySubscriptionService(subscriptionId, payload);

    const updatedUser = await syncUserSubscriptionState({
      userId: resolvedUserId,
      subscriptionId: getRazorpaySubscriptionId((result as any)?.id, subscriptionId),
      subscriptionStatus: mapRazorpayStatusToUserStatus((result as any)?.status) || 'ACTIVE',
      currentPlan: inferPlanFromCandidates(
        (cleanBody as any)?.plan_name,
        (cleanBody as any)?.planName,
        (cleanBody as any)?.currentPlan,
        (cleanBody as any)?.subscription_plan,
        (cleanBody as any)?.plan_id,
        (result as any)?.plan_name,
        (result as any)?.planName,
        (result as any)?.plan_id
      )
    });

    res.json({
      success: true,
      data: result,
      ...(updatedUser && {
        user: {
          user_id: updatedUser._id,
          subscriptionId: updatedUser.subscriptionId,
          subscriptionStatus: updatedUser.subscriptionStatus,
          currentPlan: (updatedUser as any).currentPlan,
          subscription_plan: (updatedUser as any).subscription_plan
        }
      })
    });
  } catch (error) {
    console.error('Error resuming Razorpay subscription:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to resume Razorpay subscription'
    });
  }
};

export const fetchRazorpaySubscriptionInvoices = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { subscriptionId } = req.params;
    const result = await fetchRazorpayInvoicesForSubscriptionService(subscriptionId, parsePaginationQuery(req));

    const { resolvedUserId } = parseUserContext(req);
    const updatedUser = await syncUserSubscriptionState({
      userId: resolvedUserId,
      subscriptionId: getRazorpaySubscriptionId(subscriptionId)
    });

    res.json({
      success: true,
      data: result,
      ...(updatedUser && {
        user: {
          user_id: updatedUser._id,
          subscriptionId: updatedUser.subscriptionId,
          subscriptionStatus: updatedUser.subscriptionStatus,
          currentPlan: (updatedUser as any).currentPlan,
          subscription_plan: (updatedUser as any).subscription_plan
        }
      })
    });
  } catch (error) {
    console.error('Error fetching Razorpay subscription invoices:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch Razorpay subscription invoices'
    });
  }
};

// Get user's credit information
export const getUserCredits = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    // Check if credits need to be reset
    await CreditService.checkAndResetCreditsIfNeeded(userId);

    const creditInfo = await CreditService.getUserCredits(userId);
    if (!creditInfo) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: creditInfo
    });
  } catch (error) {
    console.error('Error getting user credits:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user credits'
    });
  }
};

// Razorpay webhook handler for payment confirmation
export const razorpayWebhook = async (req: Request, res: Response) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || 'your_webhook_secret';

    // Get the signature from headers
    const signature = req.headers['x-razorpay-signature'] as string;

    const isTestWebhook = !env.isProduction && req.headers['x-test-webhook'] === 'true';

    if (!signature && !isTestWebhook) {
      return res.status(400).json({
        success: false,
        error: 'Missing Razorpay signature'
      });
    }

    // Parse the raw body (Buffer) to JSON
    let webhookBody: any;
    try {
      if (Buffer.isBuffer(req.body)) {
        webhookBody = JSON.parse(req.body.toString());
      } else {
        webhookBody = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      }
    } catch (error) {
      console.error('Failed to parse webhook body:', error);
      return res.status(400).json({
        success: false,
        error: 'Invalid JSON body'
      });
    }

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(req.body.toString())
      .digest('hex');

    if (signature !== expectedSignature && !isTestWebhook) {
      console.error('Invalid webhook signature');
      return res.status(400).json({
        success: false,
        error: 'Invalid signature'
      });
    }

    const event = webhookBody.event;
    const paymentEntity = webhookBody.payload?.payment?.entity;

    console.log(`Received Razorpay webhook: ${event}`, {
      paymentId: paymentEntity.id,
      orderId: paymentEntity.order_id,
      status: paymentEntity.status
    });

    switch (event) {
      case 'payment.captured':
        await handlePaymentCaptured(paymentEntity);
        break;

      case 'payment.failed':
        await handlePaymentFailed(paymentEntity);
        break;

      case 'order.paid':
        await handleOrderPaid(webhookBody.payload?.order?.entity);
        break;

      default:
        console.log(`Unhandled webhook event: ${event}`);
    }

    // Always return 200 to acknowledge receipt
    res.status(200).json({ success: true });

  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({
      success: false,
      error: 'Webhook processing failed'
    });
  }
};

// Handle payment captured event
const handlePaymentCaptured = async (paymentEntity: any) => {
  try {
    const orderId = paymentEntity.order_id;
    const paymentId = paymentEntity.id;
    const amount = paymentEntity.amount / 100; // Convert from paisa to rupees

    // Find and update the payment record
    const paymentRecord = await payment.findOneAndUpdate(
      { razorpayOrderId: orderId },
      {
        status: 'COMPLETED',
        razorpayPaymentId: paymentId,
        razorpaySignature: paymentEntity.signature || 'webhook_signature',
        amount: amount
      },
      { new: true }
    );

    if (!paymentRecord) {
      console.error(`Payment record not found for order: ${orderId}`);
      return;
    }

    // Get plan details from payment metadata
    const planId = paymentRecord.metadata?.planId;
    const plan = getPlanById(planId);

    if (!plan) {
      console.error(`Plan not found: ${planId}`);
      return;
    }

    // Update user subscription
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1); // Monthly subscription

    // Create or update subscription
    const subscriptionData = {
      userId: paymentRecord.userId,
      planId,
      plan,
      status: 'ACTIVE',
      startDate,
      endDate,
      nextBillingDate: endDate,
      creditsRemaining: plan.features.credits === 'UNLIMITED' ? 999999 : plan.features.credits,
      creditsUsedThisMonth: 0,
      lastCreditReset: startDate,
      autoRenew: true
    };

    let userSubscription = await subscription.findOneAndUpdate(
      { userId: paymentRecord.userId },
      subscriptionData,
      { upsert: true, new: true }
    );

    // Update user record
    await User.findByIdAndUpdate(paymentRecord.userId, {
      currentPlan: plan.name,
      subscriptionId: userSubscription._id,
      subscriptionStatus: 'ACTIVE',
      creditsRemaining: plan.features.credits === 'UNLIMITED' ? 999999 : plan.features.credits,
      lastPlanUpdate: new Date()
    });

    console.log(`Subscription activated for user ${paymentRecord.userId}: ${plan.name}`);

  } catch (error) {
    console.error('Error handling payment captured:', error);
  }
};

// Handle payment failed event
const handlePaymentFailed = async (paymentEntity: any) => {
  try {
    const orderId = paymentEntity.order_id;

    // Update payment status to failed
    await payment.findOneAndUpdate(
      { razorpayOrderId: orderId },
      {
        status: 'FAILED',
        razorpayPaymentId: paymentEntity.id
      }
    );

    console.log(`Payment failed for order: ${orderId}`);

  } catch (error) {
    console.error('Error handling payment failed:', error);
  }
};

// Handle order paid event
const handleOrderPaid = async (orderEntity: any) => {
  try {
    const orderId = orderEntity.id;

    // Find the payment record and ensure it's marked as completed
    const paymentRecord = await payment.findOne({ razorpayOrderId: orderId });

    if (paymentRecord && paymentRecord.status !== 'COMPLETED') {
      await payment.findOneAndUpdate(
        { razorpayOrderId: orderId },
        { status: 'COMPLETED' }
      );

      console.log(`Order marked as paid: ${orderId}`);
    }

  } catch (error) {
    console.error('Error handling order paid:', error);
  }
};

// Initialize default plans (run once during setup)
export const initializePlans = async () => {
  try {
    for (const plan of PREDEFINED_PLANS) {
      await subscriptionPlan.findOneAndUpdate(
        { id: plan.id },
        plan,
        { upsert: true, new: true }
      );
    }
    console.log('Plans initialized successfully');
  } catch (error) {
    console.error('Error initializing plans:', error);
  }
};
