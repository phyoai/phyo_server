const mongoose = require('mongoose');
const { user: User } = require('../models/auth');

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/phyo';

async function testUserFind() {
  try {
    await mongoose.connect(mongoUri);
    console.log('✓ Connected to MongoDB');

    // Test 1: Find all BRAND users
    console.log('\n1. Testing User.find({type: "BRAND", isApproved: true}):');
    const brands = await User.find({ type: 'BRAND', isApproved: true });
    console.log(`   Found ${brands.length} brands`);
    brands.slice(0, 3).forEach((b, i) => {
      console.log(`   ${i + 1}. ${b.name} (${b.email})`);
    });

    // Test 2: Count brands
    console.log('\n2. Testing User.countDocuments({type: "BRAND", isApproved: true}):');
    const count = await User.countDocuments({ type: 'BRAND', isApproved: true });
    console.log(`   Count: ${count}`);

    // Test 3: Find with lean()
    console.log('\n3. Testing User.find().lean():');
    const brandsLean = await User.find({ type: 'BRAND', isApproved: true }).lean();
    console.log(`   Found ${brandsLean.length} brands with lean()`);

    // Test 4: Check if User model has the methods
    console.log('\n4. User model methods:');
    console.log(`   - User.find: ${typeof User.find}`);
    console.log(`   - User.countDocuments: ${typeof User.countDocuments}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testUserFind();
