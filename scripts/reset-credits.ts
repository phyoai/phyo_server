import 'dotenv/config';
import { connectToMongo } from '../src/connections/db';
import { CreditService } from '../src/services/credit';

/**
 * Script to reset monthly credits for all users
 * Should be run monthly via cron job
 */
async function resetCredits() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MONGO_URI environment variable is required');
    }

    await connectToMongo(mongoUri);
    console.log('Connected to MongoDB');

    // Reset credits for all users
    await CreditService.resetMonthlyCredits();
    console.log('Credit reset completed successfully');

    process.exit(0);
  } catch (error) {
    console.error('Error resetting credits:', error);
    process.exit(1);
  }
}

// Run the script
resetCredits();
