import 'dotenv/config';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import Influencer from '../src/models/influencer';
import { connectToMongo } from '../src/connections/db';

interface ImportInfluencerData {
  _id?: {
    $oid: string;
  };
  name: string;
  user_name: string;
  categoryInstagram: string;
  categoryYouTube: string;
  city: string;
  state: string;
  language: string;
  gender: 'Male' | 'Female' | 'Other';
  instagramData: {
    followers: number | null;
    link: string;
    genderDistribution: Array<{
      gender: string;
      distribution: number;
    }>;
    ageDistribution: Array<{
      age: string;
      value: number;
    }>;
    audienceByCountry: Array<{
      category: string;
      name: string;
      value: number;
    }>;
    collaborationCharges: {
      reel: number | null;
      story: number | null;
      post: number | null;
      oneMonthDigitalRights: number | null;
    };
  };
  youtubeData: {
    followers: number | null;
    link: string;
    genderDistribution: Array<{
      gender: string;
      distribution: number;
    }>;
    ageDistribution: Array<{
      age: string;
      value: number;
    }>;
    audienceByCountry: Array<{
      category: string;
      name: string;
      value: number;
    }>;
    collaborationCharges: {
      reel: number | null;
      story: number | null;
      post: number | null;
      oneMonthDigitalRights: number | null;
    };
  };
}

const importInfluencers = async () => {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MONGO_URI environment variable is required');
    }

    await connectToMongo(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Read the JSON file
    const filePath = path.join(process.cwd(), 'phyo.influencers.json');
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    console.log('📖 Reading influencers data...');
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const influencersData: ImportInfluencerData[] = JSON.parse(fileContent);

    console.log(`📊 Found ${influencersData.length} influencers to import`);

    // Clear existing data (optional - comment out if you want to keep existing data)
    const existingCount = await Influencer.countDocuments();
    console.log(`🗑️  Found ${existingCount} existing influencers in database`);
    
    const shouldClear = process.argv.includes('--clear');
    if (shouldClear) {
      await Influencer.deleteMany({});
      console.log('🗑️  Cleared existing influencer data');
    }

    // Transform and insert data
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < influencersData.length; i++) {
      try {
        const influencerData = influencersData[i];
        
        // Transform the data to match our schema
        const transformedData = {
          name: influencerData.name,
          user_name: influencerData.user_name,
          categoryInstagram: influencerData.categoryInstagram,
          categoryYouTube: influencerData.categoryYouTube,
          city: influencerData.city,
          state: influencerData.state,
          language: influencerData.language,
          gender: influencerData.gender,
          instagramData: {
            followers: influencerData.instagramData.followers || 0,
            link: influencerData.instagramData.link,
            genderDistribution: influencerData.instagramData.genderDistribution,
            ageDistribution: influencerData.instagramData.ageDistribution,
            audienceByCountry: influencerData.instagramData.audienceByCountry,
            collaborationCharges: {
              reel: influencerData.instagramData.collaborationCharges.reel || 0,
              story: influencerData.instagramData.collaborationCharges.story || 0,
              post: influencerData.instagramData.collaborationCharges.post || 0,
              oneMonthDigitalRights: influencerData.instagramData.collaborationCharges.oneMonthDigitalRights || 0,
            },
          },
          youtubeData: {
            followers: influencerData.youtubeData.followers || 0,
            link: influencerData.youtubeData.link,
            genderDistribution: influencerData.youtubeData.genderDistribution,
            ageDistribution: influencerData.youtubeData.ageDistribution,
            audienceByCountry: influencerData.youtubeData.audienceByCountry,
            collaborationCharges: {
              reel: influencerData.youtubeData.collaborationCharges.reel || 0,
              story: influencerData.youtubeData.collaborationCharges.story || 0,
              post: influencerData.youtubeData.collaborationCharges.post || 0,
              oneMonthDigitalRights: influencerData.youtubeData.collaborationCharges.oneMonthDigitalRights || 0,
            },
          },
          // Set default values for required fields that might be missing
          averageLikes: 0,
          averageViews: 0,
          averageComments: 0,
          averageEngagement: 0,
          image: '',
        };

        // Check if influencer already exists (by username)
        const existingInfluencer = await Influencer.findOne({ user_name: transformedData.user_name });
        
        if (existingInfluencer && !shouldClear) {
          // Update existing influencer
          await Influencer.findByIdAndUpdate(existingInfluencer._id, transformedData);
          console.log(`🔄 Updated: ${transformedData.user_name} (${i + 1}/${influencersData.length})`);
        } else {
          // Create new influencer
          await Influencer.create(transformedData);
          console.log(`✅ Imported: ${transformedData.user_name} (${i + 1}/${influencersData.length})`);
        }
        
        successCount++;
      } catch (error) {
        errorCount++;
        const errorMsg = `Error importing influencer ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
      }
    }

    // Final summary
    console.log('\n🎉 Import completed!');
    console.log(`✅ Successfully imported/updated: ${successCount} influencers`);
    console.log(`❌ Errors: ${errorCount} influencers`);
    
    if (errors.length > 0) {
      console.log('\n🔍 Error details:');
      errors.forEach(error => console.log(`   ${error}`));
    }

    const finalCount = await Influencer.countDocuments();
    console.log(`📊 Total influencers in database: ${finalCount}`);

  } catch (error) {
    console.error('💥 Fatal error during import:', error instanceof Error ? error.message : 'Unknown error');
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
};

// Run the import
if (require.main === module) {
  importInfluencers();
}

export default importInfluencers; 