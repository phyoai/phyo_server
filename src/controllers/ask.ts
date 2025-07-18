import { Request, Response } from 'express';
import { OpenAI } from 'openai';
import Influencer from '../models/influencer';
import BrightDataService, { BrightDataInstagramProfile } from '../services/brightdata';
import { 
  AskRequest, 
  AskResponse, 
  ProcessedRequirements,
  EnhancedInfluencer,
  IInfluencer
} from '../types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
});

/**
 * Helper function to enhance influencer data with Bright Data real-time information
 */
async function enhanceInfluencerWithBrightData(influencer: IInfluencer): Promise<EnhancedInfluencer> {
  const enhanced: EnhancedInfluencer = { ...influencer };

  try {
    if (!BrightDataService.isAvailable()) {
      return enhanced;
    }

    // Extract username from Instagram URL or use the user_name field
    let username = influencer.user_name;
    if (influencer.instagramData?.link) {
      const match = influencer.instagramData.link.match(/instagram\.com\/([^\/\?]+)/);
      if (match) {
        username = match[1];
      }
    }

    if (!username) {
      return enhanced;
    }

    // Get enhanced profile data from Bright Data
    const brightDataResult = await BrightDataService.getEnhancedProfileData(username);
    
    if (brightDataResult.profile) {
      const profile = brightDataResult.profile;
      enhanced.brightDataProfile = {
        // Send all profile data directly
        ...profile,
        
        // Add metadata
        lastUpdated: new Date().toISOString(),
        profileUrl: `https://www.instagram.com/${profile.account}/`
      };
    }

    if (brightDataResult.recentPosts && brightDataResult.recentPosts.length > 0) {
      enhanced.brightDataPosts = {
        // Send all posts data directly
        posts: brightDataResult.recentPosts,
        postsCount: brightDataResult.recentPosts.length,
        lastUpdated: new Date().toISOString()
      };
    }

  } catch (error) {
    console.warn(`Failed to enhance influencer ${influencer.user_name} with Bright Data:`, error);
  }

  return enhanced;
}

/**
 * Helper function to enhance multiple influencers with Bright Data
 */
