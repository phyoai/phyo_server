const mongoose = require('mongoose');
const { user: User } = require('../models/auth');

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/phyo';

async function debugBrands() {
  try {
    await mongoose.connect(mongoUri);
    console.log('✓ Connected to MongoDB');

    // Check collection directly
    console.log('\n📋 Direct collection query (all users):');
    const allUsers = await mongoose.connection.collection('users').find({}).toArray();
    console.log(`Total users in collection: ${allUsers.length}`);

    allUsers.forEach((user, i) => {
      console.log(`  ${i + 1}. ${user.name || 'N/A'} | type: ${user.type || 'undefined'} | isApproved: ${user.isApproved}`);
    });

    // Check for BRAND type specifically
    console.log('\n🏢 Looking for BRAND type users:');
    const brands = await mongoose.connection.collection('users').find({ type: 'BRAND' }).toArray();
    console.log(`Found ${brands.length} BRAND type users`);
    brands.forEach((brand, i) => {
      console.log(`  ${i + 1}. ${brand.name} | isApproved: ${brand.isApproved}`);
    });

    // Check for BRAND + isApproved
    console.log('\n✅ Looking for BRAND + isApproved=true:');
    const approvedBrands = await mongoose.connection.collection('users').find({ type: 'BRAND', isApproved: true }).toArray();
    console.log(`Found ${approvedBrands.length} approved BRAND users`);
    approvedBrands.forEach((brand, i) => {
      console.log(`  ${i + 1}. ${brand.name} (${brand.email})`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

debugBrands();
