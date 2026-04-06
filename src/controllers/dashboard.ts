import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import Campaign from '../models/campaign';
import Influencer from '../models/influencer';
import { user as User } from '../models/auth';

// GET /dashboard/metrics - count campaigns, influencers, total budget etc.
export const getDashboardMetrics = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const [
      totalCampaigns,
      activeCampaigns,
      totalInfluencers,
      totalBrands,
      budgetAgg
    ] = await Promise.all([
      Campaign.countDocuments({ brandId: userId }),
      Campaign.countDocuments({ brandId: userId, status: 'Active' }),
      Influencer.countDocuments({}),
      User.countDocuments({ type: 'BRAND' }),
      Campaign.aggregate([
        { $match: { brandId: userId } },
        { $group: { _id: null, totalBudget: { $sum: '$budget' } } }
      ])
    ]);

    const totalBudget = budgetAgg[0]?.totalBudget || 0;

    res.json({
      success: true,
      data: {
        totalCampaigns,
        activeCampaigns,
        totalInfluencers,
        totalBrands,
        totalBudget
      }
    });
  } catch (error) {
    console.error('Get dashboard metrics error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

// GET /dashboard/campaigns - recent campaigns with limit query param
export const getRecentCampaigns = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const limit = parseInt(req.query.limit as string) || 5;
    const page = parseInt(req.query.page as string) || 1;
    const skip = (page - 1) * limit;

    const [campaigns, total] = await Promise.all([
      Campaign.find({ brandId: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Campaign.countDocuments({ brandId: userId })
    ]);

    const cleanedCampaigns = campaigns.map((c: any) => {
      const { aiSuggestionMetadata, ...rest } = c;
      return rest;
    });

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: cleanedCampaigns,
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
    console.error('Get recent campaigns error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

// GET /dashboard/trending-influencers - from Influencer model
export const getTrendingInfluencers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const limit = parseInt(req.query.limit as string) || 10;

    const influencers = await Influencer.find({})
      .sort({ 'instagramData.followers': -1, averageEngagement: -1 })
      .limit(limit)
      .select('name user_name profile_pic_url categoryInstagram instagramData.followers averageEngagement is_verified')
      .lean();

    res.json({
      success: true,
      data: influencers
    });
  } catch (error) {
    console.error('Get trending influencers error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

// GET /dashboard/campaign-stats?campaignId=...
export const getCampaignStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { campaignId } = req.query;

    if (campaignId) {
      const campaign = await Campaign.findOne({ _id: campaignId as string, brandId: userId }).lean();
      if (!campaign) {
        res.status(404).json({ success: false, message: 'Campaign not found' });
        return;
      }

      const { aiSuggestionMetadata, ...campaignData } = campaign as any;

      res.json({
        success: true,
        data: {
          campaign: campaignData,
          stats: {
            applicants: campaign.applicants?.length || 0,
            selected: campaign.selectedInfluencers?.length || 0,
            budget: campaign.budget,
            status: campaign.status
          }
        }
      });
    } else {
      // Return aggregate stats for all user campaigns
      const stats = await Campaign.aggregate([
        { $match: { brandId: userId } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalBudget: { $sum: '$budget' },
            avgBudget: { $avg: '$budget' }
          }
        }
      ]);

      res.json({
        success: true,
        data: stats
      });
    }
  } catch (error) {
    console.error('Get campaign stats error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};
