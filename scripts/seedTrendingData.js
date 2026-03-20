const mongoose = require('mongoose');
const Influencer = require('../models/influencer');
const Campaign = require('../models/campaign');
const { user: User, brand: Brand } = require('../models/auth');

// Connect to MongoDB
const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/phyo';

const sampleInfluencers = [
  {
    name: 'Aisha Malik',
    user_name: 'aisha.malik',
    categoryInstagram: 'lifestyle',
    isApproved: true,
    instagramFollowers: 450000,
    averageEngagement: 8.5,
    monthlyGrowth: 15,
    youtubeFollowers: 120000,
    twitterFollowers: 50000,
    city: 'Mumbai',
    state: 'Maharashtra',
    biography: 'Lifestyle influencer | Travel & Fashion',
    image: 'https://via.placeholder.com/300?text=Aisha+Malik'
  },
  {
    name: 'Rohan Singh',
    user_name: 'rohan.singh.fitness',
    categoryInstagram: 'fitness',
    isApproved: true,
    instagramFollowers: 320000,
    averageEngagement: 9.2,
    monthlyGrowth: 22,
    youtubeFollowers: 280000,
    twitterFollowers: 80000,
    city: 'Bangalore',
    state: 'Karnataka',
    biography: 'Fitness & Nutrition Coach | Transforming Lives',
    image: 'https://via.placeholder.com/300?text=Rohan+Singh'
  },
  {
    name: 'Priya Kapoor',
    user_name: 'priya.kapoor.beauty',
    categoryInstagram: 'beauty',
    isApproved: true,
    instagramFollowers: 580000,
    averageEngagement: 10.1,
    monthlyGrowth: 18,
    youtubeFollowers: 420000,
    twitterFollowers: 95000,
    city: 'Delhi',
    state: 'Delhi',
    biography: 'Beauty & Makeup Guru | DIY Tutorials',
    image: 'https://via.placeholder.com/300?text=Priya+Kapoor'
  },
  {
    name: 'Vikram Patel',
    user_name: 'vikram.food.diary',
    categoryInstagram: 'food',
    isApproved: true,
    instagramFollowers: 290000,
    averageEngagement: 7.8,
    monthlyGrowth: 12,
    youtubeFollowers: 180000,
    twitterFollowers: 35000,
    city: 'Pune',
    state: 'Maharashtra',
    biography: 'Food & Recipe Creator | Culinary Explorer',
    image: 'https://via.placeholder.com/300?text=Vikram+Patel'
  },
  {
    name: 'Neha Gupta',
    user_name: 'neha.travel.stories',
    categoryInstagram: 'travel',
    isApproved: true,
    instagramFollowers: 410000,
    averageEngagement: 8.9,
    monthlyGrowth: 25,
    youtubeFollowers: 340000,
    twitterFollowers: 72000,
    city: 'Goa',
    state: 'Goa',
    biography: 'Adventure Seeker | World Traveler',
    image: 'https://via.placeholder.com/300?text=Neha+Gupta'
  },
  {
    name: 'Arjun Reddy',
    user_name: 'arjun.tech.reviews',
    categoryInstagram: 'technology',
    isApproved: true,
    instagramFollowers: 350000,
    averageEngagement: 9.5,
    monthlyGrowth: 20,
    youtubeFollowers: 520000,
    twitterFollowers: 125000,
    city: 'Hyderabad',
    state: 'Telangana',
    biography: 'Tech Reviewer | Gadget Enthusiast',
    image: 'https://via.placeholder.com/300?text=Arjun+Reddy'
  },
  {
    name: 'Sophia D\'Silva',
    user_name: 'sophia.fashion.flair',
    categoryInstagram: 'fashion',
    isApproved: true,
    instagramFollowers: 520000,
    averageEngagement: 9.7,
    monthlyGrowth: 17,
    youtubeFollowers: 380000,
    twitterFollowers: 88000,
    city: 'Mumbai',
    state: 'Maharashtra',
    biography: 'Fashion Designer | Style Influencer',
    image: 'https://via.placeholder.com/300?text=Sophia+Silva'
  },
  {
    name: 'Kunal Sharma',
    user_name: 'kunal.gaming.zone',
    categoryInstagram: 'gaming',
    isApproved: true,
    instagramFollowers: 380000,
    averageEngagement: 8.6,
    monthlyGrowth: 28,
    youtubeFollowers: 650000,
    twitterFollowers: 145000,
    city: 'Jaipur',
    state: 'Rajasthan',
    biography: 'Pro Gamer | Content Creator',
    image: 'https://via.placeholder.com/300?text=Kunal+Sharma'
  },
  {
    name: 'Maya Saxena',
    user_name: 'maya.wellness.coach',
    categoryInstagram: 'wellness',
    isApproved: true,
    instagramFollowers: 310000,
    averageEngagement: 8.3,
    monthlyGrowth: 14,
    youtubeFollowers: 220000,
    twitterFollowers: 58000,
    city: 'Chandigarh',
    state: 'Chandigarh',
    biography: 'Yoga & Wellness Expert',
    image: 'https://via.placeholder.com/300?text=Maya+Saxena'
  },
  {
    name: 'Aman Singh',
    user_name: 'aman.photography.pro',
    categoryInstagram: 'photography',
    isApproved: true,
    instagramFollowers: 270000,
    averageEngagement: 7.9,
    monthlyGrowth: 11,
    youtubeFollowers: 160000,
    twitterFollowers: 42000,
    city: 'Lucknow',
    state: 'Uttar Pradesh',
    biography: 'Professional Photographer | Visual Artist',
    image: 'https://via.placeholder.com/300?text=Aman+Singh'
  }
];