async function enhanceInfluencersWithBrightData(influencers: IInfluencer[]): Promise<{
  enhancedInfluencers: EnhancedInfluencer[];
  brightDataStatus: { enabled: boolean; profilesEnhanced: number; errors: number; };
}> {
  const brightDataStatus = {
    enabled: BrightDataService.isAvailable(),
    profilesEnhanced: 0,
    errors: 0
  };

  if (!brightDataStatus.enabled) {
    console.log('Bright Data service not available, returning basic influencer data');
    return {
      enhancedInfluencers: influencers.map(inf => ({ ...inf })),
      brightDataStatus
    };
  }

  const enhancedInfluencers: EnhancedInfluencer[] = [];

  // Process influencers in batches to avoid overwhelming the API
  const batchSize = 5;
  for (let i = 0; i < influencers.length; i += batchSize) {
    const batch = influencers.slice(i, i + batchSize);
    const batchPromises = batch.map(async (influencer) => {
      try {
        const enhanced = await enhanceInfluencerWithBrightData(influencer);
        console.log(enhanced.brightDataProfile);
        console.log(enhanced.brightDataPosts);
        if (enhanced.brightDataProfile || enhanced.brightDataPosts) {
          brightDataStatus.profilesEnhanced++;
        }
        return enhanced;
        
      } catch (error) {
        brightDataStatus.errors++;
        console.error(`Error enhancing influencer ${influencer.user_name}:`, error);
        return { ...influencer };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    enhancedInfluencers.push(...batchResults);

    // Add a small delay between batches to be respectful to the API
    if (i + batchSize < influencers.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return { enhancedInfluencers, brightDataStatus };
}

interface OpenAIResponse {
  city: string;
  state: string;
  minFollowers: number;
  maxFollowers: number;
  category: string;
  maleRatio: number;
  femaleRatio: number;
  maleComparison: '>=' | '<=';
  femaleComparison: '>=' | '<=';
  country: string;
  countryComparison: '>=' | '<=';
  countryValue: number;
  ageRange: string;
  ageComparison: '>=' | '<=';
  ageValue: number;
}


export const handleAsk = async (req: Request<{}, AskResponse, AskRequest>, res: Response<AskResponse>): Promise<void> => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      res.status(400).json({
        success: false,
        result: {} as ProcessedRequirements,
        data: [],
        error: "Prompt is required"
      });
      return;
    }

    const response = await openai.beta.chat.completions.parse({
      model: "gpt-4o-2024-08-06",
      messages: [
        { 
          role: "system", 
          content: "You are a influencer marketer. User will tell you there needs and you will have to note the requirements and if you do not understand what they want for some field so leave it empty string. Do not fill with fillers words like not specified etc. If only male ratio is passed than only pass male ratio and vice versa. and for the age distribution you will have to see the user demand and create a range seeing following ranges that in what range do his required audience fit and if it cover more than one range then create one range out of those two and make sure to return range like this [minage]-[maxage]. These are ranges in my schema 13-17, 18-24, 25-34, 35-44, 45-64, 65+" 
        },
        { role: "user", content: prompt }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "influencer_requirements",
          schema: {
            type: "object",
            properties: {
              city: { type: "string" },
              state: { type: "string" },
              minFollowers: { type: "number" },
              maxFollowers: { type: "number" },
              category: { type: "string" },
              maleRatio: { type: "number" },
              femaleRatio: { type: "number" },
              maleComparison: { type: "string", enum: [">=", "<="] },
              femaleComparison: { type: "string", enum: [">=", "<="] },
              country: { type: "string" },
              countryComparison: { type: "string", enum: [">=", "<="] },
              countryValue: { type: "number" },
              ageRange: { type: "string" },
              ageComparison: { type: "string", enum: [">=", "<="] },
              ageValue: { type: "number" },
            },
            required: ["city", "category", "minFollowers", "maxFollowers", "state", "maleRatio", "femaleRatio", "maleComparison", "femaleComparison", "country", "countryComparison", "countryValue", "ageRange", "ageComparison", "ageValue"],
            additionalProperties: false,
          },
          strict: true,
        }
      }
    });

    const mathReasoning = (response.choices[0].message.parsed as unknown as OpenAIResponse) || {} as OpenAIResponse;
    
    const result: ProcessedRequirements = {
      city: mathReasoning.city || "",
      state: mathReasoning.state || "",
      minFollowers: mathReasoning.minFollowers || 0,
      maxFollowers: mathReasoning.maxFollowers || Number.MAX_SAFE_INTEGER,
      category: mathReasoning.category || "",
      maleRatio: mathReasoning.maleRatio || null,
      femaleRatio: mathReasoning.femaleRatio || null,
      maleComparison: mathReasoning.maleComparison === ">=" ? "$gte" : mathReasoning.maleComparison === "<=" ? "$lte" : "$gte",
      femaleComparison: mathReasoning.femaleComparison === ">=" ? "$gte" : mathReasoning.femaleComparison === "<=" ? "$lte" : "$gte",
      countryComparison: mathReasoning.countryComparison === ">=" ? "$gte" : mathReasoning.countryComparison === "<=" ? "$lte" : "$gte",
      countryValue: mathReasoning.countryValue || null,
      country: mathReasoning.country || null,
      ageRanges: mathReasoning.ageRange || null,
      ageComparison: mathReasoning.ageComparison === ">=" ? "$gte" : mathReasoning.ageComparison === "<=" ? "$lte" : "$gte",
      ageValue: mathReasoning.ageValue || null,
    };

    // Build MongoDB query with case-insensitive matching
    const query: any = {
      $and: []
    };

    // Add location filter (case-insensitive)
    if (result.city || result.state) {
      const locationConditions: any[] = [];
      if (result.city) {
        locationConditions.push({ city: { $regex: new RegExp(result.city, 'i') } });
      }
      if (result.state) {
        locationConditions.push({ state: { $regex: new RegExp(result.state, 'i') } });
      }
      query.$and.push({ $or: locationConditions });
    }

    // Add followers filter
    query.$and.push({
      $or: [
        { "instagramData.followers": { $gte: result.minFollowers, $lte: result.maxFollowers } }, 
        { "youtubeData.followers": { $gte: result.minFollowers, $lte: result.maxFollowers } }
      ]
    });

    // Add category condition only if it's provided (case-insensitive)
    if (result.category) {
      query.$and.push({ 
        $or: [
          { categoryInstagram: { $regex: new RegExp(result.category, 'i') } }, 
          { categoryYouTube: { $regex: new RegExp(result.category, 'i') } }
        ] 
      });
    }

    // Add gender conditions
    if (result.maleRatio !== null || result.femaleRatio !== null) {
      const genderQuery: any[] = [];

      if (result.maleRatio !== null) {
        genderQuery.push(
          { "instagramData.genderDistribution": { $elemMatch: { gender: "MALE", distribution: { [result.maleComparison]: result.maleRatio } } } },
          { "youtubeData.genderDistribution": { $elemMatch: { gender: "MALE", distribution: { [result.maleComparison]: result.maleRatio } } } },
        );
      }

      if (result.femaleRatio !== null) {
        genderQuery.push(
          { "instagramData.genderDistribution": { $elemMatch: { gender: "FEMALE", distribution: { [result.femaleComparison]: result.femaleRatio } } } },
          { "youtubeData.genderDistribution": { $elemMatch: { gender: "FEMALE", distribution: { [result.femaleComparison]: result.femaleRatio } } } },
        );
      }

      query.$and.push({ $or: genderQuery });
    }

    // Add country conditions
    if (result.country && result.countryValue !== null) {
      const countryQuery: any[] = [];

      countryQuery.push({
        "instagramData.audienceByCountry": {
          $elemMatch: { name: result.country, value: { [result.countryComparison]: result.countryValue } }
        }
      });

      countryQuery.push({
        "youtubeData.audienceByCountry": {
          $elemMatch: { name: result.country, value: { [result.countryComparison]: result.countryValue } }
        }
      });

      query.$and.push({ $or: countryQuery });
    }

    // Add age conditions - simplified approach
    if (result.ageRanges) {
      // For age filtering, we'll look for influencers who have audience in the specified age range
      // This is a simpler approach that checks if the age range exists in their distribution
      query.$and.push({
        $or: [
          { "instagramData.ageDistribution.age": result.ageRanges },
          { "youtubeData.ageDistribution.age": result.ageRanges }
        ]
      });
    }

    // Log the query for debugging
    console.log('MongoDB Query:', JSON.stringify(query, null, 2));
    console.log('Search Criteria:', { 
      city: result.city, 
      category: result.category, 
      minFollowers: result.minFollowers, 
      maxFollowers: result.maxFollowers,
      ageRanges: result.ageRanges 
    });

    const foundInfluencers = await Influencer.find(query);
    
    // Debug: Also try a simpler query to see if there's any data
    const totalInfluencers = await Influencer.countDocuments();
    const categoryMatches = await Influencer.countDocuments({
      $or: [
        { categoryInstagram: { $regex: new RegExp(result.category, 'i') } }, 
        { categoryYouTube: { $regex: new RegExp(result.category, 'i') } }
      ]
    });
    const cityMatches = await Influencer.countDocuments({
      city: { $regex: new RegExp(result.city, 'i') }
    });

    console.log('Debug Info:', {
      totalInfluencers,
      categoryMatches,
      cityMatches,
      foundInfluencers: foundInfluencers.length
    });
    
    if (!foundInfluencers || foundInfluencers.length === 0) {
      res.status(200).json({
        success: true,
        result,
        data: [],
        brightDataStatus: {
          enabled: BrightDataService.isAvailable(),
          profilesEnhanced: 0,
          errors: 0
        },
        debug: {
          totalInfluencers,
          categoryMatches,
          cityMatches,
          query: query
        }
      });
      return;
    }

    // Convert database results to plain objects
    const baseInfluencers: IInfluencer[] = foundInfluencers.map(inf => inf.toObject());

    console.log(`Found ${baseInfluencers.length} influencers from database. Enhancing with Bright Data...`);

    // Enhance influencer data with real-time information from Bright Data
    const { enhancedInfluencers, brightDataStatus } = await enhanceInfluencersWithBrightData(baseInfluencers);

    console.log(`Bright Data enhancement complete: ${brightDataStatus.profilesEnhanced} profiles enhanced, ${brightDataStatus.errors} errors`);

    res.status(200).json({
      success: true,
      result,
      data: enhancedInfluencers,
      brightDataStatus,
    });

  } catch (error) {
    console.error('Error in /api/ask endpoint:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({
      success: false,
      result: {} as ProcessedRequirements,
      data: [],
      error: error instanceof Error ? error.message : 'Internal server error',
      brightDataStatus: {
        enabled: BrightDataService.isAvailable(),
        profilesEnhanced: 0,
        errors: 1
      }
    });
  }
};

