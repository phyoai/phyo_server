import { Response, NextFunction } from 'express';
import { user as User } from '../models/auth';
import { subscription } from '../models/subscription';
import { AuthenticatedRequest, SubscriptionPlan } from '../types';

// Define feature access requirements
const FEATURE_REQUIREMENTS = {
  creatorSearch: ['BRONZE', 'SILVER', 'GOLD', 'PREMIUM'],
  creatorInsightsBasic: ['BRONZE'],
  creatorInsightsAdvanced: ['SILVER', 'GOLD', 'PREMIUM'],
  advancedFilters: ['SILVER', 'GOLD', 'PREMIUM'],
  audienceBasedSearch: ['SILVER', 'GOLD', 'PREMIUM'],
  historicalCost: ['SILVER', 'GOLD', 'PREMIUM'],
  preCuratedList: ['SILVER', 'GOLD', 'PREMIUM'],
  brandAnalysis: ['SILVER', 'GOLD', 'PREMIUM'],
  costingInsights: ['SILVER', 'GOLD', 'PREMIUM'],
  openAccessInfluencerDatabase: ['SILVER', 'GOLD', 'PREMIUM'],
  campaignReports: ['SILVER', 'GOLD', 'PREMIUM'],
  roleBasedAccess: ['GOLD', 'PREMIUM'],
  volumeBasedDiscount: ['GOLD', 'PREMIUM'],
  platformTraining: ['GOLD', 'PREMIUM'],
  dedicatedCustomerSuccess: ['GOLD', 'PREMIUM']
};

// Check if user's plan allows a specific feature
export const checkFeatureAccess = (userPlan: SubscriptionPlan, feature: keyof typeof FEATURE_REQUIREMENTS): boolean => {
  return FEATURE_REQUIREMENTS[feature].includes(userPlan);
};

// Middleware to check plan-based access for features
export const requireFeatureAccess = (feature: keyof typeof FEATURE_REQUIREMENTS) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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

      // INFLUENCERS have unlimited access - bypass all restrictions
      if (user.type === 'INFLUENCER') {
        next();
        return;
      }

      const userPlan = user.currentPlan || 'BRONZE';

      if (!checkFeatureAccess(userPlan, feature)) {
        return res.status(403).json({
          success: false,
          error: `This feature requires a higher plan. Current plan: ${userPlan}`,
          requiredPlans: FEATURE_REQUIREMENTS[feature],
          upgradeRequired: true
        });
      }

      next();
    } catch (error) {
      console.error('Error checking feature access:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check feature access'
      });
    }
  };
};

// Middleware to check credit availability for operations
export const requireCredits = (creditsRequired: number = 1) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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

      // INFLUENCERS have unlimited credits - bypass all restrictions
      if (user.type === 'INFLUENCER') {
        next();
        return;
      }

      // If subscription is CANCELLED, downgrade to BRONZE (free plan)
      let userPlan = user.currentPlan || 'BRONZE';
      if (user.subscriptionStatus === 'CANCELLED') {
        console.log(`⚠️  Subscription CANCELLED for ${user.email} - using BRONZE plan`);
        userPlan = 'BRONZE';
        // Optionally reset currentPlan to BRONZE in database
        if (user.currentPlan !== 'BRONZE') {
          await User.findByIdAndUpdate(userId, { currentPlan: 'BRONZE' });
        }
      }

      // Premium plan has unlimited credits
      if (userPlan === 'PREMIUM') {
        next();
        return;
      }

      // Check if user has enough credits (including trial credits)
      let currentCredits = user.creditsRemaining || 0;

      // DEMO MODE: Give users 10 demo credits on first use if they have 0 credits
      // This applies to all plans with cancelled subscriptions or 0 credits
      if (currentCredits === 0 && !user.demoCreditsUsed) {
        console.log(`🎁 Granting 10 demo credits to ${userPlan} user: ${user.email}`);
        currentCredits = 10;
        user.creditsRemaining = 10;
        user.demoCreditsUsed = true;
        await user.save();
      }

      if (currentCredits < creditsRequired) {
        return res.status(403).json({
          success: false,
          error: userPlan === 'BRONZE'
            ? 'No free searches remaining. Please upgrade your plan for more credits.'
            : 'Insufficient credits for this operation',
          creditsRequired,
          currentCredits,
          upgradeRequired: true
        });
      }

      next();
    } catch (error) {
      console.error('Error checking credits:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check credits'
      });
    }
  };
};

