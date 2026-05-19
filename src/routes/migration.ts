import express from 'express';
import { user as User } from '../models/auth';

const router = express.Router();
const FIRST_SIGNUP_CREDITS = 10;

// One-time migration to fix users who were affected by the infinite credits bug
router.post('/fix-trial-credits', async (req, res) => {
  try {
    // Find all Bronze users who have credits but no trialCreditsGiven flag
    const affectedUsers = await User.find({
      currentPlan: 'BRONZE',
      trialCreditsGiven: { $exists: false },
      creditsRemaining: { $gt: 0 }
    });

    console.log(`Found ${affectedUsers.length} users affected by the infinite credits bug`);

    let fixedCount = 0;
    
    for (const user of affectedUsers) {
      // Check the user's creation date
      const userCreatedAt = new Date(user.createdAt || 0);
      const now = new Date();
      const daysSinceCreation = Math.floor((now.getTime() - userCreatedAt.getTime()) / (24 * 60 * 60 * 1000));
      
      console.log(`User ${user.email}: created ${daysSinceCreation} days ago, has ${user.creditsRemaining} credits`);
      
      // If user was created recently (less than 1 day ago), they might be legitimately new
      if (daysSinceCreation < 1) {
        user.trialCreditsGiven = true; // Mark as given, keep their credits
        console.log(`  → Keeping credits for new user: ${user.email}`);
      } else {
        // For older users, they've likely been affected by the bug
        user.creditsRemaining = 0; // Reset to 0
        user.trialCreditsGiven = true; // Mark as already given
        console.log(`  → Reset credits for existing user: ${user.email}`);
      }
      
      await user.save();
      fixedCount++;
    }

    // Also fix users who have the flag set to false but have credits above initial signup credits
    const overCreditedUsers = await User.find({
      currentPlan: 'BRONZE',
      creditsRemaining: { $gt: FIRST_SIGNUP_CREDITS }
    });

    for (const user of overCreditedUsers) {
      console.log(`User ${user.email}: has ${user.creditsRemaining} credits (more than ${FIRST_SIGNUP_CREDITS})`);
      user.creditsRemaining = 0; // Reset to 0 since they've likely abused the bug
      user.trialCreditsGiven = true;
      await user.save();
      fixedCount++;
    }

    res.json({
      success: true,
      message: `Fixed ${fixedCount} users affected by the infinite credits bug`,
      affectedUsers: affectedUsers.length,
      overCreditedUsers: overCreditedUsers.length
    });

  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
