const mongoose = require('mongoose');
const Campaign = require('../models/campaign');
const { brand: Brand } = require('../models/auth');

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/phyo';

async function fixCampaignBrands() {
  try {
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✓ Connected to MongoDB');

    // Get or create a default brand
    let brand = await Brand.findOne({ isApproved: true });
    if (!brand) {
      console.log('\n📢 Creating default brand...');
      brand = await Brand.create({
        name: 'Default Brand',
        companyName: 'Default Brand Company',
        email: 'default@brand.com',
        isApproved: true,
        avatar: 'https://via.placeholder.com/300?text=Default+Brand',
        password: 'dummy'
      });
      console.log(`✓ Created brand: ${brand.name}`);
    } else {
      console.log(`\n✓ Using existing brand: ${brand.companyName}`);
    }

    // Update all campaigns without brandId
    console.log('\n🔄 Updating campaigns without brandId...');
    const result = await Campaign.updateMany(
      { brandId: { $exists: false } },
      { $set: { brandId: brand._id } }
    );
    console.log(`✓ Updated ${result.modifiedCount} campaigns`);

    // Also update campaigns with null brandId
    const result2 = await Campaign.updateMany(
      { brandId: null },
      { $set: { brandId: brand._id } }
    );
    console.log(`✓ Updated ${result2.modifiedCount} campaigns with null brandId`);

    // Verify
    const campaignsWithoutBrand = await Campaign.countDocuments({ $or: [{ brandId: null }, { brandId: { $exists: false } }] });
    console.log(`\n✅ Remaining campaigns without brand: ${campaignsWithoutBrand}`);

    console.log('\n✅ Campaign brand fix completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing campaign brands:', error.message);
    process.exit(1);
  }
}

fixCampaignBrands();
