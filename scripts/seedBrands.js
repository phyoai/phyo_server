const mongoose = require('mongoose');
const { user: User } = require('../models/auth');

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/phyo';

const sampleBrands = [
  {
    name: 'Nike India',
    email: 'contact@nike.in',
    password: 'dummy123',
    type: 'BRAND',
    isApproved: true,
    profileImage: 'https://via.placeholder.com/300?text=Nike',
    website: 'https://nike.com',
  },
  {
    name: 'Adidas Sports',
    email: 'info@adidas.in',
    password: 'dummy123',
    type: 'BRAND',
    isApproved: true,
    profileImage: 'https://via.placeholder.com/300?text=Adidas',
    website: 'https://adidas.com',
  },
  {
    name: 'Samsung Electronics',
    email: 'brands@samsung.in',
    password: 'dummy123',
    type: 'BRAND',
    isApproved: true,
    profileImage: 'https://via.placeholder.com/300?text=Samsung',
    website: 'https://samsung.com',
  },
  {
    name: 'Apple India',
    email: 'connect@apple.in',
    password: 'dummy123',
    type: 'BRAND',
    isApproved: true,
    profileImage: 'https://via.placeholder.com/300?text=Apple',
    website: 'https://apple.com',
  },
  {
    name: 'Coca Cola',
    email: 'brand@cocacola.in',
    password: 'dummy123',
    type: 'BRAND',
    isApproved: true,
    profileImage: 'https://via.placeholder.com/300?text=Coca+Cola',
    website: 'https://cocacola.com',
  },
  {
    name: 'Pepsi',
    email: 'brands@pepsi.in',
    password: 'dummy123',
    type: 'BRAND',
    isApproved: true,
    profileImage: 'https://via.placeholder.com/300?text=Pepsi',
    website: 'https://pepsi.com',
  },
  {
    name: 'LG Appliances',
    email: 'connect@lg.in',
    password: 'dummy123',
    type: 'BRAND',
    isApproved: true,
    profileImage: 'https://via.placeholder.com/300?text=LG',
    website: 'https://lg.com',
  },
  {
    name: 'OnePlus',
    email: 'brand@oneplus.in',
    password: 'dummy123',
    type: 'BRAND',
    isApproved: true,
    profileImage: 'https://via.placeholder.com/300?text=OnePlus',
    website: 'https://oneplus.com',
  },
];

async function seedBrands() {
  try {
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✓ Connected to MongoDB');

    // Insert brands
    console.log('\n📢 Inserting sample brands...');
    const insertedBrands = await User.insertMany(sampleBrands, { ordered: false });
    console.log(`✓ Inserted ${insertedBrands.length} brands`);

    console.log('\n📋 Brand details:');
    insertedBrands.forEach(brand => {
      console.log(`  - ${brand.name} (${brand.email}) | ID: ${brand._id}`);
    });

    // Update existing campaigns to link to these brands
    console.log('\n🔗 Linking campaigns to brands...');
    const Campaign = require('../models/campaign');
    const campaigns = await Campaign.find().select('_id campaignName brandId');
    console.log(`Found ${campaigns.length} campaigns`);

    // Get first brand to assign to campaigns without a brand
    const firstBrand = insertedBrands[0];
    let updated = 0;
    for (const campaign of campaigns) {
      if (!campaign.brandId) {
        campaign.brandId = firstBrand._id;
        await campaign.save();
        updated++;
      }
    }
    console.log(`✓ Updated ${updated} campaigns with brand reference`);

    console.log('\n✅ Brands seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    if (error.code === 11000) {
      console.log('⚠️  Some brands already exist (duplicate email)');
      console.log('✅ Brands are ready to use!');
      process.exit(0);
    } else {
      console.error('❌ Error seeding brands:', error.message);
      process.exit(1);
    }
  }
}

seedBrands();
