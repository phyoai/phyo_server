const mongoose = require('mongoose');
const Influencer = require('../models/influencer');
const Campaign = require('../models/campaign');
const { brand: Brand } = require('../models/auth');

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/phyo';

// Sample nearby influencers with location data
const nearbyInfluencers = [
  {
    name: 'Mumbai Fashion Queen',
    user_name: 'mumbai.fashion.queen',
    categoryInstagram: 'fashion',
    isApproved: true,
    instagramFollowers: 280000,
    averageEngagement: 8.2,
    monthlyGrowth: 13,
    youtubeFollowers: 95000,
    twitterFollowers: 35000,
    city: 'Mumbai',
    state: 'Maharashtra',
    biography: 'Fashion & Style in Mumbai',
    image: 'https://via.placeholder.com/300?text=Mumbai+Fashion'
  },
  {
    name: 'Bangalore Tech Guru',
    user_name: 'bangalore.tech.guru',
    categoryInstagram: 'technology',
    isApproved: true,
    instagramFollowers: 320000,
    averageEngagement: 9.1,
    monthlyGrowth: 19,
    youtubeFollowers: 450000,
    twitterFollowers: 110000,
    city: 'Bangalore',
    state: 'Karnataka',
    biography: 'Tech Reviews & Gadgets in Bangalore',
    image: 'https://via.placeholder.com/300?text=Bangalore+Tech'
  },
  {
    name: 'Delhi Food Explorer',
    user_name: 'delhi.food.explorer',
    categoryInstagram: 'food',
    isApproved: true,
    instagramFollowers: 210000,
    averageEngagement: 7.6,
    monthlyGrowth: 10,
    youtubeFollowers: 130000,
    twitterFollowers: 28000,
    city: 'Delhi',
    state: 'Delhi',
    biography: 'Street Food & Restaurants in Delhi',
    image: 'https://via.placeholder.com/300?text=Delhi+Food'
  },
  {
    name: 'Pune Fitness Master',
    user_name: 'pune.fitness.master',
    categoryInstagram: 'fitness',
    isApproved: true,
    instagramFollowers: 195000,
    averageEngagement: 8.9,
    monthlyGrowth: 21,
    youtubeFollowers: 275000,
    twitterFollowers: 62000,
    city: 'Pune',
    state: 'Maharashtra',
    biography: 'Fitness & Wellness Coach in Pune',
    image: 'https://via.placeholder.com/300?text=Pune+Fitness'
  },
  {
    name: 'Goa Travel Buddy',
    user_name: 'goa.travel.buddy',
    categoryInstagram: 'travel',
    isApproved: true,
    instagramFollowers: 240000,
    averageEngagement: 8.4,
    monthlyGrowth: 23,
    youtubeFollowers: 310000,
    twitterFollowers: 68000,
    city: 'Goa',
    state: 'Goa',
    biography: 'Travel & Beach Life in Goa',
    image: 'https://via.placeholder.com/300?text=Goa+Travel'
  },
  {
    name: 'Hyderabad Business Coach',
    user_name: 'hyderabad.business.coach',
    categoryInstagram: 'business',
    isApproved: true,
    instagramFollowers: 165000,
    averageEngagement: 7.8,
    monthlyGrowth: 16,
    youtubeFollowers: 210000,
    twitterFollowers: 82000,
    city: 'Hyderabad',
    state: 'Telangana',
    biography: 'Entrepreneur & Business Tips',
    image: 'https://via.placeholder.com/300?text=Hyderabad+Business'
  },
  {
    name: 'Jaipur Heritage Guide',
    user_name: 'jaipur.heritage.guide',
    categoryInstagram: 'travel',
    isApproved: true,
    instagramFollowers: 145000,
    averageEngagement: 7.4,
    monthlyGrowth: 9,
    youtubeFollowers: 95000,
    twitterFollowers: 24000,
    city: 'Jaipur',
    state: 'Rajasthan',
    biography: 'Heritage & Culture of Jaipur',
    image: 'https://via.placeholder.com/300?text=Jaipur+Heritage'
  },
  {
    name: 'Chandigarh Beauty Expert',
    user_name: 'chandigarh.beauty.expert',
    categoryInstagram: 'beauty',
    isApproved: true,
    instagramFollowers: 175000,
    averageEngagement: 8.6,
    monthlyGrowth: 14,
    youtubeFollowers: 155000,
    twitterFollowers: 45000,
    city: 'Chandigarh',
    state: 'Chandigarh',
    biography: 'Beauty & Skincare Expert',
    image: 'https://via.placeholder.com/300?text=Chandigarh+Beauty'
  },
  {
    name: 'Lucknow Lifestyle Blogger',
    user_name: 'lucknow.lifestyle.blogger',
    categoryInstagram: 'lifestyle',
    isApproved: true,
    instagramFollowers: 138000,
    averageEngagement: 7.2,
    monthlyGrowth: 8,
    youtubeFollowers: 78000,
    twitterFollowers: 19000,
    city: 'Lucknow',
    state: 'Uttar Pradesh',
    biography: 'Lifestyle & Local Culture',
    image: 'https://via.placeholder.com/300?text=Lucknow+Lifestyle'
  },
  {
    name: 'Kolkata Arts Enthusiast',
    user_name: 'kolkata.arts.enthusiast',
    categoryInstagram: 'arts',
    isApproved: true,
    instagramFollowers: 155000,
    averageEngagement: 7.9,
    monthlyGrowth: 11,
    youtubeFollowers: 115000,
    twitterFollowers: 38000,
    city: 'Kolkata',
    state: 'West Bengal',
    biography: 'Arts & Culture of Kolkata',
    image: 'https://via.placeholder.com/300?text=Kolkata+Arts'
  }
];

