import { user as User } from '../models/auth';
import { subscription } from '../models/subscription';
import { PREDEFINED_PLANS } from '../models/subscription';
import { SubscriptionPlan } from '../types';

export class CreditService {
  /**
   * Reset monthly credits for all users based on their current plan
   * This should be called monthly via a cron job
   */
  static async resetMonthlyCredits(): Promise<void> {
    try {
      console.log('Starting monthly credit reset...');

      // Get all users with active subscriptions
      const users = await User.find({
        subscriptionStatus: 'ACTIVE',
        currentPlan: { $in: ['SILVER', 'GOLD', 'PREMIUM'] }
      });

      let resetCount = 0;

      for (const user of users) {
        const plan = PREDEFINED_PLANS.find(p => p.name === user.currentPlan);
        if (!plan) continue;

        const newCredits = plan.features.credits === 'UNLIMITED' ? 999999 : plan.features.credits;

        // Update user credits
        await User.findByIdAndUpdate(user._id, {
          creditsRemaining: newCredits,
          lastPlanUpdate: new Date()
        });

        // Update subscription record
        await subscription.findOneAndUpdate(
          { userId: user.id },
          {
            creditsRemaining: newCredits,
            creditsUsedThisMonth: 0,
            lastCreditReset: new Date()
          }
        );

        resetCount++;
      }

      console.log(`Monthly credit reset completed. ${resetCount} users updated.`);
    } catch (error) {
      console.error('Error resetting monthly credits:', error);
      throw error;
    }
  }

  /**
   * Check if user has sufficient credits for an operation
   */
  static async hasCredits(userId: string, requiredCredits: number = 1): Promise<boolean> {
    try {
      const user = await User.findById(userId);
      if (!user) return false;

      // Premium plan has unlimited credits
      if (user.currentPlan === 'PREMIUM') return true;

      // Bronze plan has no credits
      if (user.currentPlan === 'BRONZE') return false;

      return (user.creditsRemaining || 0) >= requiredCredits;
    } catch (error) {
      console.error('Error checking user credits:', error);
      return false;
    }
  }

  /**
   * Deduct credits from user's account
   */
  static async deductCredits(userId: string, creditsToDeduct: number = 1): Promise<boolean> {
    try {
      const user = await User.findById(userId);
      if (!user) return false;

      // Premium plan has unlimited credits - no need to deduct
      if (user.currentPlan === 'PREMIUM') return true;

      // Bronze plan has no credits
      if (user.currentPlan === 'BRONZE') return false;

      const currentCredits = user.creditsRemaining || 0;
      if (currentCredits < creditsToDeduct) return false;

      // Update user credits
      await User.findByIdAndUpdate(userId, {
        $inc: { creditsRemaining: -creditsToDeduct }
      });

      // Update subscription record
      await subscription.findOneAndUpdate(
        { userId },
        {
          $inc: {
            creditsRemaining: -creditsToDeduct,
            creditsUsedThisMonth: creditsToDeduct
          }
        }
      );

      return true;
    } catch (error) {
      console.error('Error deducting credits:', error);
      return false;
    }
  }

  /**
   * Get user's current credit information
   */
  static async getUserCredits(userId: string): Promise<{
    currentPlan: SubscriptionPlan;
    creditsRemaining: number;
    creditsUsedThisMonth: number;
    lastReset: Date | null;
    isUnlimited: boolean;
  } | null> {
    try {
      const user = await User.findById(userId);
      if (!user) return null;

      const userSubscription = await subscription.findOne({ userId });

      const isUnlimited = user.currentPlan === 'PREMIUM';

      return {
        currentPlan: user.currentPlan || 'BRONZE',
        creditsRemaining: user.creditsRemaining || 0,
        creditsUsedThisMonth: userSubscription?.creditsUsedThisMonth || 0,
        lastReset: userSubscription?.lastCreditReset || null,
        isUnlimited
      };
    } catch (error) {
      console.error('Error getting user credits:', error);
      return null;
    }
  }

  /**
   * Add credits to user's account (for admin purposes or bonuses)
   */
  static async addCredits(userId: string, creditsToAdd: number): Promise<boolean> {
    try {
      const user = await User.findById(userId);
      if (!user) return false;

      // Update user credits
      await User.findByIdAndUpdate(userId, {
        $inc: { creditsRemaining: creditsToAdd }
      });

      // Update subscription record
      await subscription.findOneAndUpdate(
        { userId },
        {
          $inc: { creditsRemaining: creditsToAdd }
        }
      );

      return true;
    } catch (error) {
      console.error('Error adding credits:', error);
      return false;
    }
  }

  /**
   * Check if user's credits need to be reset (called on login or periodic checks)
   */
  static async checkAndResetCreditsIfNeeded(userId: string): Promise<void> {
    try {
      const userSubscription = await subscription.findOne({ userId });
      if (!userSubscription) return;

      const now = new Date();
      const lastReset = userSubscription.lastCreditReset;
      const daysSinceReset = Math.floor((now.getTime() - lastReset.getTime()) / (1000 * 60 * 60 * 24));

      // Reset credits monthly (approximately 30 days)
      if (daysSinceReset >= 30) {
        const plan = PREDEFINED_PLANS.find(p => p.name === userSubscription.plan.name);
        if (!plan) return;

        const newCredits = plan.features.credits === 'UNLIMITED' ? 999999 : plan.features.credits;

        await User.findByIdAndUpdate(userId, {
          creditsRemaining: newCredits,
          lastPlanUpdate: new Date()
        });

        await subscription.findByIdAndUpdate(userSubscription._id, {
          creditsRemaining: newCredits,
          creditsUsedThisMonth: 0,
          lastCreditReset: new Date()
        });

        console.log(`Credits reset for user ${userId}: ${newCredits} credits`);
      }
    } catch (error) {
      console.error('Error checking credit reset:', error);
    }
  }

  /**
   * Get credit usage statistics for admin purposes
   */
  static async getCreditUsageStats(): Promise<{
    totalUsers: number;
    usersByPlan: Record<string, number>;
    totalCreditsUsedThisMonth: number;
    averageCreditsPerUser: number;
  }> {
    try {
      const users = await User.find({
        currentPlan: { $in: ['SILVER', 'GOLD', 'PREMIUM'] }
      });

      const subscriptions = await subscription.find({
        status: 'ACTIVE'
      });

      const planCounts: Record<string, number> = {};
      let totalCreditsUsed = 0;

      users.forEach((user: any) => {
        const plan = user.currentPlan || 'BRONZE';
        planCounts[plan] = (planCounts[plan] || 0) + 1;
      });

      subscriptions.forEach(sub => {
        totalCreditsUsed += sub.creditsUsedThisMonth;
      });

      return {
        totalUsers: users.length,
        usersByPlan: planCounts,
        totalCreditsUsedThisMonth: totalCreditsUsed,
        averageCreditsPerUser: users.length > 0 ? totalCreditsUsed / users.length : 0
      };
    } catch (error) {
      console.error('Error getting credit usage stats:', error);
      throw error;
    }
  }
}