const sampleCampaigns = [
  {
    campaignName: 'Summer Collection Launch 2026',
    campaignBrief: 'Launch our new summer clothing collection with influencer collaborations',
    campaignType: 'instagram',
    targetInfluencer: {
      targetNiche: ['fashion', 'lifestyle'],
      numberOfInfluencers: 6
    },
    budget: 250000,
    status: 'Active',
    timelines: {
      campaignStartDate: new Date('2026-04-01'),
      campaignEndDate: new Date('2026-06-30')
    },
    productImages: ['https://via.placeholder.com/500?text=Summer+Collection']
  },
  {
    campaignName: 'Fitness Challenge 2026',
    campaignBrief: '30-day fitness challenge with prize pool and brand collaborations',
    campaignType: 'instagram',
    targetInfluencer: {
      targetNiche: ['fitness', 'health'],
      numberOfInfluencers: 8
    },
    budget: 180000,
    status: 'Active',
    timelines: {
      campaignStartDate: new Date('2026-04-01'),
      campaignEndDate: new Date('2026-05-15')
    },
    productImages: ['https://via.placeholder.com/500?text=Fitness+Challenge']
  },
  {
    campaignName: 'Beauty & Cosmetics Collab',
    campaignBrief: 'New makeup line featuring beauty influencers',
    campaignType: 'instagram',
    targetInfluencer: {
      targetNiche: ['beauty', 'lifestyle'],
      numberOfInfluencers: 7
    },
    budget: 320000,
    status: 'Active',
    timelines: {
      campaignStartDate: new Date('2026-04-01'),
      campaignEndDate: new Date('2026-07-31')
    },
    productImages: ['https://via.placeholder.com/500?text=Beauty+Collection']
  },
  {
    campaignName: 'Travel Destination Campaign',
    campaignBrief: 'Promote exotic travel destinations with travel vloggers',
    campaignType: 'youtube',
    targetInfluencer: {
      targetNiche: ['travel', 'lifestyle'],
      numberOfInfluencers: 5
    },
    budget: 290000,
    status: 'Active',
    timelines: {
      campaignStartDate: new Date('2026-04-01'),
      campaignEndDate: new Date('2026-06-30')
    },
    productImages: ['https://via.placeholder.com/500?text=Travel+Campaign']
  },
  {
    campaignName: 'Tech Gadgets Launch',
    campaignBrief: 'Launch new tech products with gadget reviewers',
    campaignType: 'youtube',
    targetInfluencer: {
      targetNiche: ['technology', 'electronics'],
      numberOfInfluencers: 9
    },
    budget: 400000,
    status: 'Active',
    timelines: {
      campaignStartDate: new Date('2026-03-20'),
      campaignEndDate: new Date('2026-05-31')
    },
    productImages: ['https://via.placeholder.com/500?text=Tech+Gadgets']
  },
  {
    campaignName: 'Food Festival Brand Partnership',
    campaignBrief: 'Exclusive food brand collaboration campaign',
    campaignType: 'instagram',
    targetInfluencer: {
      targetNiche: ['food', 'lifestyle'],
      numberOfInfluencers: 4
    },
    budget: 150000,
    status: 'Active',
    timelines: {
      campaignStartDate: new Date('2026-03-25'),
      campaignEndDate: new Date('2026-04-30')
    },
    productImages: ['https://via.placeholder.com/500?text=Food+Festival']
  },
  {
    campaignName: 'Gaming Tournament Series',
    campaignBrief: 'Large-scale gaming tournament with prize pool',
    campaignType: 'instagram',
    targetInfluencer: {
      targetNiche: ['gaming', 'esports'],
      numberOfInfluencers: 10
    },
    budget: 350000,
    status: 'Active',
    timelines: {
      campaignStartDate: new Date('2026-03-22'),
      campaignEndDate: new Date('2026-06-15')
    },
    productImages: ['https://via.placeholder.com/500?text=Gaming+Tournament']
  },
  {
    campaignName: 'Wellness & Yoga Workshop',
    campaignBrief: 'Online wellness workshops with certified yoga instructors',
    campaignType: 'youtube',
    targetInfluencer: {
      targetNiche: ['wellness', 'health'],
      numberOfInfluencers: 3
    },
    budget: 120000,
    status: 'Active',
    timelines: {
      campaignStartDate: new Date('2026-03-28'),
      campaignEndDate: new Date('2026-05-31')
    },
    productImages: ['https://via.placeholder.com/500?text=Wellness+Workshop']
  }
];

