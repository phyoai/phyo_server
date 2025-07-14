import { Request, Response } from 'express';
import { OpenAI } from 'openai';
import Influencer from '../models/influencer';
import brightDataService from '../services/brightdata';
import { 
  AskRequest, 
  AskResponse, 
  ProcessedRequirements,
  BrightDataSearchParams
} from '../types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
});

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

    // Initialize results arrays
    let localResults: any[] = [];
    let brightDataResults: any[] = [];
    let dataSource: 'local' | 'brightdata' | 'both' = 'local';

    // Search local database
    try {
      const localInfluencers = await searchLocalDatabase(result);
      localResults = localInfluencers.map(inf => inf.toObject());
      console.log(`Found ${localResults.length} influencers in local database`);
    } catch (error) {
      console.error('Error searching local database:', error);
    }

    // Search Bright Data API if available
    if (brightDataService.isAvailable()) {
      try {
        const brightDataInfluencers = await searchBrightData(result);
        console.log(`Found ${brightDataInfluencers.length} influencers from Bright Data search`);
        
        // Fetch detailed data for each Bright Data influencer
        const detailedBrightDataResults = await fetchDetailedBrightDataResults(brightDataInfluencers);
        brightDataResults = detailedBrightDataResults;
        
        console.log(`Successfully fetched detailed data for ${brightDataResults.length} Bright Data influencers`);
        
        if (localResults.length > 0 && brightDataResults.length > 0) {
          dataSource = 'both';
        } else if (brightDataResults.length > 0) {
          dataSource = 'brightdata';
        }
      } catch (error) {
        console.error('Error searching Bright Data:', error);
      }
    }

    // Combine and deduplicate results
    const allResults = [...localResults, ...brightDataResults];
    const uniqueResults = deduplicateResults(allResults);

    // Prepare response
    const responseData: AskResponse = {
      success: true,
      result,
      data: uniqueResults,
      dataSource,
      brightDataResults: brightDataResults.length > 0 ? brightDataResults : undefined
    };

    // Add debug info if no results found
    if (uniqueResults.length === 0) {
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

      responseData.debug = {
        totalInfluencers,
        categoryMatches,
        cityMatches,
        query: result
      };
    }

    res.status(200).json(responseData);

  } catch (error) {
    console.error('Error in /api/ask endpoint:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({
      success: false,
      result: {} as ProcessedRequirements,
      data: [],
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
};

// Helper function to fetch detailed data for Bright Data influencers
async function fetchDetailedBrightDataResults(brightDataInfluencers: any[]): Promise<any[]> {
  const detailedResults = [];
  
  for (const influencer of brightDataInfluencers) {
    try {
      const username = influencer.user_name || influencer.username;
      if (!username) continue;

      console.log(`Fetching detailed data for: ${username}`);
      
      // Get detailed influencer information
      const detailedInfo = await brightDataService.getInfluencerDetails(username);
      
      if (detailedInfo) {
        // Transform to local schema with detailed data
        const transformedData = brightDataService.transformToLocalSchema(detailedInfo);
        
        // Try to get analytics data
        try {
          const analytics = await brightDataService.getInfluencerAnalytics(username);
          if (analytics) {
            // Merge analytics data into the transformed data
            transformedData.instagramData.engagement_rate = analytics.engagement_rate;
            transformedData.averageEngagement = analytics.engagement_rate || 0;
            transformedData.averageLikes = analytics.average_likes || 0;
            transformedData.averageComments = analytics.average_comments || 0;
            transformedData.averageViews = analytics.average_views || 0;
          }
        } catch (analyticsError) {
          console.log(`Analytics not available for ${username}:`, analyticsError instanceof Error ? analyticsError.message : 'Unknown error');
        }

        // Try to get recent posts for additional insights
        try {
          const posts = await brightDataService.getInfluencerPosts(username, 5);
          if (posts && posts.length > 0) {
            // Add post insights to the data
            transformedData.recentPosts = posts.slice(0, 3).map((post: any) => ({
              id: post.id,
              caption: post.caption?.substring(0, 100) + '...',
              like_count: post.like_count,
              comment_count: post.comment_count,
              timestamp: post.timestamp
            }));
            
            // Calculate average engagement from recent posts
            const totalLikes = posts.reduce((sum: number, post: any) => sum + (post.like_count || 0), 0);
            const totalComments = posts.reduce((sum: number, post: any) => sum + (post.comment_count || 0), 0);
            const avgLikes = totalLikes / posts.length;
            const avgComments = totalComments / posts.length;
            
            transformedData.averageLikes = Math.round(avgLikes);
            transformedData.averageComments = Math.round(avgComments);
          }
        } catch (postsError) {
          console.log(`Posts not available for ${username}:`, postsError instanceof Error ? postsError.message : 'Unknown error');
        }

        detailedResults.push(transformedData);
        console.log(`✅ Successfully fetched detailed data for ${username}`);
      } else {
        console.log(`⚠️  No detailed data found for ${username}`);
      }
    } catch (error) {
      console.error(`❌ Error fetching detailed data for ${influencer.user_name || influencer.username}:`, error);
      // Still include the basic data if detailed fetch fails
      detailedResults.push(influencer);
    }
  }
  
  return detailedResults;
}

// Helper function to search local database
async function searchLocalDatabase(result: ProcessedRequirements): Promise<any[]> {
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

  // Add age conditions
  if (result.ageRanges) {
    query.$and.push({
      $or: [
        { "instagramData.ageDistribution.age": result.ageRanges },
        { "youtubeData.ageDistribution.age": result.ageRanges }
      ]
    });
  }

  console.log('Local Database Query:', JSON.stringify(query, null, 2));
  return await Influencer.find(query);
}

// Helper function to search Bright Data
async function searchBrightData(result: ProcessedRequirements): Promise<any[]> {
  const searchParams: BrightDataSearchParams = {
    limit: 50 // Limit results to avoid overwhelming response
  };

  // Build search query
  if (result.category) {
    searchParams.query = result.category;
  }

  if (result.city) {
    searchParams.location = result.city;
  }

  if (result.minFollowers || result.maxFollowers) {
    searchParams.min_followers = result.minFollowers;
    searchParams.max_followers = result.maxFollowers;
  }

  if (result.ageRanges) {
    searchParams.age_range = result.ageRanges;
  }

  if (result.country) {
    searchParams.country = result.country;
  }

  // Determine gender preference
  if (result.maleRatio !== null && result.femaleRatio !== null) {
    // If both are specified, use the higher ratio
    if (result.maleRatio > result.femaleRatio) {
      searchParams.gender = 'male';
    } else {
      searchParams.gender = 'female';
    }
  } else if (result.maleRatio !== null) {
    searchParams.gender = 'male';
  } else if (result.femaleRatio !== null) {
    searchParams.gender = 'female';
  }

  console.log('Bright Data Search Params:', searchParams);

  const brightDataInfluencers = await brightDataService.searchInfluencers(searchParams);
  return brightDataInfluencers.map(influencer => brightDataService.transformToLocalSchema(influencer));
}

// Helper function to deduplicate results
function deduplicateResults(results: any[]): any[] {
  const seen = new Set();
  return results.filter(result => {
    const key = result.user_name || result.username;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

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

// New endpoint to get Bright Data influencer details
export const handleBrightDataDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userName } = req.query as { userName: string };

    if (!userName) {
      res.status(400).json({
        success: false,
        message: "userName query parameter is required",
      });
      return;
    }

    if (!brightDataService.isAvailable()) {
      res.status(503).json({
        success: false,
        message: "Bright Data API is not available",
      });
      return;
    }

    // Get influencer details from Bright Data
    const influencerDetails = await brightDataService.getInfluencerDetails(userName);

    if (!influencerDetails) {
      res.status(404).json({
        success: false,
        message: "Influencer not found on Bright Data",
      });
      return;
    }

    // Transform to local schema
    const transformedData = brightDataService.transformToLocalSchema(influencerDetails);

    res.status(200).json({
      success: true,
      data: transformedData,
      source: 'brightdata'
    });

  } catch (error) {
    console.error('Error in /brightdata/details endpoint:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
};

// New endpoint to get Bright Data influencer analytics
export const handleBrightDataAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userName } = req.query as { userName: string };

    if (!userName) {
      res.status(400).json({
        success: false,
        message: "userName query parameter is required",
      });
      return;
    }

    if (!brightDataService.isAvailable()) {
      res.status(503).json({
        success: false,
        message: "Bright Data API is not available",
      });
      return;
    }

    // Get influencer analytics from Bright Data
    const analytics = await brightDataService.getInfluencerAnalytics(userName);

    if (!analytics) {
      res.status(404).json({
        success: false,
        message: "Analytics not found for this influencer",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: analytics,
      source: 'brightdata'
    });

  } catch (error) {
    console.error('Error in /brightdata/analytics endpoint:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
};

// New endpoint to get Bright Data influencer posts
export const handleBrightDataPosts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userName, limit = '10' } = req.query as { userName: string; limit?: string };

    if (!userName) {
      res.status(400).json({
        success: false,
        message: "userName query parameter is required",
      });
      return;
    }

    if (!brightDataService.isAvailable()) {
      res.status(503).json({
        success: false,
        message: "Bright Data API is not available",
      });
      return;
    }

    const limitNum = parseInt(limit) || 10;

    // Get influencer posts from Bright Data
    const posts = await brightDataService.getInfluencerPosts(userName, limitNum);

    res.status(200).json({
      success: true,
      data: posts,
      source: 'brightdata',
      count: posts.length
    });

  } catch (error) {
    console.error('Error in /brightdata/posts endpoint:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
};

// New endpoint to check Bright Data API status
export const handleBrightDataStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const isAvailable = brightDataService.isAvailable();
    
    res.status(200).json({
      success: true,
      data: {
        available: isAvailable,
        hasApiKey: !!process.env.BRIGHTDATA_API_KEY,
        message: isAvailable ? "Bright Data API is available" : "Bright Data API is not configured"
      }
    });

  } catch (error) {
    console.error('Error in /brightdata/status endpoint:', error instanceof Error ? error.message : 'Unknown error');
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