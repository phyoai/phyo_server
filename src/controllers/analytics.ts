import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../types';
import Campaign from '../models/campaign';
import Influencer from '../models/influencer';
import { payment } from '../models/subscription';

// GET /analytics/dashboard - aggregate campaign data for current user
export const getDashboardAnalytics = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const [
      totalCampaigns,
      activeCampaigns,
      completedCampaigns,
      draftCampaigns,
      campaignBudgetAgg
    ] = await Promise.all([
      Campaign.countDocuments({ brandId: userId }),
      Campaign.countDocuments({ brandId: userId, status: 'Active' }),
      Campaign.countDocuments({ brandId: userId, status: 'Completed' }),
      Campaign.countDocuments({ brandId: userId, status: 'Draft' }),
      Campaign.aggregate([
        { $match: { brandId: userId } },
        { $group: { _id: null, totalBudget: { $sum: '$budget' }, avgBudget: { $avg: '$budget' } } }
      ])
    ]);

    const budgetData = campaignBudgetAgg[0] || { totalBudget: 0, avgBudget: 0 };

    // Get recent campaigns
    const recentCampaigns = await Campaign.find({ brandId: userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('campaignName status budget createdAt')
      .lean();

    // Campaign status breakdown
    const statusBreakdown = await Campaign.aggregate([
      { $match: { brandId: userId } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          totalCampaigns,
          activeCampaigns,
          completedCampaigns,
          draftCampaigns,
          totalBudget: budgetData.totalBudget,
          avgBudget: Math.round(budgetData.avgBudget || 0)
        },
        statusBreakdown: statusBreakdown.reduce((acc: any, item: any) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        recentCampaigns
      }
    });
  } catch (error) {
    console.error('Get dashboard analytics error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

// GET /analytics/influencer-performance/:id? - influencer performance data
export const getInfluencerPerformance = async (req: AuthenticatedRequest<{ id?: string }>, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    if (id) {
      const influencer = await Influencer.findById(id).lean();
      if (!influencer) {
        res.status(404).json({ success: false, message: 'Influencer not found' });
        return;
      }

      res.json({
        success: true,
        data: {
          influencer,
          performance: {
            avgEngagement: influencer.averageEngagement || 0,
            avgLikes: influencer.averageLikes || 0,
            avgComments: influencer.averageComments || 0,
            avgViews: influencer.averageViews || 0,
            followers: influencer.instagramData?.followers || 0
          }
        }
      });
    } else {
      // Return top performing influencers
      const influencers = await Influencer.find({})
        .sort({ averageEngagement: -1 })
        .limit(20)
        .select('name user_name profile_pic_url averageEngagement averageLikes instagramData.followers categoryInstagram')
        .lean();

      res.json({
        success: true,
        data: influencers
      });
    }
  } catch (error) {
    console.error('Get influencer performance error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

// GET /analytics/campaign-performance/:campaignId
export const getCampaignPerformance = async (req: AuthenticatedRequest<{ campaignId: string }>, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { campaignId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(campaignId)) {
      res.status(400).json({ success: false, message: 'Campaign ID must be valid' });
      return;
    }

    const campaign = await Campaign.findOne({ _id: campaignId, brandId: userId })
      .populate('applicants', 'name email username')
      .populate('selectedInfluencers', 'name email username')
      .lean();

    if (!campaign) {
      res.status(404).json({ success: false, message: 'Campaign not found' });
      return;
    }

    const { aiSuggestionMetadata, ...campaignData } = campaign as any;

    res.json({
      success: true,
      data: {
        campaign: campaignData,
        performance: {
          totalApplicants: campaign.applicants?.length || 0,
          selectedInfluencers: campaign.selectedInfluencers?.length || 0,
          applicationRate: campaign.applicants?.length
            ? Math.round(((campaign.selectedInfluencers?.length || 0) / campaign.applicants.length) * 100)
            : 0,
          budgetUtilization: 0,
          estimatedReach: (campaign.selectedInfluencers?.length || 0) * 10000
        }
      }
    });
  } catch (error) {
    console.error('Get campaign performance error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

// GET /analytics/campaigns - list campaigns with lightweight analytics
export const getAllCampaignAnalytics = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [campaigns, total] = await Promise.all([
      Campaign.find({ brandId: userId }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Campaign.countDocuments({ brandId: userId })
    ]);

    const data = campaigns.map((campaign: any) => ({
      campaignId: campaign._id,
      campaignName: campaign.campaignName,
      status: campaign.status,
      reach: (campaign.selectedInfluencers?.length || 0) * 10000,
      impressions: (campaign.selectedInfluencers?.length || 0) * 15000,
      clicks: campaign.applicants?.length || 0,
      conversions: campaign.selectedInfluencers?.length || 0,
      engagementRate: campaign.applicants?.length
        ? Math.round(((campaign.selectedInfluencers?.length || 0) / campaign.applicants.length) * 100)
        : 0,
      cost: campaign.budget || 0,
      revenue: 0,
      roi: 0,
      startDate: campaign.timelines?.campaignStartDate,
      endDate: campaign.timelines?.campaignEndDate
    }));

    res.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: skip + data.length < total,
        hasPreviousPage: page > 1
      }
    });
  } catch (error) {
    console.error('Get all campaign analytics error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

// GET /analytics/profile - current-user profile analytics summary
export const getProfileAnalytics = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const [campaignCount, activeCampaignCount, campaignBudgetAgg] = await Promise.all([
      Campaign.countDocuments({ brandId: userId }),
      Campaign.countDocuments({ brandId: userId, status: 'Active' }),
      Campaign.aggregate([
        { $match: { brandId: userId } },
        { $group: { _id: null, totalBudget: { $sum: '$budget' } } }
      ])
    ]);

    res.json({
      success: true,
      data: {
        profileName: req.user?.email || 'Profile',
        followers: 0,
        growth: 0,
        avgEngagement: activeCampaignCount,
        totalViews: campaignCount,
        totalClicks: activeCampaignCount,
        totalConversions: activeCampaignCount,
        engagementRate: campaignCount ? Math.round((activeCampaignCount / campaignCount) * 100) : 0,
        reach: campaignCount * 10000,
        impressions: campaignCount * 15000,
        totalBudget: campaignBudgetAgg[0]?.totalBudget || 0,
        topPosts: []
      }
    });
  } catch (error) {
    console.error('Get profile analytics error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

// GET /analytics/campaigns/:campaignId
export const getCampaignAnalytics = async (req: AuthenticatedRequest<{ campaignId: string }>, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { campaignId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(campaignId)) {
      res.status(400).json({ success: false, message: 'Campaign ID must be valid' });
      return;
    }

    const campaign = await Campaign.findOne({ _id: campaignId, brandId: userId }).lean();

    if (!campaign) {
      res.status(404).json({ success: false, message: 'Campaign not found' });
      return;
    }

    const { aiSuggestionMetadata, ...campaignData } = campaign as any;

    res.json({
      success: true,
      data: {
        campaign: campaignData,
        analytics: {
          totalApplicants: campaign.applicants?.length || 0,
          selectedInfluencers: campaign.selectedInfluencers?.length || 0,
          campaignDuration: campaign.timelines
            ? Math.ceil(
                (new Date(campaign.timelines.campaignEndDate).getTime() -
                  new Date(campaign.timelines.campaignStartDate).getTime()) /
                  (1000 * 60 * 60 * 24)
              )
            : 0,
          daysUntilDeadline: campaign.timelines
            ? Math.max(
                0,
                Math.ceil(
                  (new Date(campaign.timelines.applicationDeadline).getTime() - Date.now()) /
                    (1000 * 60 * 60 * 24)
                )
              )
            : 0
        }
      }
    });
  } catch (error) {
    console.error('Get campaign analytics error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

// GET /analytics/reports - generate report
export const generateReport = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { type = 'campaigns', startDate, endDate } = req.query;

    const dateFilter: any = {};
    if (startDate) dateFilter.$gte = new Date(startDate as string);
    if (endDate) dateFilter.$lte = new Date(endDate as string);

    const campaignFilter: any = { brandId: userId };
    if (startDate || endDate) campaignFilter.createdAt = dateFilter;

    const campaigns = await Campaign.find(campaignFilter)
      .sort({ createdAt: -1 })
      .lean();

    const statusSummary = campaigns.reduce((acc: any, c: any) => {
      acc[c.status] = (acc[c.status] || 0) + 1;
      return acc;
    }, {});

    const totalBudget = campaigns.reduce((sum: number, c: any) => sum + (c.budget || 0), 0);
    const totalApplicants = campaigns.reduce((sum: number, c: any) => sum + (c.applicants?.length || 0), 0);
    const totalSelected = campaigns.reduce((sum: number, c: any) => sum + (c.selectedInfluencers?.length || 0), 0);

    res.json({
      success: true,
      data: {
        reportType: type,
        generatedAt: new Date(),
        period: { startDate: startDate || null, endDate: endDate || null },
        summary: {
          totalCampaigns: campaigns.length,
          totalBudget,
          totalApplicants,
          totalSelectedInfluencers: totalSelected,
          statusBreakdown: statusSummary
        },
        campaigns: campaigns.map((c: any) => {
          const { aiSuggestionMetadata, ...campaignData } = c;
          return campaignData;
        })
      }
    });
  } catch (error) {
    console.error('Generate report error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

// GET /analytics/earnings
export const getEarnings = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const payments = await payment.find({ userId })
      .sort({ createdAt: -1 })
      .lean();

    const completedPayments = payments.filter((p: any) => p.status === 'COMPLETED');
    const totalEarnings = completedPayments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

    // Monthly breakdown
    const monthlyBreakdown = completedPayments.reduce((acc: any, p: any) => {
      const month = new Date(p.createdAt).toISOString().slice(0, 7);
      acc[month] = (acc[month] || 0) + (p.amount || 0);
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        totalEarnings,
        totalTransactions: completedPayments.length,
        monthlyBreakdown,
        recentTransactions: completedPayments.slice(0, 10)
      }
    });
  } catch (error) {
    console.error('Get earnings error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};