async function seedData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✓ Connected to MongoDB');

    // Clear existing data (optional)
    // await Influencer.deleteMany({});
    // await Campaign.deleteMany({});

    // Insert Influencers
    console.log('\n📸 Inserting sample influencers...');
    const insertedInfluencers = await Influencer.insertMany(sampleInfluencers, { ordered: false });
    console.log(`✓ Inserted ${insertedInfluencers.length} influencers`);

    // Get a sample brand for campaigns (or create one)
    let brand = await Brand.findOne({ isApproved: true });
    if (!brand) {
      console.log('\n📢 Creating sample brand...');
      brand = await Brand.create({
        name: 'TrendingBrand Co',
        companyName: 'Trending Brand Co Ltd',
        email: 'brand@trendingbrand.com',
        isApproved: true,
        avatar: 'https://via.placeholder.com/300?text=Trending+Brand',
        password: 'dummy' // Required field in schema
      });
      console.log(`✓ Created brand: ${brand.name}`);
    }

    // Add brandId to campaigns
    const campaignsWithBrand = sampleCampaigns.map(campaign => ({
      ...campaign,
      brandId: brand._id
    }));

    // Insert Campaigns
    console.log('\n📢 Inserting sample campaigns...');
    const insertedCampaigns = await Campaign.insertMany(campaignsWithBrand, { ordered: false });
    console.log(`✓ Inserted ${insertedCampaigns.length} campaigns`);

    console.log('\n✅ Data seeding completed successfully!');
    console.log(`\nNow try accessing:`);
    console.log(`- Trending Influencers: GET /api/trending/influencers`);
    console.log(`- Trending Campaigns: GET /api/trending/campaigns`);
    console.log(`- Trending Brands: GET /api/trending/brands`);

    process.exit(0);
  } catch (error) {
    if (error.code === 11000) {
      // Duplicate key error - data already exists
      console.log('⚠️  Some data already exists (duplicate records). Continuing...');
      console.log('\nData is ready to use:');
      console.log(`- Trending Influencers: GET /api/trending/influencers`);
      console.log(`- Trending Campaigns: GET /api/trending/campaigns`);
      process.exit(0);
    } else {
      console.error('❌ Error seeding data:', error.message);
      process.exit(1);
    }
  }
}

seedData();