export const handleDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userName } = req.query as { userName: string };

    if (!userName) {
      res.status(400).json({
        success: false,
        message: "userName query parameter is required",
      });
      return;
    }

    // Fetch influencer details from the database
    const influencerDetails = await Influencer.findOne({ user_name: userName });

    if (!influencerDetails) {
      res.status(404).json({
        success: false,
        message: "Influencer not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: influencerDetails.toObject(),
    });

  } catch (error) {
    console.error('Error in /details endpoint:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
};

// Debug endpoint to check database content
export const handleDebugData = async (req: Request, res: Response): Promise<void> => {
  try {
    const totalCount = await Influencer.countDocuments();
    
    // Get a sample of influencers to check data structure
    const sampleInfluencers = await Influencer.find({}).limit(3).lean();
    
    // Get unique cities and categories
    const cities = await Influencer.distinct('city');
    const categoriesInstagram = await Influencer.distinct('categoryInstagram');
    const categoriesYouTube = await Influencer.distinct('categoryYouTube');
    
    // Check follower ranges
    const followerStats = await Influencer.aggregate([
      {
        $group: {
          _id: null,
          minInstagramFollowers: { $min: "$instagramData.followers" },
          maxInstagramFollowers: { $max: "$instagramData.followers" },
          minYoutubeFollowers: { $min: "$youtubeData.followers" },
          maxYoutubeFollowers: { $max: "$youtubeData.followers" }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        totalCount,
        cities: cities.slice(0, 10), // First 10 cities
        categoriesInstagram: categoriesInstagram.slice(0, 10),
        categoriesYouTube: categoriesYouTube.slice(0, 10),
        followerStats: followerStats[0] || {},
        sampleInfluencers: sampleInfluencers.map(inf => ({
          name: inf.name,
          user_name: inf.user_name,
          city: inf.city,
          categoryInstagram: inf.categoryInstagram,
          categoryYouTube: inf.categoryYouTube,
          instagramFollowers: inf.instagramData?.followers,
          youtubeFollowers: inf.youtubeData?.followers,
          ageDistribution: inf.instagramData?.ageDistribution?.slice(0, 3) // First 3 age groups
        }))
      }
    });
  } catch (error) {
    console.error('Debug data error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Test Bright Data integration
export const handleTestBrightData = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username } = req.query as { username: string };
    
    if (!username) {
      res.status(400).json({
        success: false,
        error: "username query parameter is required"
      });
      return;
    }

    console.log(`Testing Bright Data for username: ${username}`);

    // Test the connection first
    const connectionTest = await BrightDataService.testConnection();
    
    // Get enhanced profile data
    const enhancedData = await BrightDataService.getEnhancedProfileData(username);
    
    res.json({
      success: true,
      data: {
        connectionTest,
        brightDataAvailable: BrightDataService.isAvailable(),
        username,
        profile: enhancedData.profile,
        recentPosts: enhancedData.recentPosts,
        apiTokenConfigured: !!process.env.BRIGHT_DATA_API_TOKEN
      }
    });
  } catch (error) {
    console.error('Bright Data test error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      brightDataAvailable: BrightDataService.isAvailable(),
      apiTokenConfigured: !!process.env.BRIGHT_DATA_API_TOKEN
    });
  }
};

// Test Bright Data snapshot
export const handleTestSnapshot = async (req: Request, res: Response): Promise<void> => {
  try {
    const { snapshotId } = req.query as { snapshotId: string };
    
    if (!snapshotId) {
      res.status(400).json({
        success: false,
        error: "snapshotId query parameter is required"
      });
      return;
    }

    console.log(`Testing Bright Data snapshot: ${snapshotId}`);

    // Check progress first
    const progress = await BrightDataService.checkProgress(snapshotId);
    
    // Fetch snapshot data
    const snapshotData = await BrightDataService.fetchSnapshotData(snapshotId);
    
    res.json({
      success: true,
      data: {
        snapshotId,
        progress,
        profilesFound: snapshotData.length,
        profiles: snapshotData.slice(0, 5), // Show first 5 profiles
        brightDataAvailable: BrightDataService.isAvailable(),
        apiTokenConfigured: !!process.env.BRIGHT_DATA_API_TOKEN
      }
    });
  } catch (error) {
    console.error('Bright Data snapshot test error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      brightDataAvailable: BrightDataService.isAvailable(),
      apiTokenConfigured: !!process.env.BRIGHT_DATA_API_TOKEN
    });
  }
}; 