// Sample nearby campaigns by location
const nearbyCampaigns = [
  {
    campaignName: 'Mumbai Local Stores Campaign',
    campaignBrief: 'Partner with local influencers in Mumbai region',
    campaignType: 'instagram',
    targetInfluencer: {
      targetNiche: ['fashion', 'lifestyle'],
      numberOfInfluencers: 4,
      countries: ['India']
    },
    budget: 120000,
    status: 'Active',
    timelines: {
      campaignStartDate: new Date('2026-03-20'),
      campaignEndDate: new Date('2026-05-20')
    },
    productImages: ['https://via.placeholder.com/500?text=Mumbai+Campaign']
  },
  {
    campaignName: 'Bangalore Tech Community Event',
    campaignBrief: 'Tech product launch campaign with local Bangalore influencers',
    campaignType: 'youtube',
    targetInfluencer: {
      targetNiche: ['technology', 'gadgets'],
      numberOfInfluencers: 5,
      countries: ['India']
    },
    budget: 180000,
    status: 'Active',
    timelines: {
      campaignStartDate: new Date('2026-03-25'),
      campaignEndDate: new Date('2026-06-25')
    },
    productImages: ['https://via.placeholder.com/500?text=Bangalore+Tech']
  },
  {
    campaignName: 'Delhi Food & Beverage Festival',
    campaignBrief: 'Food brand collaboration with Delhi region influencers',
    campaignType: 'instagram',
    targetInfluencer: {
      targetNiche: ['food', 'lifestyle'],
      numberOfInfluencers: 3,
      countries: ['India']
    },
    budget: 95000,
    status: 'Active',
    timelines: {
      campaignStartDate: new Date('2026-03-22'),
      campaignEndDate: new Date('2026-04-22')
    },
    productImages: ['https://via.placeholder.com/500?text=Delhi+Food']
  },
  {
    campaignName: 'Pune Fitness Community Challenge',
    campaignBrief: 'Fitness equipment launch in Pune area',
    campaignType: 'instagram',
    targetInfluencer: {
      targetNiche: ['fitness', 'health'],
      numberOfInfluencers: 4,
      countries: ['India']
    },
    budget: 135000,
    status: 'Active',
    timelines: {
      campaignStartDate: new Date('2026-04-01'),
      campaignEndDate: new Date('2026-05-31')
    },
    productImages: ['https://via.placeholder.com/500?text=Pune+Fitness']
  },
  {
    campaignName: 'Goa Summer Travel Promo',
    campaignBrief: 'Travel booking platform campaign targeting Goa influencers',
    campaignType: 'youtube',
    targetInfluencer: {
      targetNiche: ['travel', 'lifestyle'],
      numberOfInfluencers: 3,
      countries: ['India']
    },
    budget: 150000,
    status: 'Active',
    timelines: {
      campaignStartDate: new Date('2026-03-20'),
      campaignEndDate: new Date('2026-06-30')
    },
    productImages: ['https://via.placeholder.com/500?text=Goa+Travel']
  },
  {
    campaignName: 'Hyderabad Business Network Event',
    campaignBrief: 'B2B software launch with Hyderabad business influencers',
    campaignType: 'instagram',
    targetInfluencer: {
      targetNiche: ['business', 'technology'],
      numberOfInfluencers: 4,
      countries: ['India']
    },
    budget: 165000,
    status: 'Active',
    timelines: {
      campaignStartDate: new Date('2026-03-28'),
      campaignEndDate: new Date('2026-05-28')
    },
    productImages: ['https://via.placeholder.com/500?text=Hyderabad+Business']
  },
  {
    campaignName: 'Jaipur Heritage Tourism Campaign',
    campaignBrief: 'Tourism promotion with local Jaipur travel influencers',
    campaignType: 'youtube',
    targetInfluencer: {
      targetNiche: ['travel', 'culture'],
      numberOfInfluencers: 2,
      countries: ['India']
    },
    budget: 85000,
    status: 'Active',
    timelines: {
      campaignStartDate: new Date('2026-04-01'),
      campaignEndDate: new Date('2026-06-01')
    },
    productImages: ['https://via.placeholder.com/500?text=Jaipur+Tourism']
  }
];

