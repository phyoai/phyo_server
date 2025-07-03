import { Request, Response } from 'express';
import Campaign from '../models/campaign';
import { AuthenticatedRequest, ICampaign } from '../types';

interface CreateCampaignBody extends Omit<ICampaign, 'brandId' | 'createdAt' | 'updatedAt'> {}

interface UpdateCampaignBody extends Partial<CreateCampaignBody> {}

// Create a new campaign
export const createCampaign = async (req: AuthenticatedRequest<{}, {}, CreateCampaignBody>, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const {
      productImages,
      campaignName,
      campaignType,
      campaignBrief,
      deliverables,
      compensation,
      timelines,
      targetInfluencer,
      status = 'Draft'
    } = req.body;

    // Validate required fields
    if (!campaignName || !campaignType || !campaignBrief || !productImages?.length || 
        !deliverables?.length || !compensation || !timelines || !targetInfluencer) {
      res.status(400).json({ 
        message: 'All required fields must be provided',
        required: ['campaignName', 'campaignType', 'campaignBrief', 'productImages', 'deliverables', 'compensation', 'timelines', 'targetInfluencer']
      });
      return;
    }

    const newCampaign = new Campaign({
      brandId: userId,
      productImages,
      campaignName,
      campaignType,
      campaignBrief,
      deliverables,
      compensation,
      timelines,
      targetInfluencer,
      status
    });

    await newCampaign.save();

    res.status(201).json({
      message: 'Campaign created successfully',
      data: newCampaign
    });
  } catch (error) {
    console.error('Create campaign error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get all campaigns (with optional filters)
export const getCampaigns = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      status, 
      campaignType, 
      brandId, 
      page = 1, 
      limit = 10,
      search,
      niche,
      minBudget,
      maxBudget
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build filter object
    const filter: any = {};
    
    if (status) filter.status = status;
    if (campaignType) filter.campaignType = new RegExp(campaignType as string, 'i');
    if (brandId) filter.brandId = brandId;
    if (niche) filter['targetInfluencer.targetNiche'] = { $in: [new RegExp(niche as string, 'i')] };
    
    if (search) {
      filter.$or = [
        { campaignName: new RegExp(search as string, 'i') },
        { campaignBrief: new RegExp(search as string, 'i') },
        { campaignType: new RegExp(search as string, 'i') }
      ];
    }

    if (minBudget || maxBudget) {
      filter['compensation.amount'] = {};
      if (minBudget) filter['compensation.amount'].$gte = parseFloat(minBudget as string);
      if (maxBudget) filter['compensation.amount'].$lte = parseFloat(maxBudget as string);
    }

    const campaigns = await Campaign.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('brandId', 'companyName email')
      .lean();

    const total = await Campaign.countDocuments(filter);
    const totalPages = Math.ceil(total / limitNum);

    res.json({
      message: 'Campaigns retrieved successfully',
      data: campaigns,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalItems: total,
        itemsPerPage: limitNum,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      }
    });
  } catch (error) {
    console.error('Get campaigns error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get campaign by ID
export const getCampaignById = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const campaign = await Campaign.findById(id)
      .populate('brandId', 'companyName email website')
      .populate('applicants', 'name email username')
      .populate('selectedInfluencers', 'name email username')
      .lean();

    if (!campaign) {
      res.status(404).json({ message: 'Campaign not found' });
      return;
    }

    res.json({
      message: 'Campaign retrieved successfully',
      data: campaign
    });
  } catch (error) {
    console.error('Get campaign error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get campaigns by brand (for authenticated brand users)
export const getBrandCampaigns = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { status, page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const filter: any = { brandId: userId };
    if (status) filter.status = status;

    const campaigns = await Campaign.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('applicants', 'name email username')
      .populate('selectedInfluencers', 'name email username')
      .lean();

    const total = await Campaign.countDocuments(filter);
    const totalPages = Math.ceil(total / limitNum);

    res.json({
      message: 'Brand campaigns retrieved successfully',
      data: campaigns,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalItems: total,
        itemsPerPage: limitNum,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      }
    });
  } catch (error) {
    console.error('Get brand campaigns error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Update campaign
export const updateCampaign = async (req: AuthenticatedRequest<{ id: string }, {}, UpdateCampaignBody>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const campaign = await Campaign.findOne({ _id: id, brandId: userId });

    if (!campaign) {
      res.status(404).json({ message: 'Campaign not found or you do not have permission to update it' });
      return;
    }

    // Prevent updating completed or cancelled campaigns
    if (campaign.status === 'Completed' || campaign.status === 'Cancelled') {
      res.status(400).json({ message: 'Cannot update completed or cancelled campaigns' });
      return;
    }

    const updatedCampaign = await Campaign.findByIdAndUpdate(
      id,
      { $set: req.body },
      { new: true, runValidators: true }
    ).populate('brandId', 'companyName email');

    res.json({
      message: 'Campaign updated successfully',
      data: updatedCampaign
    });
  } catch (error) {
    console.error('Update campaign error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Delete campaign
export const deleteCampaign = async (req: AuthenticatedRequest<{ id: string }>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const campaign = await Campaign.findOne({ _id: id, brandId: userId });

    if (!campaign) {
      res.status(404).json({ message: 'Campaign not found or you do not have permission to delete it' });
      return;
    }

    // Prevent deleting active campaigns with applicants
    if (campaign.status === 'Active' && campaign.applicants && campaign.applicants.length > 0) {
      res.status(400).json({ 
        message: 'Cannot delete active campaigns with applicants. Please cancel the campaign first.' 
      });
      return;
    }

    await Campaign.findByIdAndDelete(id);

    res.json({
      message: 'Campaign deleted successfully'
    });
  } catch (error) {
    console.error('Delete campaign error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Apply to campaign (for influencers)
export const applyCampaign = async (req: AuthenticatedRequest<{ id: string }>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const campaign = await Campaign.findById(id);

    if (!campaign) {
      res.status(404).json({ message: 'Campaign not found' });
      return;
    }

    if (campaign.status !== 'Active') {
      res.status(400).json({ message: 'Campaign is not active for applications' });
      return;
    }

    // Check if application deadline has passed
    if (new Date() > campaign.timelines.applicationDeadline) {
      res.status(400).json({ message: 'Application deadline has passed' });
      return;
    }

    // Check if user already applied
    if (campaign.applicants?.includes(userId)) {
      res.status(400).json({ message: 'You have already applied to this campaign' });
      return;
    }

    // Add user to applicants
    await Campaign.findByIdAndUpdate(
      id,
      { $addToSet: { applicants: userId } },
      { new: true }
    );

    res.json({
      message: 'Application submitted successfully'
    });
  } catch (error) {
    console.error('Apply campaign error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Select influencer for campaign (for brands)
export const selectInfluencer = async (req: AuthenticatedRequest<{ id: string }, {}, { influencerId: string }>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { influencerId } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (!influencerId) {
      res.status(400).json({ message: 'Influencer ID is required' });
      return;
    }

    const campaign = await Campaign.findOne({ _id: id, brandId: userId });

    if (!campaign) {
      res.status(404).json({ message: 'Campaign not found or you do not have permission to modify it' });
      return;
    }

    // Check if influencer applied
    if (!campaign.applicants?.includes(influencerId)) {
      res.status(400).json({ message: 'Influencer has not applied to this campaign' });
      return;
    }

    // Check if influencer is already selected
    if (campaign.selectedInfluencers?.includes(influencerId)) {
      res.status(400).json({ message: 'Influencer is already selected' });
      return;
    }

    // Add influencer to selected list
    await Campaign.findByIdAndUpdate(
      id,
      { $addToSet: { selectedInfluencers: influencerId } },
      { new: true }
    );

    res.json({
      message: 'Influencer selected successfully'
    });
  } catch (error) {
    console.error('Select influencer error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}; 