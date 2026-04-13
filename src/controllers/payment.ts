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
    const payload = req.body;
    if (!payload || !payload.plan_id || !payload.total_count) {
      return res.status(400).json({
        success: false,
        error: 'plan_id and total_count are required'
      });
    }

    const result = await createRazorpaySubscriptionService(payload);
    res.json({
      success: true,
      data: result
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
    const payload = req.body;
    const result = await createRazorpaySubscriptionLinkService(payload);
    res.json({
      success: true,
      data: result
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
    res.json({
      success: true,
      data: result
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
    res.json({
      success: true,
      data: result
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
    const cancelAtCycleEnd = parseBoolean(
      req.body?.cancel_at_cycle_end ?? req.query.cancel_at_cycle_end,
      false
    );

    const result = await cancelRazorpaySubscriptionService(subscriptionId, cancelAtCycleEnd);
    res.json({
      success: true,
      data: result
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
    const payload = req.body;
    if (!payload || Object.keys(payload).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Request body is required'
      });
    }

    const result = await updateRazorpaySubscriptionService(subscriptionId, payload);
    res.json({
      success: true,
      data: result
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
    res.json({
      success: true,
      data: result
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
    res.json({
      success: true,
      data: result
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
    const payload = req.body && Object.keys(req.body).length > 0 ? req.body : { pause_at: 'now' };
    const result = await pauseRazorpaySubscriptionService(subscriptionId, payload);
    res.json({
      success: true,
      data: result
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
    const payload = req.body && Object.keys(req.body).length > 0 ? req.body : { resume_at: 'now' };
    const result = await resumeRazorpaySubscriptionService(subscriptionId, payload);
    res.json({
      success: true,
      data: result
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
    res.json({
      success: true,
      data: result
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