async function seedNearbyData() {
  try {
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✓ Connected to MongoDB');

    // Insert Nearby Influencers
    console.log('\n📍 Inserting nearby influencers by city...');
    const insertedNearby = await Influencer.insertMany(nearbyInfluencers, { ordered: false });
    console.log(`✓ Inserted ${insertedNearby.length} nearby influencers`);

    // Show summary by city
    const citySummary = {};
    insertedNearby.forEach(inf => {
      if (!citySummary[inf.city]) citySummary[inf.city] = 0;
      citySummary[inf.city]++;
    });
    console.log('\n📍 Influencers by city:');
    Object.entries(citySummary).forEach(([city, count]) => {
      console.log(`   ${city}: ${count} influencers`);
    });

    // Get a brand
    let brand = await Brand.findOne({ isApproved: true });
    if (!brand) {
      console.log('\n📢 Creating brand for campaigns...');
      brand = await Brand.create({
        name: 'LocalBrand India',
        companyName: 'Local Brand India Pvt Ltd',
        email: 'local@localbranding.com',
        isApproved: true,
        avatar: 'https://via.placeholder.com/300?text=Local+Brand',
        password: 'dummy'
      });
    }

    // Add brandId to campaigns
    const campaignsWithBrand = nearbyCampaigns.map(campaign => ({
      ...campaign,
      brandId: brand._id
    }));

    // Insert Nearby Campaigns
    console.log('\n📍 Inserting nearby campaigns by location...');
    const insertedCampaigns = await Campaign.insertMany(campaignsWithBrand, { ordered: false });
    console.log(`✓ Inserted ${insertedCampaigns.length} nearby campaigns`);

    console.log('\n✅ Nearby data seeding completed successfully!');
    console.log(`\nNow you can filter by location:`);
    console.log(`- GET /api/trending/influencers?limit=10`);
    console.log(`  (Use client-side filtering by city/state)`);
    console.log(`- GET /api/location/influencers/nearby?city=Mumbai`);
    console.log(`- GET /api/location/campaigns/nearby?city=Bangalore`);

    process.exit(0);
  } catch (error) {
    if (error.code === 11000) {
      console.log('⚠️  Some data already exists (duplicates). Continuing...');
      console.log('\n✅ Nearby data is ready to use!');
      process.exit(0);
    } else {
      console.error('❌ Error seeding nearby data:', error.message);
      process.exit(1);
    }
  }
}

seedNearbyData();
