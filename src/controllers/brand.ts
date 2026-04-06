import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { user as User } from '../models/auth';
import Campaign from '../models/campaign';

// GET /brands - get all brands
export const getBrands = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const { search, industry, location } = req.query;

    const filter: any = { type: 'BRAND' };

    if (search) {
      filter.$or = [
        { companyName: new RegExp(search as string, 'i') },
        { industry: new RegExp(search as string, 'i') },
        { description: new RegExp(search as string, 'i') }
      ];
    }

    if (industry) {
      filter.industry = new RegExp(industry as string, 'i');
    }

    if (location) {
      filter.location = new RegExp(location as string, 'i');
    }

    const [brands, total] = await Promise.all([
      User.find(filter)
        .select('-password -resetPasswordToken -resetPasswordExpires -emailVerificationOTP -emailVerificationExpires')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: brands,
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
    console.error('Get brands error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

// GET /brands/:id - get brand by ID
export const getBrandById = async (req: AuthenticatedRequest<{ id: string }>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const brand = await User.findOne({ _id: id, type: 'BRAND' })
      .select('-password -resetPasswordToken -resetPasswordExpires -emailVerificationOTP -emailVerificationExpires')
      .lean();

    if (!brand) {
      res.status(404).json({ success: false, message: 'Brand not found' });
      return;
    }

    res.json({
      success: true,
      data: brand
    });
  } catch (error) {
    console.error('Get brand by ID error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

// GET /brands/:id/campaigns - get brand campaigns
export const getBrandCampaigns = async (req: AuthenticatedRequest<{ id: string }>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [campaigns, total] = await Promise.all([
      Campaign.find({ brandId: id }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Campaign.countDocuments({ brandId: id })
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
    console.error('Get brand campaigns error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

// GET /brands/:id/stats - aggregate brand campaign stats
export const getBrandStats = async (req: AuthenticatedRequest<{ id: string }>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const [campaignCount, activeCampaignCount, completedCampaignCount, budgetAggregate] = await Promise.all([
      Campaign.countDocuments({ brandId: id }),
      Campaign.countDocuments({ brandId: id, status: 'Active' }),
      Campaign.countDocuments({ brandId: id, status: 'Completed' }),
      Campaign.aggregate([
        { $match: { brandId: id } },
        {
          $group: {
            _id: null,
            totalBudget: { $sum: '$budget' },
            averageBudget: { $avg: '$budget' }
          }
        }
      ])
    ]);

    const budgetStats = budgetAggregate[0] || { totalBudget: 0, averageBudget: 0 };

    res.json({
      success: true,
      data: {
        campaignCount,
        activeCampaignCount,
        completedCampaignCount,
        totalBudget: budgetStats.totalBudget,
        averageBudget: Math.round(budgetStats.averageBudget || 0)
      }
    });
  } catch (error) {
    console.error('Get brand stats error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

// GET /brands/me - get current user's brand profile
export const getMyBrand = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const brand = await User.findOne({ _id: userId, type: 'BRAND' })
      .select('-password -resetPasswordToken -resetPasswordExpires -emailVerificationOTP -emailVerificationExpires')
      .lean();

    if (!brand) {
      res.status(404).json({ success: false, message: 'Brand profile not found' });
      return;
    }

    res.json({
      success: true,
      data: brand
    });
  } catch (error) {
    console.error('Get my brand error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

// GET /brands/nearby - filter by location
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
      filter.$or = [
        { location: new RegExp(location as string, 'i') },
        { 'contact.city': new RegExp(location as string, 'i') }
      ];
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

// GET /brands/location/search
export const searchBrandsByLocation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { q, location, country, industry, page: pageParam = '1', limit: limitParam = '20' } = req.query;

    const page = parseInt(pageParam as string);
    const limit = parseInt(limitParam as string);
    const skip = (page - 1) * limit;

    const filter: any = { type: 'BRAND' };

    if (q) {
      filter.$or = [
        { companyName: new RegExp(q as string, 'i') },
        { industry: new RegExp(q as string, 'i') }
      ];
    }

    if (location) {
      filter.location = new RegExp(location as string, 'i');
    }

    if (country) {
      filter.country = new RegExp(country as string, 'i');
    }

    if (industry) {
      filter.industry = new RegExp(industry as string, 'i');
    }

    const [brands, total] = await Promise.all([
      User.find(filter)
        .select('-password -resetPasswordToken -resetPasswordExpires -emailVerificationOTP -emailVerificationExpires')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: brands,
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
    console.error('Search brands by location error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};
