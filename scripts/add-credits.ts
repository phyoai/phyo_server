import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Import the User model
import '../src/models/auth'; // This will register the schema
const User = mongoose.model('User');

/**
 * Script to manually add credits to a user account
 * Usage: ts-node scripts/add-credits.ts <email> <credits>
 */
async function addCreditsToUser(email: string, creditsToAdd: number) {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MONGO_URI not found in environment variables');
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✓ Connected to MongoDB\n');

    // Find the user
    console.log(`Looking for user with email: ${email}`);
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      console.error(`✗ User not found with email: ${email}`);
      process.exit(1);
    }

    console.log(`✓ User found: ${user.email}`);
    console.log(`  - Current Plan: ${user.currentPlan}`);
    console.log(`  - Current Credits: ${user.creditsRemaining}`);
    console.log(`  - User Type: ${user.type}`);

    // Add credits
    const oldCredits = user.creditsRemaining || 0;
    const newCredits = oldCredits + creditsToAdd;
    
    user.creditsRemaining = newCredits;
    await user.save();

    console.log(`\n✓ Credits updated successfully!`);
    console.log(`  - Old Credits: ${oldCredits}`);
    console.log(`  - Added: +${creditsToAdd}`);
    console.log(`  - New Credits: ${newCredits}`);

    // Disconnect
    await mongoose.disconnect();
    console.log('\n✓ Disconnected from MongoDB');
    process.exit(0);

  } catch (error) {
    console.error('\n✗ Error:', error instanceof Error ? error.message : error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Get command line arguments
const args = process.argv.slice(2);

if (args.length < 2) {
  console.log('Usage: ts-node scripts/add-credits.ts <email> <credits>');
  console.log('Example: ts-node scripts/add-credits.ts user@example.com 10000');
  process.exit(1);
}

const email = args[0];
const credits = parseInt(args[1], 10);

if (isNaN(credits) || credits <= 0) {
  console.error('Error: Credits must be a positive number');
  process.exit(1);
}

// Run the script
addCreditsToUser(email, credits);
