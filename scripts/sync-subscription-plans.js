/**
 * Migration Script: Sync subscription_plan with currentPlan
 *
 * This script fixes the data inconsistency where subscription_plan and currentPlan
 * have different values. After running this, they will always be in sync.
 *
 * Usage: node scripts/sync-subscription-plans.js
 */

const mongoose = require('mongoose');
const path = require('path');

// Connect to MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/phyo';

async function syncPlans() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    // Find all users where subscription_plan !== currentPlan
    console.log('\n🔍 Finding inconsistent records...');
    const inconsistent = await usersCollection
      .find({
        $expr: { $ne: ['$subscription_plan', '$currentPlan'] }
      })
      .toArray();

    console.log(`Found ${inconsistent.length} records with mismatched plans\n`);

    if (inconsistent.length === 0) {
      console.log('✅ All records are already consistent!');
      await mongoose.connection.close();
      return;
    }

    // Show some examples
    console.log('Examples of inconsistencies:');
    inconsistent.slice(0, 3).forEach(user => {
      console.log(`  - ${user.email}: currentPlan="${user.currentPlan}" vs subscription_plan="${user.subscription_plan}"`);
    });
    console.log('');

    // Fix by setting subscription_plan = currentPlan
    console.log('🔧 Syncing subscription_plan with currentPlan...');
    const result = await usersCollection.updateMany(
      {
        $expr: { $ne: ['$subscription_plan', '$currentPlan'] }
      },
      [
        {
          $set: {
            subscription_plan: '$currentPlan'
          }
        }
      ]
    );

    console.log(`✅ Updated ${result.modifiedCount} records`);
    console.log(`   - Matched: ${result.matchedCount}`);
    console.log(`   - Modified: ${result.modifiedCount}`);

    // Verify the fix
    console.log('\n🔍 Verifying fix...');
    const stillInconsistent = await usersCollection
      .find({
        $expr: { $ne: ['$subscription_plan', '$currentPlan'] }
      })
      .toArray();

    if (stillInconsistent.length === 0) {
      console.log('✅ All records are now consistent!');
    } else {
      console.log(`⚠️  Warning: ${stillInconsistent.length} records still inconsistent`);
    }

    console.log('\n✅ Migration complete!');
    await mongoose.connection.close();

  } catch (error) {
    console.error('❌ Error during migration:', error);
    process.exit(1);
  }
}

syncPlans();