// Middleware to deduct credits after successful operation
export const deductCredits = (creditsToDeduct: number = 1) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const originalJson = res.json;
    res.json = function(data: any) {
      // Only deduct credits if the operation was successful
      // Skip deduction for INFLUENCER type users (they have unlimited)
      if (data.success !== false && req.user?.id) {
        User.findById(req.user.id).then((user: any) => {
          // Don't deduct credits from influencers
          if (user && user.type !== 'INFLUENCER') {
            User.findByIdAndUpdate(req.user!.id, {
              $inc: { creditsRemaining: -creditsToDeduct }
            }).catch((error: unknown) => {
              console.error('Error deducting credits:', error);
            });

            // Also update subscription record
            subscription.findOneAndUpdate(
              { userId: req.user!.id },
              { $inc: { creditsRemaining: -creditsToDeduct, creditsUsedThisMonth: creditsToDeduct } }
            ).catch((error: unknown) => {
              console.error('Error updating subscription credits:', error);
            });
          }
        }).catch((error: unknown) => {
          console.error('Error checking user type:', error);
        });
      }

      return originalJson.call(this, data);
    };

    next();
  };
};

export const addCredits = (creditsToAdd: number = 1) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const originalJson = res.json;

    res.json = function (data: any) {
      // Only add credits if the operation was successful
      if (data.success !== false && req.user?.id) {
        User.findById(req.user.id)
          .then((user: any) => {
            // Skip for influencers if you still want them unlimited / unaffected
            if (user && user.type !== "INFLUENCER") {
              User.findByIdAndUpdate(req.user!.id, {
                $inc: { creditsRemaining: creditsToAdd },
              }).catch((error: unknown) => {
                console.error("Error adding credits to user:", error);
              });

              // Also update subscription record
              subscription
                .findOneAndUpdate(
                  { userId: req.user!.id },
                  {
                    $inc: {
                      creditsRemaining: creditsToAdd,
                      // if you want to track purchased/added credits separately,
                      // create another field like creditsAddedThisMonth
                    },
                  }
                )
                .catch((error: unknown) => {
                  console.error("Error updating subscription credits:", error);
                });
            }
          })
          .catch((error: unknown) => {
            console.error("Error checking user type:", error);
          });
      }

      return originalJson.call(this, data);
    };

    next();
  };
};

// Middleware to check minimum plan requirement
export const requireMinimumPlan = (minimumPlan: SubscriptionPlan) => {
  const planHierarchy: Record<SubscriptionPlan, number> = {
    'BRONZE': 1,
    'SILVER': 2,
    'GOLD': 3,
    'PREMIUM': 4
  };

  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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

      // INFLUENCERS bypass all plan restrictions
      if (user.type === 'INFLUENCER') {
        next();
        return;
      }

      const userPlan = (user.currentPlan || 'BRONZE') as SubscriptionPlan;
      const userLevel = planHierarchy[userPlan];
      const requiredLevel = planHierarchy[minimumPlan];

      if (userLevel < requiredLevel) {
        return res.status(403).json({
          success: false,
          error: `This feature requires ${minimumPlan} plan or higher. Current plan: ${userPlan}`,
          currentPlan: userPlan,
          requiredPlan: minimumPlan,
          upgradeRequired: true
        });
      }

      next();
    } catch (error) {
      console.error('Error checking minimum plan:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check plan requirements'
      });
    }
  };
};

// Helper function to get user's current plan and credits info
export const getUserPlanInfo = async (userId: string) => {
  try {
    const user = await User.findById(userId);
    if (!user) return null;

    let subscriptionInfo = null;
    if (user.subscriptionId) {
      subscriptionInfo = await subscription.findById(user.subscriptionId);
    }

    return {
      currentPlan: user.currentPlan || 'BRONZE',
      subscriptionStatus: user.subscriptionStatus || 'ACTIVE',
      creditsRemaining: user.creditsRemaining || 0,
      subscription: subscriptionInfo,
      isActive: user.subscriptionStatus === 'ACTIVE'
    };
  } catch (error) {
    console.error('Error getting user plan info:', error);
    return null;
  }
};
