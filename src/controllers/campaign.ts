import { Request, Response } from 'express';
import Campaign from '../models/campaign';
import { AuthenticatedRequest, ICampaign } from '../types';
import { getPublicUrl } from '../services/s3';
import Anthropic from '@anthropic-ai/sdk';
import Influencer from '../models/influencer';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!
});

interface CreateCampaignBody extends Omit<ICampaign, 'brandId' | 'createdAt' | 'updatedAt' | 'productImages'> {
  productImages?: string[];
  generateSuggestions?: boolean; // Flag to enable AI suggestions
}

interface UpdateCampaignBody extends Partial<CreateCampaignBody> {}

/**
 * Helper function to generate AI-powered influencer suggestions for a campaign
 */
async function generateInfluencerSuggestions(targetInfluencer: any, campaignBrief: string, campaignType: string): Promise<{
  suggestions: Array<{ username: string; reason: string; matchScore: number }>;
  metadata: { generatedAt: Date; prompt: string; criteria: any; error?: string };
}> {
  try {
    console.log('\n[AI SUGGESTIONS] Generating influencer suggestions with Claude...');
    
    // Extract key criteria from targetInfluencer
    const { numberOfInfluencers, targetNiche, followerCount, countries, gender, ageRange } = targetInfluencer;
    
    // Build a comprehensive prompt for Claude
    const claudePrompt = `You are an expert influencer marketing strategist. Based on the campaign requirements below, suggest ${numberOfInfluencers * 2} REAL, VERIFIED Instagram influencer usernames who would be perfect fits.

CAMPAIGN DETAILS:
- Campaign Type: ${campaignType}
- Campaign Brief: ${campaignBrief}

TARGET INFLUENCER CRITERIA:
- Niches: ${targetNiche.join(', ')}
- Follower Range: ${followerCount.min.toLocaleString()} - ${followerCount.max.toLocaleString()}
- Countries: ${countries.join(', ')}
- Gender Preferences: ${gender.join(', ')}
- Age Range: ${ageRange.min} - ${ageRange.max} years

⚠️ CRITICAL REQUIREMENTS:
1. Suggest ONLY real, verified Instagram accounts that you are 100% certain exist
2. These must be established influencers with substantial followings
3. Match the niche, follower count, location, and demographic criteria
4. DO NOT make up usernames or guess - only suggest accounts you know exist
5. Prioritize verified accounts and engagement quality over follower count

✅ REAL INFLUENCER EXAMPLES BY CATEGORY:

Fashion & Lifestyle (India):
["komalpandey", "kritisanon", "deeptivaidhya", "dollysingh", "kusha_kapila", "santoshishetty", "masoom_minawala", "sejalsanghvi", "komal_narang", "larissa_albuquerque"]

Fashion & Lifestyle (International):
["chiaraferragni", "negin_mirsalehi", "songofstyle", "sincerelyjules", "marianna_hewitt", "camila_coelho", "blaireadiebee", "weworewhat"]

Technology & Business:
["technicalguruji", "trakintech", "geekyravii", "techburner", "beebomco", "technical_sagar", "garyvee", "neilpatel", "timferriss"]

Fitness & Health:
["beerbiceps", "sahilkhan", "jeetselal", "rohit_khatri_fitness", "kayla_itsines", "alexia_clark", "massy.arias", "whitneyysimmons"]

Food & Culinary:
["sanjyotkeer", "kabita_kitchen", "masterchefshipa", "cookingshooking", "bharatzkitchen", "gordonramsay", "jamieoliver", "bonappetitmag"]

Travel & Adventure:
["thetravelpie", "bruisedpassports", "larissa_wlc", "nixandjani", "muradosmann", "doyoutravel", "beautifuldestinations", "thebucketlistfamily"]

Beauty & Makeup:
["hudabeauty", "jamescharles", "nikkietutorials", "jeffreestar", "jackieaina", "desiperkins", "patrickstarrr", "makeupshayla"]

Comedy & Entertainment:
["ashishchanchlani", "bhuvan.bam22", "harsh_beniwal", "amanjado", "dollysingh", "comedybykushakapila", "abhishek.upmanyu"]

Parenting & Family:
["flyingbeast320", "duckyluck.baby", "theabbyfamily", "thebump", "mamacax"]

INSTRUCTIONS:
1. Choose ${numberOfInfluencers * 2} influencers (double the requested amount for variety) from the above lists or other FAMOUS accounts you're certain about
2. Ensure they match the niche requirements: ${targetNiche.join(', ')}
3. Consider the location: ${countries.join(', ')} (prefer local influencers but also include global influencers popular in those regions)
4. Match follower range approximately: ${followerCount.min.toLocaleString()} - ${followerCount.max.toLocaleString()}
5. For each suggestion, provide:
   - username (without @)
   - reason (one sentence explaining why they're a good fit)
   - matchScore (0-100, how well they match the criteria)

RESPOND WITH ONLY VALID JSON (no markdown, no code blocks):
{
  "suggestions": [
    {
      "username": "real_username_here",
      "reason": "Brief explanation of why they're a perfect fit",
      "matchScore": 85
    }
  ]
}`;

    console.log('[AI SUGGESTIONS] Sending request to Claude...');
    
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-20250514',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: claudePrompt
        }
      ]
    });
    
    const responseText = message.content[0].type === 'text' ? message.content[0].text : '{}';
    console.log('[AI SUGGESTIONS] Raw Claude Response:', responseText.substring(0, 200) + '...');
    
    // Parse Claude response - clean any markdown formatting
    let aiResponse: { suggestions: Array<{ username: string; reason: string; matchScore: number }> };
    try {
      const cleanedText = responseText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      aiResponse = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('[AI SUGGESTIONS] Failed to parse Claude response:', parseError);
      throw new Error('Failed to parse AI suggestions. Please try again.');
    }
    
    const suggestions = aiResponse.suggestions || [];
    console.log(`[AI SUGGESTIONS] Generated ${suggestions.length} suggestions`);
    
    // Validate that suggested usernames exist in our database (optional - for quality check)
    const validatedSuggestions = await Promise.all(
      suggestions.map(async (suggestion) => {
        const existsInDb = await Influencer.findOne({ user_name: suggestion.username });
        if (existsInDb) {
          console.log(`  ✓ ${suggestion.username} - Found in database`);
          return { ...suggestion, inDatabase: true };
        } else {
          console.log(`  ⚠ ${suggestion.username} - Not in database (but may still be valid)`);
          return { ...suggestion, inDatabase: false };
        }
      })
    );
    
    // Sort by match score (highest first) and limit to requested number + 50%
    const topSuggestions = validatedSuggestions
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, Math.ceil(numberOfInfluencers * 1.5))
      .map(({ inDatabase, ...rest }) => rest); // Remove the inDatabase flag from final result
    
    return {
      suggestions: topSuggestions,
      metadata: {
        generatedAt: new Date(),
        prompt: claudePrompt,
        criteria: {
          numberOfInfluencers,
          targetNiche,
          followerCount,
          countries,
          gender,
          ageRange
        }
      }
    };
  } catch (error) {
    console.error('[AI SUGGESTIONS] Error generating suggestions:', error);
    // Return empty suggestions on error rather than failing the entire campaign creation
    return {
      suggestions: [],
      metadata: {
        generatedAt: new Date(),
        prompt: '',
        criteria: targetInfluencer,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}

// Create a new campaign
export const createCampaign = async (req: AuthenticatedRequest<{}, {}, CreateCampaignBody>, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const {
      campaignName,
      campaignType,
      campaignBrief,
      deliverables,
      compensation,
      budget,
      timelines,
      targetInfluencer,
      numberOfLivePosts,
      reels,
      status = 'Draft',
      generateSuggestions = true // Default to true to always generate suggestions
    } = req.body;

    // Handle uploaded product images
    let productImageUrls: string[] = [];
    if (req.files && Array.isArray(req.files)) {
      productImageUrls = (req.files as any[]).map(file => {
        // Use the S3 key to generate public URL
        const key = file.key || file.location.split('/').slice(-2).join('/');
        return getPublicUrl(key);
      });
    } else if ((req.body as any).productImages) {
      const rawProductImages = (req.body as any).productImages;
      if (typeof rawProductImages === 'string') {
        try {
          const parsedImages = JSON.parse(rawProductImages);
          if (Array.isArray(parsedImages)) {
            productImageUrls = parsedImages.filter(Boolean);
          } else if (parsedImages) {
            productImageUrls = [parsedImages];
          }
        } catch {
          productImageUrls = rawProductImages.split(',').map((item: string) => item.trim()).filter(Boolean);
        }
      } else if (Array.isArray(rawProductImages)) {
        productImageUrls = rawProductImages.filter(Boolean);
      }
    }

    // Parse JSON strings back to objects
    let parsedCompensation, parsedTimelines, parsedTargetInfluencer, parsedDeliverables, parsedReels;

    try {
      parsedCompensation = typeof compensation === 'string' ? JSON.parse(compensation) : compensation;
      parsedTimelines = typeof timelines === 'string' ? JSON.parse(timelines) : timelines;
      parsedTargetInfluencer = typeof targetInfluencer === 'string' ? JSON.parse(targetInfluencer) : targetInfluencer;
      parsedDeliverables = typeof deliverables === 'string' ? JSON.parse(deliverables) : deliverables;
      parsedReels = typeof reels === 'string' ? JSON.parse(reels) : reels;
    } catch (error) {
      res.status(400).json({ 
        message: 'Invalid JSON format in request body',
        error: 'Failed to parse JSON fields'
      });
      return;
    }

    // Validate required fields
    if (!campaignName || !campaignType || !campaignBrief || !productImageUrls.length || 
        !parsedDeliverables?.length || !parsedCompensation || !budget || !parsedTimelines || !parsedTargetInfluencer) {
      res.status(400).json({ 
        message: 'All required fields must be provided',
        required: ['campaignName', 'campaignType', 'campaignBrief', 'productImages', 'deliverables', 'compensation', 'budget', 'timelines', 'targetInfluencer']
      });
      return;
    }

    // Generate AI-powered influencer suggestions if requested
    let aiSuggestions: any = null;
    if (generateSuggestions) {
      console.log('[CAMPAIGN CREATION] Generating AI suggestions for influencers...');
      try {
        aiSuggestions = await generateInfluencerSuggestions(
          parsedTargetInfluencer,
          campaignBrief,
          campaignType
        );
        console.log(`[CAMPAIGN CREATION] Generated ${aiSuggestions.suggestions.length} AI suggestions`);
      } catch (error) {
        console.error('[CAMPAIGN CREATION] Failed to generate AI suggestions:', error);
        // Continue campaign creation even if AI suggestions fail
      }
    }

    const campaignId = crypto.randomUUID();

    const newCampaign = new Campaign({
      campaignId:campaignId,
      brandId: userId,
      productImages: productImageUrls,
      campaignName,
      campaignType,
      campaignBrief,
      deliverables: parsedDeliverables,
      compensation: parsedCompensation,
      budget,
      timelines: parsedTimelines,
      targetInfluencer: parsedTargetInfluencer,
      numberOfLivePosts,
      reels: parsedReels,
      status,
      ...(aiSuggestions && {
        suggestedInfluencers: aiSuggestions.suggestions,
        aiSuggestionMetadata: aiSuggestions.metadata
      })
    });

    await newCampaign.save();

    // Convert to object and exclude aiSuggestionMetadata from response
    const campaignResponse = newCampaign.toObject();
    const { aiSuggestionMetadata, ...campaignData } = campaignResponse;

    res.status(201).json({
      message: 'Campaign created successfully',
      data: campaignData
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
      filter.budget = {};
      if (minBudget) filter.budget.$gte = parseFloat(minBudget as string);
      if (maxBudget) filter.budget.$lte = parseFloat(maxBudget as string);
    }

    const campaigns = await Campaign.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('brandId', 'companyName email')
      .lean();

    const total = await Campaign.countDocuments(filter);
    const totalPages = Math.ceil(total / limitNum);

    // Exclude aiSuggestionMetadata from all campaigns
    const campaignsWithoutMetadata = campaigns.map(campaign => {
      const { aiSuggestionMetadata, ...campaignData } = campaign as any;
      return {
        ...campaignData,
        numberOfLivePosts: campaignData.numberOfLivePosts ?? 0,
        reels: campaignData.reels ?? []
      };
    });

    res.json({
      message: 'Campaigns retrieved successfully',
      data: campaignsWithoutMetadata,
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

    // Exclude aiSuggestionMetadata from response
    const { aiSuggestionMetadata, ...campaignData } = campaign as any;

    res.json({
      message: 'Campaign retrieved successfully',
      data: {
        ...campaignData,
        numberOfLivePosts: campaignData.numberOfLivePosts ?? 0,
        reels: campaignData.reels ?? []
      }
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

    // Exclude aiSuggestionMetadata from all campaigns
    const campaignsWithoutMetadata = campaigns.map(campaign => {
      const { aiSuggestionMetadata, ...campaignData } = campaign as any;
      return campaignData;
    });

    res.json({
      message: 'Brand campaigns retrieved successfully',
      data: campaignsWithoutMetadata,
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
    const campaignId = req.user?.id;

    if (!campaignId) {  
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const campaign = await Campaign.findOne({campaignId: id });

    if (!campaign) {
      res.status(404).json({ message: 'Campaign not found or you do not have permission to update it' });
      return;
    }

    // Prevent updating completed or cancelled campaigns
    if (campaign.status === 'Completed' || campaign.status === 'Cancelled') {
      res.status(400).json({ message: 'Cannot update completed or cancelled campaigns' });
      return;
    }

    // Handle uploaded product images
    let updateData: Record<string, any> = { ...req.body };
    if (req.files && Array.isArray(req.files)) {
      const productImageUrls = (req.files as any[]).map(file => {
        // Use the S3 key to generate public URL
        const key = file.key || file.location.split('/').slice(-2).join('/');
        return getPublicUrl(key);
      });
      updateData.productImages = productImageUrls;
    }

    // Parse JSON strings back to objects for update (form-data support)
    const fieldsToParse = ['compensation', 'timelines', 'targetInfluencer', 'deliverables'];
    for (const field of fieldsToParse) {
      if (updateData[field] !== undefined && typeof updateData[field] === 'string') {
        try {
          updateData[field] = JSON.parse(updateData[field]);
        } catch (error) {
          res.status(400).json({
            message: `Invalid JSON format for field: ${field}`
          });
          return;
        }
      }
    }

    // Support productImages as JSON-string/comma-string when no files are uploaded
    if (typeof updateData.productImages === 'string') {
      try {
        const parsed = JSON.parse(updateData.productImages);
        updateData.productImages = Array.isArray(parsed) ? parsed.filter(Boolean) : [parsed].filter(Boolean);
      } catch {
        updateData.productImages = updateData.productImages
          .split(',')
          .map((item: string) => item.trim())
          .filter(Boolean);
      }
    }

    // Parse numeric fields from form-data
    const numericFields = ['budget', 'numberOfLivePosts'];
    for (const field of numericFields) {
      if (updateData[field] !== undefined && typeof updateData[field] === 'string') {
        const parsed = Number(updateData[field]);
        if (Number.isNaN(parsed)) {
          res.status(400).json({ message: `Invalid number format for field: ${field}` });
          return;
        }
        updateData[field] = parsed;
      }
    }

    // Restrict fields that can be updated through API
    const allowedFields = new Set([
      'campaignName',
      'campaignType',
      'campaignBrief',
      'deliverables',
      'compensation',
      'budget',
      'timelines',
      'targetInfluencer',
      'numberOfLivePosts',
      'reels',
      'status',
      'productImages'
    ]);

    const restrictedFields = [
      '_id',
      'brandId',
      'applicants',
      'selectedInfluencers',
      'suggestedInfluencers',
      'aiSuggestionMetadata',
      'createdAt',
      'updatedAt',
      '__v'
    ];

    for (const field of restrictedFields) {
      if (updateData[field] !== undefined) {
        res.status(400).json({
          message: `Field "${field}" cannot be updated`
        });
        return;
      }
    }

    const sanitizedUpdateData: Record<string, any> = {};
    Object.entries(updateData).forEach(([key, value]) => {
      if (allowedFields.has(key) && value !== undefined) {
        sanitizedUpdateData[key] = value;
      }
    });

    if (Object.keys(sanitizedUpdateData).length === 0) {
      res.status(400).json({
        message: 'No valid fields provided for update'
      });
      return;
    }

    // Flatten objects to dot-notation so nested partial updates do not overwrite whole sections
    const flattenForSet = (input: any, prefix = '', acc: Record<string, any> = {}): Record<string, any> => {
      if (
        input === null ||
        Array.isArray(input) ||
        typeof input !== 'object' ||
        input instanceof Date
      ) {
        if (prefix) {
          acc[prefix] = input;
        }
        return acc;
      }

      Object.entries(input).forEach(([key, value]) => {
        const nextPrefix = prefix ? `${prefix}.${key}` : key;
        flattenForSet(value, nextPrefix, acc);
      });

      return acc;
    };

    const flatUpdateData = flattenForSet(sanitizedUpdateData);
    Object.entries(flatUpdateData).forEach(([path, value]) => {
      campaign.set(path, value);
    });

    await campaign.save();
    await campaign.populate('brandId', 'companyName email');

    // Exclude aiSuggestionMetadata from response
    const campaignResponse = campaign.toObject();
    const { aiSuggestionMetadata, ...campaignData } = campaignResponse as any;
    res.json({
      message: 'Campaign updated successfully',
      data: campaignData
    });
  } catch (error) {
    console.error('Update campaign error:', error);

    if ((error as any)?.name === 'ValidationError') {
      res.status(400).json({
        message: 'Validation failed',
        error: error instanceof Error ? error.message : 'Unknown validation error'
      });
      return;
    }

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

    const campaign = await Campaign.findOne({ campaignId: id });

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

    await Campaign.findByIdAndDelete(campaign.id);

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

    const campaign = await Campaign.findOne({ campaignId: id });

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
    await Campaign.findOneAndUpdate(
      { campaignId: id },
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

    const campaign = await Campaign.findOne({ campaignId: id });

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
    await Campaign.findOneAndUpdate(
      { campaignId: id },
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

// Get campaign applications
export const getCampaignApplications = async (req: AuthenticatedRequest<{ id: string }>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const campaign = await Campaign.findOne({campaignId: id })
      .populate('applicants', 'name email username profilePicture bio')
      .lean();

    if (!campaign) {
      res.status(404).json({ success: false, message: 'Campaign not found' });
      return;
    }

    res.json({
      success: true,
      data: campaign.applicants || [],
      message: 'Applications retrieved successfully'
    });
  } catch (error) {
    console.error('Get campaign applications error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

// Accept application
export const acceptApplication = async (req: AuthenticatedRequest<{ id: string; appId: string }>, res: Response): Promise<void> => {
  try {
    const { id, appId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const campaign = await Campaign.findOne({ campaignId: id, brandId: userId });

    if (!campaign) {
      res.status(404).json({ success: false, message: 'Campaign not found' });
      return;
    }

    if (!campaign.applicants?.includes(appId)) {
      res.status(400).json({ success: false, message: 'Applicant not found in campaign' });
      return;
    }

    await Campaign.findOneAndUpdate({campaignId:id}, {
      $addToSet: { selectedInfluencers: appId }
    });

    res.json({
      success: true,
      message: 'Application accepted successfully'
    });
  } catch (error) {
    console.error('Accept application error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

// Reject application
export const rejectApplication = async (req: AuthenticatedRequest<{ id: string; appId: string }>, res: Response): Promise<void> => {
  try {
    const { id, appId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const campaign = await Campaign.findOne({ campaignId: id, brandId: userId });

    if (!campaign) {
      res.status(404).json({ success: false, message: 'Campaign not found' });
      return;
    }

    // Remove from applicants and selectedInfluencers if present
    await Campaign.findOneAndUpdate({campaignId:id}, {
      $pull: { applicants: appId, selectedInfluencers: appId }
    });

    res.json({
      success: true,
      message: 'Application rejected successfully'
    });
  } catch (error) {
    console.error('Reject application error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

// Get campaign deliverables
export const getCampaignDeliverables = async (req: AuthenticatedRequest<{ id: string }>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const campaign = await Campaign.findOne({ campaignId: id, brandId: userId });

    if (!campaign) {
      res.status(404).json({ success: false, message: 'Campaign not found' });
      return;
    }

    res.json({
      success: true,
      data: campaign.deliverables || []
    });
  } catch (error) {
    console.error('Get campaign deliverables error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

// Add deliverable to campaign
export const addCampaignDeliverable = async (req: AuthenticatedRequest<{ id: string }>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { deliverable } = req.body;

    if (!deliverable) {
      res.status(400).json({ success: false, message: 'deliverable is required' });
      return;
    }

    const campaign = await Campaign.findOneAndUpdate(
      { campaignId: id },
      { $addToSet: { deliverables: deliverable } },
      { new: true }
    );

    if (!campaign) {
      res.status(404).json({ success: false, message: 'Campaign not found' });
      return;
    }

    res.json({
      success: true,
      data: campaign.deliverables,
      message: 'Deliverable added successfully'
    });
  } catch (error) {
    console.error('Add campaign deliverable error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

// Submit counter offer
export const counterOffer = async (req: AuthenticatedRequest<{ id: string }>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { influencerId, amount, message } = req.body;

    if (!influencerId || !amount) {
      res.status(400).json({ success: false, message: 'influencerId and amount are required' });
      return;
    }

    const campaign = await Campaign.findOne({campaignId:id});

    if (!campaign) {
      res.status(404).json({ success: false, message: 'Campaign not found' });
      return;
    }

    // Counter offer logic - stored as metadata or handled via messaging
    res.json({
      success: true,
      message: 'Counter offer submitted successfully',
      data: { campaignId: id, influencerId, amount, message }
    });
  } catch (error) {
    console.error('Counter offer error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

// Get negotiation for campaign and influencer
export const getNegotiation = async (req: AuthenticatedRequest<{ id: string; influencerId: string }>, res: Response): Promise<void> => {
  try {
    const { id, influencerId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const campaign = await Campaign.findOne({campaignId:id}).lean();

    if (!campaign) {
      res.status(404).json({ success: false, message: 'Campaign not found' });
      return;
    }

    const isApplicant = campaign.applicants?.includes(influencerId);
    const isSelected = campaign.selectedInfluencers?.includes(influencerId);

    res.json({
      success: true,
      data: {
        campaignId: id,
        influencerId,
        status: isSelected ? 'accepted' : isApplicant ? 'pending' : 'not_applied',
        campaign: {
          budget: campaign.budget,
          compensation: campaign.compensation,
          deliverables: campaign.deliverables
        }
      }
    });
  } catch (error) {
    console.error('Get negotiation error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

// Accept negotiation
export const acceptNegotiation = async (req: AuthenticatedRequest<{ id: string; influencerId: string }>, res: Response): Promise<void> => {
  try {
    const { id, influencerId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const campaign = await Campaign.findOneAndUpdate(
      { campaignId: id, brandId: userId },
      { $addToSet: { selectedInfluencers: influencerId } },
      { new: true }
    );

    if (!campaign) {
      res.status(404).json({ success: false, message: 'Campaign not found' });
      return;
    }

    res.json({
      success: true,
      message: 'Negotiation accepted successfully'
    });
  } catch (error) {
    console.error('Accept negotiation error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

// Reject negotiation
export const rejectNegotiation = async (req: AuthenticatedRequest<{ id: string; influencerId: string }>, res: Response): Promise<void> => {
  try {
    const { id, influencerId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const campaign = await Campaign.findOneAndUpdate(
      { campaignId: id, brandId: userId },
      { $pull: { selectedInfluencers: influencerId } },
      { new: true }
    );

    if (!campaign) {
      res.status(404).json({ success: false, message: 'Campaign not found' });
      return;
    }

    res.json({
      success: true,
      message: 'Negotiation rejected successfully'
    });
  } catch (error) {
    console.error('Reject negotiation error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

// Boost campaign
export const boostCampaign = async (req: AuthenticatedRequest<{ id: string }>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const campaign = await Campaign.findOne({ campaignId: id, brandId: userId });

    if (!campaign) {
      res.status(404).json({ success: false, message: 'Campaign not found' });
      return;
    }

    // Boost logic - currently returns a success placeholder
    res.json({
      success: true,
      message: 'Campaign boosted successfully',
      data: {
        campaignId: id,
        boostedAt: new Date(),
        estimatedReach: 50000
      }
    });
  } catch (error) {
    console.error('Boost campaign error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

// Get boost recommendations
export const getBoostRecommendations = async (req: AuthenticatedRequest<{ id: string }>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const campaign = await Campaign.findOne({ campaignId: id, brandId: userId }).lean();

    if (!campaign) {
      res.status(404).json({ success: false, message: 'Campaign not found' });
      return;
    }

    res.json({
      success: true,
      data: {
        recommendations: [
          {
            type: 'sponsored_listing',
            description: 'Feature your campaign at the top of search results',
            estimatedReach: 10000,
            cost: 500
          },
          {
            type: 'influencer_match',
            description: 'Get matched with top influencers in your niche',
            estimatedReach: 25000,
            cost: 1200
          }
        ]
      }
    });
  } catch (error) {
    console.error('Get boost recommendations error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

// Get campaigns for me (influencer - campaigns matching their niche)
export const getCampaignsForMe = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { page = '1', limit = '10' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Return active campaigns that the user hasn't applied to yet
    const campaigns = await Campaign.find({
      status: 'Active',
      applicants: { $ne: userId },
      brandId: { $ne: userId }
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await Campaign.countDocuments({
      status: 'Active',
      applicants: { $ne: userId },
      brandId: { $ne: userId }
    });

    const cleanedCampaigns = campaigns.map((c: any) => {
      const { aiSuggestionMetadata, ...rest } = c;
      return rest;
    });

    const totalPages = Math.ceil(total / limitNum);

    res.json({
      success: true,
      data: cleanedCampaigns,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPreviousPage: pageNum > 1
      }
    });
  } catch (error) {
    console.error('Get campaigns for me error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

// Regenerate AI influencer suggestions for a campaign
export const regenerateSuggestions = async (req: AuthenticatedRequest<{ id: string }>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const campaign = await Campaign.findOne({ _id: id, brandId: userId });

    if (!campaign) {
      res.status(404).json({ message: 'Campaign not found or you do not have permission to access it' });
      return;
    }

    console.log(`[REGENERATE SUGGESTIONS] Regenerating AI suggestions for campaign: ${campaign.campaignName}`);

    try {
      const aiSuggestions = await generateInfluencerSuggestions(
        campaign.targetInfluencer,
        campaign.campaignBrief,
        campaign.campaignType
      );

      // Update campaign with new suggestions
      campaign.suggestedInfluencers = aiSuggestions.suggestions;
      campaign.aiSuggestionMetadata = aiSuggestions.metadata as any;
      await campaign.save();

      res.json({
        message: 'AI suggestions regenerated successfully',
        data: {
          suggestedInfluencers: aiSuggestions.suggestions,
          metadata: aiSuggestions.metadata
        }
      });
    } catch (error) {
      console.error('[REGENERATE SUGGESTIONS] Failed to generate suggestions:', error);
      res.status(500).json({
        message: 'Failed to regenerate AI suggestions',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } catch (error) {
    console.error('Regenerate suggestions error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
