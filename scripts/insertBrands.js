const mongoose = require('mongoose');
const { brand: Brand } = require('../models/auth');

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/phyo';

const sampleBrands = [
  {
    name: 'TrendingBrand Co',
    email: 'brand@trendingbrand.com',
    password: 'dummy123',
    type: 'BRAND',
    isApproved: true,
    avatar: 'https://via.placeholder.com/300?text=Trending+Brand',
    profileImage: 'https://via.placeholder.com/300?text=Trending+Brand',
  },
  {
    name: 'Fashion Forward Ltd',
    email: 'contact@fashionforward.com',
    password: 'dummy123',
    type: 'BRAND',
    isApproved: true,
    avatar: 'https://via.placeholder.com/300?text=Fashion+Forward',
    profileImage: 'https://via.placeholder.com/300?text=Fashion+Forward',
  },
  {
    name: 'Tech Innovations Inc',
    email: 'info@techinnovations.com',
    password: 'dummy123',
    type: 'BRAND',
    isApproved: true,
    avatar: 'https://via.placeholder.com/300?text=Tech+Innovations',
    profileImage: 'https://via.placeholder.com/300?text=Tech+Innovations',
  },
  {
    name: 'Lifestyle Essentials',
    email: 'hello@lifestyleessentials.com',
    password: 'dummy123',
    type: 'BRAND',
    isApproved: true,
    avatar: 'https://via.placeholder.com/300?text=Lifestyle+Essentials',
    profileImage: 'https://via.placeholder.com/300?text=Lifestyle+Essentials',
  },
];

async function insertBrands() {
  try {
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✓ Connected to MongoDB');

    // Clear existing brands (optional - comment out if you want to keep existing)
    // await Brand.deleteMany({});
    // console.log('Cleared existing brands');

    // Insert new brands
    console.log('\n📢 Inserting sample brands...');
    const insertedBrands = await Brand.insertMany(sampleBrands, { ordered: false });
    console.log(`✓ Inserted ${insertedBrands.length} brands`);

    console.log('\n📋 Brand details:');
    insertedBrands.forEach(brand => {
      console.log(`  - ${brand.name} (${brand.email}) | ID: ${brand._id}`);
    });

    console.log('\n✅ Brands inserted successfully!');
    process.exit(0);
  } catch (error) {
    if (error.code === 11000) {
      console.log('⚠️  Some brands already exist (duplicate email)');
      console.log('\n✅ Brands are ready to use!');
      process.exit(0);
    } else {
      console.error('❌ Error inserting brands:', error.message);
      process.exit(1);
    }
  }
}

insertBrands();
