import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import Influencer from '../models/influencer';
import Campaign from '../models/campaign';
import { user as User } from '../models/auth';

// GET /trending/influencers - most followed/engaged from Influencer model
export const getTrendingInfluencers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const page = parseInt(req.query.page as string) || 1;
    const skip = (page - 1) * limit;

    const [influencers, total] = await Promise.all([
      Influencer.find({})
        .sort({ 'instagramData.followers': -1, averageEngagement: -1 })
        .skip(skip)
        .limit(limit)
        .select('name user_name profile_pic_url categoryInstagram instagramData averageEngagement averageLikes is_verified city state')
        .lean(),
      Influencer.countDocuments({})
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: influencers,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    });
  } catch (error) {
    console.error('Get trending influencers error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

// GET /trending/campaigns - most applied to campaigns
export const getTrendingCampaigns = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const page = parseInt(req.query.page as string) || 1;
    const skip = (page - 1) * limit;

    // Aggregate to find campaigns with most applicants
    const [campaigns, total] = await Promise.all([
      Campaign.aggregate([
        { $match: { status: 'Active' } },
        { $addFields: { applicantCount: { $size: { $ifNull: ['$applicants', []] } } } },
        { $sort: { applicantCount: -1, createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $project: {
            aiSuggestionMetadata: 0,
            suggestedInfluencers: 0
          }
        }
      ]),
      Campaign.countDocuments({ status: 'Active' })
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: campaigns,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    });
  } catch (error) {
    console.error('Get trending campaigns error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

// GET /trending/brands
export const getTrendingBrands = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const page = parseInt(req.query.page as string) || 1;
    const skip = (page - 1) * limit;

    // Get brands with most campaigns as "trending"
    const brandCampaignCounts = await Campaign.aggregate([
      { $group: { _id: '$brandId', campaignCount: { $sum: 1 } } },
      { $sort: { campaignCount: -1 } },
      { $skip: skip },
      { $limit: limit }
    ]);

    const brandIds = brandCampaignCounts.map((b: any) => b._id);

    const brands = await User.find({ _id: { $in: brandIds }, type: 'BRAND' })
      .select('-password -resetPasswordToken -resetPasswordExpires -emailVerificationOTP -emailVerificationExpires')
      .lean();

    // Merge campaign counts
    const brandsWithCount = brands.map((brand: any) => {
      const countInfo = brandCampaignCounts.find((b: any) => b._id === brand._id.toString());
      return { ...brand, campaignCount: countInfo?.campaignCount || 0 };
    });

    const total = await User.countDocuments({ type: 'BRAND' });
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: brandsWithCount,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    });
  } catch (error) {
    console.error('Get trending brands error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

// GET /categories/trending - trending niche categories
export const getTrendingCategories = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;

    // Aggregate from campaigns
    const campaignCategories = await Campaign.aggregate([
      { $unwind: '$targetInfluencer.targetNiche' },
      { $group: { _id: '$targetInfluencer.targetNiche', campaignCount: { $sum: 1 } } },
      { $sort: { campaignCount: -1 } },
      { $limit: limit }
    ]);

    // Aggregate from influencers
    const influencerCategories = await Influencer.aggregate([
      {
        $group: {
          _id: '$categoryInstagram',
          influencerCount: { $sum: 1 },
          avgEngagement: { $avg: '$averageEngagement' },
          avgFollowers: { $avg: '$instagramData.followers' }
        }
      },
      { $match: { _id: { $ne: null } } },
      { $sort: { influencerCount: -1 } },
      { $limit: limit }
    ]);

    res.json({
      success: true,
      data: {
        campaignCategories,
        influencerCategories
      }
    });
  } catch (error) {
    console.error('Get trending categories error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

// GET /trending/dashboard
export const getTrendingDashboard = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const [trendingInfluencers, trendingCampaigns, trendingCategories] = await Promise.all([
      Influencer.find({})
        .sort({ 'instagramData.followers': -1 })
        .limit(5)
        .select('name user_name profile_pic_url categoryInstagram instagramData.followers averageEngagement is_verified')
        .lean(),
      Campaign.aggregate([
        { $match: { status: 'Active' } },
        { $addFields: { applicantCount: { $size: { $ifNull: ['$applicants', []] } } } },
        { $sort: { applicantCount: -1 } },
        { $limit: 5 },
        { $project: { aiSuggestionMetadata: 0, suggestedInfluencers: 0 } }
      ]),
      Campaign.aggregate([
        { $unwind: '$targetInfluencer.targetNiche' },
        { $group: { _id: '$targetInfluencer.targetNiche', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ])
    ]);

    res.json({
      success: true,
      data: {
        trendingInfluencers,
        trendingCampaigns,
        trendingCategories
      }
    });
  } catch (error) {
    console.error('Get trending dashboard error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

// GET /influencers/nearby
export const getNearbyInfluencers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { city, state, country, limit: limitParam = '20' } = req.query;

    if (!city && !state && !country) {
      res.status(400).json({ success: false, message: 'city, state, or country query parameter is required' });
      return;
    }

    const limit = parseInt(limitParam as string);
    const filter: any = {};

    if (city) filter.city = new RegExp(city as string, 'i');
    if (state) filter.state = new RegExp(state as string, 'i');

    const influencers = await Influencer.find(filter)
      .sort({ 'instagramData.followers': -1 })
      .limit(limit)
      .lean();

    res.json({
      success: true,
      data: influencers
    });
  } catch (error) {
    console.error('Get nearby influencers error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

// GET /influencers/location/search
export const searchInfluencersByLocation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { q, city, state, category, page: pageParam = '1', limit: limitParam = '20' } = req.query;

    const page = parseInt(pageParam as string);
    const limit = parseInt(limitParam as string);
    const skip = (page - 1) * limit;

    const filter: any = {};

    if (q) {
      filter.$or = [
        { name: new RegExp(q as string, 'i') },
        { user_name: new RegExp(q as string, 'i') },
        { categoryInstagram: new RegExp(q as string, 'i') }
      ];
    }

    if (city) filter.city = new RegExp(city as string, 'i');
    if (state) filter.state = new RegExp(state as string, 'i');
    if (category) filter.categoryInstagram = new RegExp(category as string, 'i');

    const [influencers, total] = await Promise.all([
      Influencer.find(filter).sort({ 'instagramData.followers': -1 }).skip(skip).limit(limit).lean(),
      Influencer.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: influencers,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    });
  } catch (error) {
    console.error('Search influencers by location error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

// GET /brands/nearby (for trending controller use)
export const getNearbyBrands = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { location, country, limit: limitParam = '20' } = req.query;

    if (!location && !country) {
      res.status(400).json({ success: false, message: 'location or country query parameter is required' });
      return;
    }

    const limit = parseInt(limitParam as string);
    const filter: any = { type: 'BRAND' };

    if (location) {
      filter.location = new RegExp(location as string, 'i');
    }

    if (country) {
      filter.country = new RegExp(country as string, 'i');
    }

    const brands = await User.find(filter)
      .select('-password -resetPasswordToken -resetPasswordExpires -emailVerificationOTP -emailVerificationExpires')
      .limit(limit)
      .lean();

    res.json({
      success: true,
      data: brands
    });
  } catch (error) {
    console.error('Get nearby brands error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

// GET /nearby/dashboard
export const getNearbyDashboard = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { city, state, country } = req.query;

    const influencerFilter: any = {};
    const brandFilter: any = { type: 'BRAND' };

    if (city) {
      influencerFilter.city = new RegExp(city as string, 'i');
    }
    if (state) {
      influencerFilter.state = new RegExp(state as string, 'i');
    }
    if (country) {
      brandFilter.country = new RegExp(country as string, 'i');
    }

    const [nearbyInfluencers, nearbyBrands] = await Promise.all([
      Influencer.find(influencerFilter)
        .sort({ 'instagramData.followers': -1 })
        .limit(10)
        .select('name user_name profile_pic_url city state categoryInstagram instagramData.followers averageEngagement')
        .lean(),
      User.find(brandFilter)
        .select('-password -resetPasswordToken -resetPasswordExpires -emailVerificationOTP -emailVerificationExpires')
        .limit(10)
        .lean()
    ]);

    res.json({
      success: true,
      data: {
        nearbyInfluencers,
        nearbyBrands
      }
    });
  } catch (error) {
    console.error('Get nearby dashboard error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

// POST /users/location - update user location
export const updateUserLocation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { location, country, city, state, coordinates } = req.body;

    const updateData: any = {};
    if (location) updateData.location = location;
    if (country) updateData.country = country;

    await User.findByIdAndUpdate(userId, { $set: updateData });

    res.json({
      success: true,
      message: 'Location updated successfully',
      data: { location, country, city, state }
    });
  } catch (error) {
    console.error('Update user location error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

// GET /locations/supported
export const getSupportedLocations = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Get distinct cities and states from influencer data
    const [cities, states, countries] = await Promise.all([
      Influencer.distinct('city'),
      Influencer.distinct('state'),
      User.distinct('country', { type: 'BRAND' })
    ]);

    res.json({
      success: true,
      data: {
        cities: cities.filter(Boolean),
        states: states.filter(Boolean),
        countries: countries.filter(Boolean)
      }
    });
  } catch (error) {
    console.error('Get supported locations error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

// GET /campaigns/nearby
export const getNearbyCampaigns = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { country, page: pageParam = '1', limit: limitParam = '20' } = req.query;

    const page = parseInt(pageParam as string);
    const limit = parseInt(limitParam as string);
    const skip = (page - 1) * limit;

    const filter: any = { status: 'Active' };

    if (country) {
      filter['targetInfluencer.countries'] = { $in: [new RegExp(country as string, 'i')] };
    }

    const [campaigns, total] = await Promise.all([
      Campaign.aggregate([
        { $match: filter },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        { $project: { aiSuggestionMetadata: 0, suggestedInfluencers: 0 } }
      ]),
      Campaign.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: campaigns,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    });
  } catch (error) {
    console.error('Get nearby campaigns error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};
