const mongoose = require('mongoose');

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/phyo';

async function fixBrandApproval() {
  try {
    await mongoose.connect(mongoUri);
    console.log('✓ Connected to MongoDB');

    const collection = mongoose.connection.collection('users');

    // Check current status
    console.log('\n📋 Current BRAND status:');
    const brands = await collection.find({ type: 'BRAND' }).toArray();
    console.log(`Found ${brands.length} BRAND users:`);
    brands.forEach(b => {
      console.log(`  - ${b.name || 'N/A'} | isApproved: ${b.isApproved}`);
    });

    // Update all BRAND users to have isApproved=true
    console.log('\n🔄 Updating BRAND users to isApproved=true...');
    const result = await collection.updateMany(
      { type: 'BRAND' },
      { $set: { isApproved: true } }
    );
    console.log(`   Updated ${result.modifiedCount} documents`);

    // Verify
    console.log('\n✅ Verification:');
    const approvedCount = await collection.countDocuments({ type: 'BRAND', isApproved: true });
    console.log(`   BRAND users with isApproved=true: ${approvedCount}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixBrandApproval();
