import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Import the User model
import '../src/models/auth';
const User = mongoose.model('User');

/**
 * Quick script to add 10,000 credits to the test user
 * Email: sapaye4969@httpsu.com
 */
async function addTestCredits() {
  try {
    const email = 'sapaye4969@httpsu.com';
    const creditsToAdd = 10000;

    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MONGO_URI not found in environment variables');
    }

    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✓ Connected to MongoDB\n');

    // Find the user
    console.log(`🔍 Looking for user: ${email}`);
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      console.error(`❌ User not found with email: ${email}`);
      console.log('\n💡 Please make sure the user exists first by logging in or registering.');
      await mongoose.disconnect();
      process.exit(1);
    }

    console.log(`✅ User found!`);
    console.log(`   📧 Email: ${user.email}`);
    console.log(`   👤 Type: ${user.type}`);
    console.log(`   📦 Current Plan: ${user.currentPlan}`);
    console.log(`   💰 Current Credits: ${user.creditsRemaining}`);

    // Add credits
    const oldCredits = user.creditsRemaining || 0;
    const newCredits = oldCredits + creditsToAdd;
    
    user.creditsRemaining = newCredits;
    await user.save();

    console.log(`\n🎉 SUCCESS! Credits updated!`);
    console.log(`   Old Credits: ${oldCredits}`);
    console.log(`   Added: +${creditsToAdd}`);
    console.log(`   New Credits: ${newCredits}`);
    console.log(`\n✨ You can now use these ${newCredits} credits for testing!`);

    // Disconnect
    await mongoose.disconnect();
    console.log('\n✓ Disconnected from MongoDB');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the script
addTestCredits();
