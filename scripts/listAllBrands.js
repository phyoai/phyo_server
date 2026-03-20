require('dotenv').config();
const mongoose = require('mongoose');

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/phyo';

async function listBrands() {
  try {
    await mongoose.connect(mongoUri);
    console.log('✓ Connected to MongoDB');
    console.log('Using URI:', mongoUri.substring(0, 80) + '...');

    const collection = mongoose.connection.collection('users');

    // Get ALL BRAND users
    console.log('\n📋 All BRAND type users:');
    const brands = await collection.find({ type: 'BRAND' }).toArray();
    console.log(`Total BRAND users: ${brands.length}`);

    brands.forEach((b, i) => {
      console.log(`  ${i + 1}. ${b.name || 'N/A'} | email: ${b.email || 'N/A'} | isApproved: ${b.isApproved}`);
    });

    // Count BRAND + isApproved
    const approvedCount = await collection.countDocuments({ type: 'BRAND', isApproved: true });
    console.log(`\nBRAND + isApproved=true: ${approvedCount}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

listBrands();
