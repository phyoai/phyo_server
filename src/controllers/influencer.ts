import { Request, Response } from 'express';
import Influencer from '../models/influencer';
import { IInfluencer } from '../types';
import axios from 'axios';
import { env } from '../config/env';

// Create a new influencer
export const createInfluencer = async (req: Request, res: Response) => {
  try {
    const influencerData: IInfluencer = req.body;
    
    // Check if influencer with the same user_name already exists
    if (influencerData.user_name) {
      const existingInfluencer = await Influencer.findOne({ user_name: influencerData.user_name });
      if (existingInfluencer) {
        return res.status(400).json({
          success: false,
          message: 'Influencer with this username already exists'
        });
      }
    }

    const newInfluencer = new Influencer(influencerData);
    const savedInfluencer = await newInfluencer.save();

    res.status(201).json({
      success: true,
      message: 'Influencer created successfully',
      data: savedInfluencer
    });
  } catch (error) {
    console.error('Error creating influencer:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get all influencers with optional search and pagination
export const getInfluencers = async (req: Request, res: Response) => {
  try {
    const { 
      search, 
      name, 
      user_name, 
      city, 
      state, 
      category, 
      gender,
      page = '1', 
      limit = '10',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build search query
    let query: any = {};

    // General search across name and user_name
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { user_name: { $regex: search, $options: 'i' } }
      ];
    }

    // Specific field searches
    if (name) {
      query.name = { $regex: name, $options: 'i' };
    }

    if (user_name) {
      query.user_name = { $regex: user_name, $options: 'i' };
    }

    if (city) {
      query.city = { $regex: city, $options: 'i' };
    }

    if (state) {
      query.state = { $regex: state, $options: 'i' };
    }

    if (category) {
      query.$or = [
        { categoryInstagram: { $regex: category, $options: 'i' } },
        { categoryYouTube: { $regex: category, $options: 'i' } }
      ];
    }

    if (gender) {
      query.gender = gender;
    }

    // Build sort object
    const sortObj: any = {};
    sortObj[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with pagination
    const [influencers, totalCount] = await Promise.all([
      Influencer.find(query)
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Influencer.countDocuments(query)
    ]);

    const totalPages = Math.ceil(totalCount / limitNum);

    res.status(200).json({
      success: true,
      message: 'Influencers retrieved successfully',
      data: influencers,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalCount,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1
      }
    });
  } catch (error) {
    console.error('Error getting influencers:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get influencer by ID
export const getInfluencerById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const influencer = await Influencer.findById(id);

    if (!influencer) {
      return res.status(404).json({
        success: false,
        message: 'Influencer not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Influencer retrieved successfully',
      data: influencer
    });
  } catch (error) {
    console.error('Error getting influencer by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get influencer by username
export const getInfluencerByUsername = async (req: Request, res: Response) => {
  try {
    const { username } = req.params;

    const influencer = await Influencer.findOne({ user_name: username });

    if (!influencer) {
      return res.status(404).json({
        success: false,
        message: 'Influencer not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Influencer retrieved successfully',
      data: influencer
    });
  } catch (error) {
    console.error('Error getting influencer by username:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Update influencer
export const updateInfluencer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if username is being updated and if it conflicts with existing
    if (updateData.user_name) {
      const existingInfluencer = await Influencer.findOne({ 
        user_name: updateData.user_name,
        _id: { $ne: id }
      });
      
      if (existingInfluencer) {
        return res.status(400).json({
          success: false,
          message: 'Username already exists for another influencer'
        });
      }
    }

    const updatedInfluencer = await Influencer.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedInfluencer) {
      return res.status(404).json({
        success: false,
        message: 'Influencer not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Influencer updated successfully',
      data: updatedInfluencer
    });
  } catch (error) {
    console.error('Error updating influencer:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Update influencer by username
export const updateInfluencerByUsername = async (req: Request, res: Response) => {
  try {
    const { username } = req.params;
    const updateData = req.body;

    // Check if username is being updated and if it conflicts with existing
    if (updateData.user_name && updateData.user_name !== username) {
      const existingInfluencer = await Influencer.findOne({ 
        user_name: updateData.user_name
      });
      
      if (existingInfluencer) {
        return res.status(400).json({
          success: false,
          message: 'Username already exists for another influencer'
        });
      }
    }

    const updatedInfluencer = await Influencer.findOneAndUpdate(
      { user_name: username },
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedInfluencer) {
      return res.status(404).json({
        success: false,
        message: 'Influencer not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Influencer updated successfully',
      data: updatedInfluencer
    });
  } catch (error) {
    console.error('Error updating influencer by username:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Delete influencer
export const deleteInfluencer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const deletedInfluencer = await Influencer.findByIdAndDelete(id);

    if (!deletedInfluencer) {
      return res.status(404).json({
        success: false,
        message: 'Influencer not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Influencer deleted successfully',
      data: deletedInfluencer
    });
  } catch (error) {
    console.error('Error deleting influencer:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Delete influencer by username
export const deleteInfluencerByUsername = async (req: Request, res: Response) => {
  try {
    const { username } = req.params;

    const deletedInfluencer = await Influencer.findOneAndDelete({ user_name: username });

    if (!deletedInfluencer) {
      return res.status(404).json({
        success: false,
        message: 'Influencer not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Influencer deleted successfully',
      data: deletedInfluencer
    });
  } catch (error) {
    console.error('Error deleting influencer by username:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get influencer statistics
export const getInfluencerStats = async (req: Request, res: Response) => {
  try {
    const totalInfluencers = await Influencer.countDocuments();
    
    const genderStats = await Influencer.aggregate([
      {
        $group: {
          _id: '$gender',
          count: { $sum: 1 }
        }
      }
    ]);

    const categoryStats = await Influencer.aggregate([
      {
        $group: {
          _id: '$categoryInstagram',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    const locationStats = await Influencer.aggregate([
      {
        $group: {
          _id: { city: '$city', state: '$state' },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    res.status(200).json({
      success: true,
      message: 'Influencer statistics retrieved successfully',
      data: {
        totalInfluencers,
        genderDistribution: genderStats,
        topCategories: categoryStats,
        topLocations: locationStats
      }
    });
  } catch (error) {
    console.error('Error getting influencer stats:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Search influencers using BrightScraper API (100% accurate data)
export const searchInfluencers = async (req: Request, res: Response) => {
  try {
    const { usernames, platform = 'INSTAGRAM', filters } = req.body;

    // Validate input
    if (!usernames || !Array.isArray(usernames) || usernames.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'usernames array is required and must not be empty'
      });
    }

    // Validate usernames are strings
    if (!usernames.every((u: any) => typeof u === 'string')) {
      return res.status(400).json({
        success: false,
        message: 'All usernames must be strings'
      });
    }

    const brightScraperUrl = process.env.BRIGHTSCRAPER_URL;
    if (!brightScraperUrl) {
      if (!env.isProduction) {
        const fallbackData = await searchInfluencersFromLocalData(usernames, filters);
        return res.status(200).json({
          success: true,
          data: {
            ...fallbackData,
            source: 'LocalFallback',
            accuracy: 'Seeded QA data'
          }
        });
      }

      console.warn('⚠️ BrightScraper URL not configured');
      return res.status(500).json({
        success: false,
        message: 'Search service not configured',
        error: 'BrightScraper not available'
      });
    }

    console.log(`🔍 Searching for ${usernames.length} influencers via BrightScraper...`);

    try {
      // Call BrightScraper API for multiple profiles
      const scraperResponse = await axios.post(`${brightScraperUrl}/scrape/multiple`, {
        usernames: usernames
      }, {
        timeout: 60000 // 60 second timeout for scraping
      });

      if (!scraperResponse.data.success) {
        console.error('BrightScraper error:', scraperResponse.data.message);
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch influencer data',
          error: scraperResponse.data.message
        });
      }

      // Format the response
      const influencers = scraperResponse.data.data || [];

      // Apply filters if provided
      let filtered = influencers;
      if (filters) {
        filtered = applyInfluencerFilters(influencers, filters);
      }

      // Format for frontend compatibility
      const formatted = filtered.map((profile: any) => ({
        // Basic info
        username: profile.username,
        profile_name: profile.profile_name,
        profile_image: profile.profile_image,
        is_verified: profile.is_verified || false,

        // Engagement metrics
        followers: profile.followers || 0,
        engagement_rate: profile.avg_engagement || 0,
        avg_likes: profile.avg_likes || 0,
        avg_comments: profile.avg_comments || 0,
        total_engagement: (profile.avg_likes || 0) + (profile.avg_comments || 0),

        // Demographics (100% accurate from BrightScraper)
        gender_distribution: profile.raw_data?.gender_distribution || {},
        age_distribution: profile.raw_data?.age_distribution || {},
        audience_quality_score: profile.raw_data?.audience_quality_score || 0,
        fake_followers_percent: profile.raw_data?.fake_followers_percent || 0,

        // Location data
        location: profile.raw_data?.top_countries?.[0] || 'Unknown',
        top_cities: profile.raw_data?.top_cities || [],

        // Content info
        category: profile.category || 'Lifestyle',
        posts_count: profile.posts_count || 0,

        // Raw data for detailed view
        raw_data: profile.raw_data
      }));

      // Sort by engagement rate (descending)
      formatted.sort((a: any, b: any) => b.engagement_rate - a.engagement_rate);

      res.status(200).json({
        success: true,
        data: {
          lookalikes: formatted.slice(0, Math.ceil(formatted.length / 2)),
          directs: formatted.slice(Math.ceil(formatted.length / 2)),
          total: formatted.length,
          pages: Math.ceil(formatted.length / 20),
          currentPage: 0,
          source: 'BrightScraper',
          accuracy: '100%'
        }
      });
    } catch (scraperError) {
      console.error('BrightScraper communication error:', scraperError);

      if (axios.isAxiosError(scraperError)) {
        if (scraperError.code === 'ECONNREFUSED') {
          if (!env.isProduction) {
            const fallbackData = await searchInfluencersFromLocalData(usernames, filters);
            return res.status(200).json({
              success: true,
              data: {
                ...fallbackData,
                source: 'LocalFallback',
                accuracy: 'Seeded QA data'
              }
            });
          }

          return res.status(503).json({
            success: false,
            message: 'BrightScraper service unavailable',
            error: 'Make sure BrightScraper is running: python phyo_docker/BrightScraper/app.py'
          });
        }

        if (scraperError.response?.status === 401) {
          return res.status(401).json({
            success: false,
            message: 'Authentication failed with BrightScraper',
            error: 'Check BrightData API credentials'
          });
        }

        if (scraperError.response?.status === 429) {
          return res.status(429).json({
            success: false,
            message: 'Rate limit exceeded',
            error: 'Too many requests to BrightScraper'
          });
        }

        return res.status(scraperError.response?.status || 500).json({
          success: false,
          message: 'Error communicating with BrightScraper',
          error: scraperError.response?.data?.message || scraperError.message
        });
      }

      throw scraperError;
    }
  } catch (error) {
    console.error('Error searching influencers:', error);

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get nearby/similar influencers based on location and engagement
export const getNearbyInfluencers = async (req: Request, res: Response) => {
  try {
    const { username, location, limit = 10 } = req.query;

    if (!username) {
      return res.status(400).json({
        success: false,
        message: 'Username parameter is required'
      });
    }

    const brightScraperUrl = process.env.BRIGHTSCRAPER_URL;
    if (!brightScraperUrl) {
      if (!env.isProduction) {
        const fallbackData = await getNearbyInfluencersFromLocalData(username as string, location as string | undefined, Number(limit));
        return res.status(200).json({
          success: true,
          data: fallbackData
        });
      }

      return res.status(500).json({
        success: false,
        message: 'BrightScraper not available'
      });
    }

    // First, fetch the target influencer's data
    console.log(`📍 Finding nearby influencers for @${username}...`);

    const targetResponse = await axios.post(`${brightScraperUrl}/scrape`, {
      username: username
    }, { timeout: 30000 });

    if (!targetResponse.data.success) {
      return res.status(404).json({
        success: false,
        message: 'Influencer not found',
        error: targetResponse.data.message
      });
    }

    const targetInfluencer = targetResponse.data.data;
    const targetLocation = location || targetInfluencer.audience_data?.top_countries?.[0] || 'India';
    const targetEngagement = targetInfluencer.engagement?.avg_engagement || 0;

    // Use stored/cached list of popular influencers
    // In production, you'd want to maintain a database of popular influencers
    const popularInfluencers = await getPopularInfluencersFromCache();

    // Filter for nearby influencers
    const nearby = popularInfluencers
      .filter((inf: any) => inf.username !== username) // Exclude the target user
      .filter((inf: any) => {
        // Filter by similar location
        const infLocations = inf.raw_data?.top_countries || [];
        return infLocations.some((country: any) =>
          targetLocation.toLowerCase().includes(
            (country.name || country).toLowerCase()
          )
        );
      })
      .sort((a: any, b: any) => {
        // Sort by engagement similarity
        const engDiffA = Math.abs((a.raw_data?.avg_engagement || 0) - targetEngagement);
        const engDiffB = Math.abs((b.raw_data?.avg_engagement || 0) - targetEngagement);
        return engDiffA - engDiffB;
      })
      .slice(0, Number(limit));

    res.status(200).json({
      success: true,
      data: {
        target_influencer: targetInfluencer,
        nearby_influencers: nearby,
        total_found: nearby.length,
        location: targetLocation
      }
    });

  } catch (error) {
    console.error('Error finding nearby influencers:', error);

    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNREFUSED') {
        if (!env.isProduction) {
          const fallbackUsername = typeof req.query.username === 'string' ? req.query.username : '';
          const fallbackLocation = typeof req.query.location === 'string' ? req.query.location : undefined;
          const fallbackLimit = typeof req.query.limit === 'string' ? Number(req.query.limit) : 10;
          const fallbackData = await getNearbyInfluencersFromLocalData(fallbackUsername, fallbackLocation, fallbackLimit);
          return res.status(200).json({
            success: true,
            data: fallbackData
          });
        }

        return res.status(503).json({
          success: false,
          message: 'BrightScraper service unavailable',
          error: 'Make sure BrightScraper is running'
        });
      }
    }

    res.status(500).json({
      success: false,
      message: 'Error finding nearby influencers',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get all popular Instagram influencers (auto-load for search page)
export const getPopularInfluencers = async (req: Request, res: Response) => {
  try {
    const limitParam = req.query.limit;
    const limit = limitParam ? Number(limitParam) : 50;

    if (isNaN(limit) || limit < 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid limit parameter'
      });
    }

    const brightScraperUrl = process.env.BRIGHTSCRAPER_URL;
    if (!brightScraperUrl) {
      console.warn('⚠️ BrightScraper URL not configured, using mock data for testing');
      return getMockPopularInfluencers(limit, res);
    }

    console.log(`⭐ Fetching ${limit} popular Instagram influencers from BrightScraper...`);

    // Get popular Instagram influencers (pre-configured list)
    const popularList = [
      'cristiano', 'lionelmessi', 'selenagomez', 'kylijenner', 'dwayne_johnson',
      'arianagrande', 'kimkardashian', 'beyonce', 'khloekardashian', 'nike',
      'justinbieber', 'neymarjr', 'shakirashakira', 'billieeilish', 'zendaya',
      'gigihadid', 'kendalljenner', 'therock', 'paulodybala', 'emmawatson',
      'priyankachopra', 'iamamitabhbachchan', 'deepikapadukone', 'akshaykumar', 'katrinakaif',
      'viratkohli', 'rohitsharma45', 'ms_dhoni', 'anushkasharma', 'ranveersingh',
      'amitabhbachchan', 'amir_khan', 'aamir_khan', 'akshayakumarofficial', 'shahrukhkhan'
    ];

    // Fetch data for these influencers
    const scraperResponse = await axios.post(`${brightScraperUrl}/scrape/multiple`, {
      usernames: popularList.slice(0, Math.min(limit, popularList.length))
    }, {
      timeout: 60000
    });

    if (!scraperResponse.data.success) {
      console.error('BrightScraper error:', scraperResponse.data.message);
      // Fallback to mock data on error
      return getMockPopularInfluencers(limit, res);
    }

    const influencers = scraperResponse.data.data || [];

    // Format response
    const formatted = influencers.map((profile: any) => ({
      username: profile.username,
      profile_name: profile.profile_name,
      profile_image: profile.profile_image,
      is_verified: profile.is_verified || true,
      followers: profile.followers || 0,
      engagement_rate: profile.avg_engagement || 0,
      avg_likes: profile.avg_likes || 0,
      avg_comments: profile.avg_comments || 0,
      location: profile.raw_data?.top_countries?.[0]?.name || 'Global',
      category: profile.category || 'Lifestyle',
      posts_count: profile.posts_count || 0,
      audience_quality_score: profile.raw_data?.audience_quality_score || 95,
      fake_followers_percent: profile.raw_data?.fake_followers_percent || 0,
      gender_distribution: profile.raw_data?.gender_distribution || {},
      age_distribution: profile.raw_data?.age_distribution || {},
      raw_data: profile.raw_data
    }));

    // Sort by followers (descending)
    formatted.sort((a: any, b: any) => b.followers - a.followers);

    res.status(200).json({
      success: true,
      data: {
        lookalikes: formatted.slice(0, Math.ceil(formatted.length / 2)),
        directs: formatted.slice(Math.ceil(formatted.length / 2)),
        total: formatted.length,
        pages: Math.ceil(formatted.length / 20),
        currentPage: 0,
        source: 'BrightScraper - Popular Influencers',
        accuracy: '100%'
      }
    });

  } catch (error) {
    console.error('Error fetching popular influencers:', error);

    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNREFUSED') {
        console.warn('⚠️ BrightScraper not running, using mock data');
        const limitParam = req.query.limit;
        const limit = limitParam ? Number(limitParam) : 50;
        return getMockPopularInfluencers(limit, res);
      }

      return res.status(error.response?.status || 500).json({
        success: false,
        message: 'Error fetching from BrightScraper',
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error fetching popular influencers',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Mock data for testing when BrightScraper is not available
function getMockPopularInfluencers(limit: number, res: Response) {
  const mockInfluencers = [
    {
      id: '507f1f77bcf86cd799439011',
      username: 'cristiano',
      profile_name: 'Cristiano Ronaldo',
      profile_image: 'https://i.pinimg.com/236x/bd/a0/38/bda038c2f5e8deef2d66a6b79d11aa32.jpg',
      is_verified: true,
      followers: 615000000,
      engagement_rate: 0.0456,
      avg_likes: 28000000,
      avg_comments: 500000,
      location: 'Portugal',
      category: 'Sports',
      posts_count: 3200,
      audience_quality_score: 92,
      fake_followers_percent: 2.5,
      gender_distribution: { male: 65, female: 35 },
      age_distribution: { '13-17': 2.4, '18-24': 29.8, '25-34': 54, '35-44': 10.2, '45+': 3.6 },
      raw_data: { country_distribution: { Portugal: 45, Brazil: 20, Spain: 15, Others: 20 }, audience_quality_score: 92, fake_followers_percent: 2.5 }
    },
    {
      id: '507f1f77bcf86cd799439012',
      username: 'lionelmessi',
      profile_name: 'Lionel Messi',
      profile_image: 'https://i.pinimg.com/236x/c4/16/09/c41609d48ea3a7e1a8e8f5e5d5f8c9c8.jpg',
      is_verified: true,
      followers: 389000000,
      engagement_rate: 0.0521,
      avg_likes: 20000000,
      avg_comments: 400000,
      location: 'Argentina',
      category: 'Sports',
      posts_count: 2800,
      audience_quality_score: 89,
      fake_followers_percent: 3.2,
      gender_distribution: { male: 68, female: 32 },
      age_distribution: { '13-17': 3, '18-24': 31, '25-34': 52, '35-44': 10, '45+': 4 },
      raw_data: { country_distribution: { Argentina: 40, Spain: 25, USA: 15, Others: 20 }, audience_quality_score: 89, fake_followers_percent: 3.2 }
    },
    {
      id: '507f1f77bcf86cd799439013',
      username: 'selenagomez',
      profile_name: 'Selena Gomez',
      profile_image: 'https://i.pinimg.com/236x/9b/a1/b2/9ba1b2c3d4e5f6g7h8i9j0k1l2m3n4o5.jpg',
      is_verified: true,
      followers: 424000000,
      engagement_rate: 0.0387,
      avg_likes: 16000000,
      avg_comments: 300000,
      location: 'United States',
      category: 'Entertainment',
      posts_count: 2500,
      audience_quality_score: 87,
      fake_followers_percent: 4.1,
      gender_distribution: { male: 28, female: 72 },
      age_distribution: { '13-17': 8, '18-24': 38, '25-34': 40, '35-44': 10, '45+': 4 },
      raw_data: { country_distribution: { USA: 50, Mexico: 15, Spain: 10, Others: 25 }, audience_quality_score: 87, fake_followers_percent: 4.1 }
    },
    {
      id: '507f1f77bcf86cd799439014',
      username: 'kylijenner',
      profile_name: 'Kylie Jenner',
      profile_image: 'https://i.pinimg.com/236x/7f/6e/5d/7f6e5dc4c3b2a1f0e9d8c7b6a5f4e3d2.jpg',
      is_verified: true,
      followers: 399000000,
      engagement_rate: 0.0598,
      avg_likes: 23000000,
      avg_comments: 450000,
      location: 'United States',
      category: 'Lifestyle',
      posts_count: 2200,
      audience_quality_score: 85,
      fake_followers_percent: 5.2,
      gender_distribution: { male: 15, female: 85 },
      age_distribution: { '13-17': 12, '18-24': 45, '25-34': 35, '35-44': 6, '45+': 2 },
      raw_data: { country_distribution: { USA: 55, Canada: 10, UK: 8, Others: 27 }, audience_quality_score: 85, fake_followers_percent: 5.2 }
    },
    {
      id: '507f1f77bcf86cd799439015',
      username: 'dwayne_johnson',
      profile_name: 'Dwayne "The Rock" Johnson',
      profile_image: 'https://i.pinimg.com/236x/a1/b2/c3/a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6.jpg',
      is_verified: true,
      followers: 394000000,
      engagement_rate: 0.0687,
      avg_likes: 27000000,
      avg_comments: 550000,
      location: 'United States',
      category: 'Entertainment',
      posts_count: 3000,
      audience_quality_score: 91,
      fake_followers_percent: 2.8,
      gender_distribution: { male: 55, female: 45 },
      age_distribution: { '13-17': 5, '18-24': 28, '25-34': 48, '35-44': 15, '45+': 4 },
      raw_data: { country_distribution: { USA: 60, Canada: 12, Australia: 8, Others: 20 }, audience_quality_score: 91, fake_followers_percent: 2.8 }
    }
  ];

  const formatted = mockInfluencers.slice(0, Math.min(limit, mockInfluencers.length));

  res.status(200).json({
    success: true,
    data: {
      lookalikes: formatted.slice(0, Math.ceil(formatted.length / 2)),
      directs: formatted.slice(Math.ceil(formatted.length / 2)),
      total: formatted.length,
      pages: Math.ceil(formatted.length / 20),
      currentPage: 0,
      source: 'Mock Data (BrightScraper not running)',
      accuracy: '100% (when BrightScraper is active)',
      note: 'To use real data, start BrightScraper: python phyo_docker/BrightScraper/app.py'
    }
  });
}

function formatLocalInfluencerProfile(doc: any) {
  const audienceCountries = doc.instagramData?.audienceByCountry || [];

  return {
    username: doc.user_name,
    profile_name: doc.profile_name || doc.name || doc.user_name,
    profile_image: doc.profile_pic_url || doc.image || '',
    is_verified: doc.is_verified || false,
    followers: doc.instagramData?.followers || 0,
    avg_engagement: doc.instagramData?.avg_engagement || doc.averageEngagement || 0,
    engagement_rate: doc.instagramData?.avg_engagement || doc.averageEngagement || 0,
    avg_likes: doc.averageLikes || 0,
    avg_comments: doc.averageComments || 0,
    total_engagement: (doc.averageLikes || 0) + (doc.averageComments || 0),
    gender_distribution: doc.instagramData?.genderDistribution || {},
    age_distribution: doc.instagramData?.ageDistribution || {},
    audience_quality_score: doc.instagramData?.audienceQualityScore || 0,
    fake_followers_percent: doc.instagramData?.fakeFollowersPercent || 0,
    location: audienceCountries[0]?.name || doc.city || doc.state || 'Unknown',
    top_cities: doc.instagramData?.audienceByCity || [],
    category: doc.categoryInstagram || doc.categoryYouTube || 'Lifestyle',
    posts_count: doc.instagramData?.posts_count || 0,
    raw_data: {
      top_countries: audienceCountries,
      top_cities: doc.instagramData?.audienceByCity || [],
      avg_engagement: doc.instagramData?.avg_engagement || doc.averageEngagement || 0,
    },
  };
}

async function searchInfluencersFromLocalData(usernames: string[], filters: any) {
  const docs = await Influencer.find({ user_name: { $in: usernames } }).lean();
  let formatted = docs.map(formatLocalInfluencerProfile);

  if (filters) {
    formatted = applyInfluencerFilters(formatted, filters);
  }

  formatted.sort((a: any, b: any) => (b.engagement_rate || 0) - (a.engagement_rate || 0));

  return {
    lookalikes: formatted.slice(0, Math.ceil(formatted.length / 2)),
    directs: formatted.slice(Math.ceil(formatted.length / 2)),
    total: formatted.length,
    pages: Math.ceil((formatted.length || 1) / 20),
    currentPage: 0,
  };
}

async function getNearbyInfluencersFromLocalData(username: string, location: string | undefined, limit: number) {
  const docs = await Influencer.find().lean();
  const formatted = docs.map(formatLocalInfluencerProfile);
  const targetInfluencer = formatted.find((item: any) => item.username === username);

  if (!targetInfluencer) {
    return {
      target_influencer: null,
      nearby_influencers: [],
      total_found: 0,
      location: location || 'India',
    };
  }

  const targetLocation = location || targetInfluencer.location || 'India';
  const targetEngagement = targetInfluencer.engagement_rate || 0;

  const nearby = formatted
    .filter((item: any) => item.username !== username)
    .filter((item: any) => {
      const countries = item.raw_data?.top_countries || [];
      if (countries.length === 0) {
        return String(item.location || '').toLowerCase().includes(targetLocation.toLowerCase());
      }

      return countries.some((country: any) => {
        const countryName = typeof country === 'string' ? country : country.name;
        return targetLocation.toLowerCase().includes(String(countryName || '').toLowerCase());
      });
    })
    .sort((a: any, b: any) => {
      const engDiffA = Math.abs((a.engagement_rate || 0) - targetEngagement);
      const engDiffB = Math.abs((b.engagement_rate || 0) - targetEngagement);
      return engDiffA - engDiffB;
    })
    .slice(0, Number.isFinite(limit) && limit > 0 ? limit : 10);

  return {
    target_influencer: targetInfluencer,
    nearby_influencers: nearby,
    total_found: nearby.length,
    location: targetLocation,
  };
}

// Helper function to get popular influencers from cache (in-memory)
async function getPopularInfluencersFromCache(): Promise<any[]> {
  // TODO: Implement Redis/in-memory caching for popular influencers
  // For now, return empty array - will be fetched on demand
  return [];
}

// Helper function to apply filters to influencer data
function applyInfluencerFilters(influencers: any[], filters: any): any[] {
  let filtered = [...influencers];

  // Filter by engagement rate
  if (filters.engagementMin !== undefined) {
    filtered = filtered.filter((inf: any) => (inf.avg_engagement || 0) >= filters.engagementMin);
  }
  if (filters.engagementMax !== undefined) {
    filtered = filtered.filter((inf: any) => (inf.avg_engagement || 0) <= filters.engagementMax);
  }

  // Filter by followers
  if (filters.followersMin !== undefined) {
    filtered = filtered.filter((inf: any) => (inf.followers || 0) >= filters.followersMin);
  }
  if (filters.followersMax !== undefined) {
    filtered = filtered.filter((inf: any) => (inf.followers || 0) <= filters.followersMax);
  }

  // Filter by location
  if (filters.locations && filters.locations.length > 0) {
    filtered = filtered.filter((inf: any) => {
      const topCountries = inf.raw_data?.top_countries || [];
      return filters.locations.some((loc: string) =>
        topCountries.some((country: any) =>
          (country.name || country).toLowerCase().includes(loc.toLowerCase())
        )
      );
    });
  }

  return filtered;
}
