import { Request, Response } from 'express';
import Campaign from '../models/campaign';
import { AuthenticatedRequest, ICampaign, CampaignNegotiation, CampaignNegotiationOffer, BoostDuration } from '../types';
import { getPublicUrl } from '../services/s3';
import Anthropic from '@anthropic-ai/sdk';
import Influencer from '../models/influencer';
import { user } from '../models/auth';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!
});

interface CreateCampaignBody extends Omit<ICampaign, 'brandId' | 'createdAt' | 'updatedAt' | 'productImages'> {
  productImages?: string[];
  generateSuggestions?: boolean; // Flag to enable AI suggestions
}

interface UpdateCampaignBody extends Partial<CreateCampaignBody> {}

type NegotiationRole = 'brand' | 'influencer';

const normalizeOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
};

const parseBooleanQueryFlag = (value: unknown): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.some((entry) => parseBooleanQueryFlag(entry));
  }

  const normalized = normalizeOptionalString(value)?.toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
};

const APPLICANT_USER_SAFE_SELECT = [
  'email',
  'type',
  'about',
  'isEmailVerified',
  'createdAt',
  'updatedAt',
  'name',
  'username',
  'bio',
  'profilePicture',
  'gender',
  'phoneNumber',
  'companyName',
  'industry',
  'website',
  'description',
  'company_type',
  'company_size',
  'location',
  'country',
  'company_logo',
  'brand_images',
  'categories',
  'social_media',
  'brand_story',
  'billing_info',
  'team_members',
  'preferences',
  'contact',
  'services'
].join(' ');

const APPLICANT_INFLUENCER_PROFILE_SELECT = [
  'user_name',
  'name',
  'profile_name',
  'profile_pic_url',
  'biography',
  'categoryInstagram',
  'categoryYouTube',
  'is_verified',
  'is_business',
  'city',
  'state',
  'language',
  'averageLikes',
  'averageViews',
  'averageComments',
  'averageEngagement',
  'instagramData',
  'youtubeData',
  'image'
].join(' ');

type ApplicantUserRecord = Record<string, unknown> & {
  _id?: unknown;
  username?: string;
};

type ApplicantInfluencerRecord = Record<string, unknown> & {
  user_name?: string;
};

type ApplicantDetailsRecord = ApplicantUserRecord & {
  influencerProfile: ApplicantInfluencerRecord | null;
};

type GetCampaignApplicationsQuery = {
  get_id_only?: string | string[];
};

const normalizeLookupKey = (value: unknown): string | undefined => normalizeOptionalString(value)?.toLowerCase();

// Campaign applicants are auth users; richer creator analytics live in the Influencer collection.
const fetchApplicantDetails = async (applicantIds: string[]): Promise<ApplicantDetailsRecord[]> => {
  if (!applicantIds.length) {
    return [];
  }

  const uniqueApplicantIds = Array.from(
    new Set(
      applicantIds
        .map((applicantId) => applicantId.trim())
        .filter(Boolean)
    )
  );

  const applicantUsers = await user.find({ _id: { $in: uniqueApplicantIds } })
    .select(APPLICANT_USER_SAFE_SELECT)
    .lean<ApplicantUserRecord[]>();

  const applicantById = new Map<string, ApplicantUserRecord>();
  applicantUsers.forEach((record) => {
    if (record._id) {
      applicantById.set(String(record._id), record);
    }
  });

  const usernames = Array.from(
    new Set(
      applicantUsers
        .map((record) => normalizeLookupKey(record.username))
        .filter((value): value is string => Boolean(value))
    )
  );

  const influencerProfiles = usernames.length
    ? await Influencer.find({
        $expr: {
          $in: [{ $toLower: { $ifNull: ['$user_name', ''] } }, usernames]
        }
      })
        .select(APPLICANT_INFLUENCER_PROFILE_SELECT)
        .lean<ApplicantInfluencerRecord[]>()
    : [];

  const influencerByUsername = new Map<string, ApplicantInfluencerRecord>();
  influencerProfiles.forEach((record) => {
    const lookupKey = normalizeLookupKey(record.user_name);
    if (lookupKey) {
      influencerByUsername.set(lookupKey, record);
    }
  });

  return uniqueApplicantIds
    .map((applicantId) => {
      const applicant = applicantById.get(applicantId);
      if (!applicant) {
        return null;
      }

      const usernameKey = normalizeLookupKey(applicant.username);

      return {
        ...applicant,
        influencerProfile: usernameKey ? influencerByUsername.get(usernameKey) ?? null : null
      };
    })
    .filter((record): record is ApplicantDetailsRecord => record !== null);
};

const hasNegotiationAccess = (campaignBrandId: string, requesterId: string, influencerId: string): boolean => {
  return campaignBrandId === requesterId || requesterId === influencerId;
};

const deriveNegotiationStatus = (
  campaign: {
    applicants?: string[];
    selectedInfluencers?: string[];
  },
  influencerId: string,
  persistedStatus?: CampaignNegotiation['status']
): CampaignNegotiation['status'] | 'not_started' => {
  if (persistedStatus) {
    return persistedStatus;
  }

  if (campaign.selectedInfluencers?.includes(influencerId)) {
    return 'accepted';
  }

  if (campaign.applicants?.includes(influencerId)) {
    return 'pending';
  }

  return 'not_started';
};

interface BoostCampaignBody {
  duration?: BoostDuration;
  amount?: number | string;
}

const BOOST_DURATION_OPTIONS: BoostDuration[] = ['7days', '14days', '30days'];

const BOOST_DURATION_DAYS: Record<BoostDuration, number> = {
  '7days': 7,
  '14days': 14,
  '30days': 30
};

const BOOST_PRICE_BY_DURATION: Record<BoostDuration, number> = {
  '7days': 500,
  '14days': 900,
  '30days': 1500
};

const BOOST_LIFT_BY_DURATION: Record<BoostDuration, number> = {
  '7days': 15,
  '14days': 28,
  '30days': 45
};

const BOOST_REACH_MULTIPLIER_BY_DURATION: Record<BoostDuration, number> = {
  '7days': 1.0,
  '14days': 1.7,
  '30days': 2.6
};

const isValidBoostDuration = (value: unknown): value is BoostDuration => {
  return typeof value === 'string' && BOOST_DURATION_OPTIONS.includes(value as BoostDuration);
};

const toValidPage = (value: unknown, defaultValue: number): number => {
  const parsed = Number.parseInt(String(value ?? defaultValue), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
};

const isBoostActive = (campaign: { boost?: { endsAt?: Date | string | null } } | null | undefined, now: Date): boolean => {
  if (!campaign?.boost?.endsAt) {
    return false;
  }

  const endsAt = new Date(campaign.boost.endsAt);
  if (Number.isNaN(endsAt.getTime())) {
    return false;
  }

  return endsAt.getTime() > now.getTime();
};

const getCampaignBaseReach = (campaign: {
  selectedInfluencers?: unknown[];
  applicants?: unknown[];
  budget?: number;
}): number => {
  const selectedCount = campaign.selectedInfluencers?.length || 0;
  const applicantsCount = campaign.applicants?.length || 0;
  const budget = Number.isFinite(campaign.budget) ? (campaign.budget as number) : 0;

  return Math.max(10000, selectedCount * 10000 + applicantsCount * 2500 + Math.round(budget * 0.2));
};

const getEstimatedBoostReach = (baseReach: number, duration: BoostDuration): number => {
  return Math.round(baseReach * BOOST_REACH_MULTIPLIER_BY_DURATION[duration]);
};

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
      city,
      state,
      country,
      engagement,
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

    const normalizedCity = normalizeOptionalString(city);
    const normalizedState = normalizeOptionalString(state);
    const normalizedCountry = normalizeOptionalString(country);

    let normalizedEngagement: number | undefined;
    if (engagement !== undefined && engagement !== null && String(engagement).trim() !== '') {
      const parsedEngagement = typeof engagement === 'number' ? engagement : Number(engagement);
      if (!Number.isFinite(parsedEngagement) || parsedEngagement < 0) {
        res.status(400).json({
          message: 'engagement must be a non-negative number when provided'
        });
        return;
      }
      normalizedEngagement = parsedEngagement;
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
      ...(normalizedCity ? { city: normalizedCity } : {}),
      ...(normalizedState ? { state: normalizedState } : {}),
      ...(normalizedCountry ? { country: normalizedCountry } : {}),
      ...(normalizedEngagement !== undefined ? { engagement: normalizedEngagement } : {}),
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

    const pageNum = toValidPage(page, 1);
    const limitNum = toValidPage(limit, 10);
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

    const now = new Date();

    const [campaigns, total] = await Promise.all([
      Campaign.aggregate([
        { $match: filter },
        {
          $addFields: {
            boostActiveRank: {
              $cond: [
                { $gt: ['$boost.endsAt', now] },
                1,
                0
              ]
            }
          }
        },
        { $sort: { boostActiveRank: -1, createdAt: -1 } },
        { $skip: skip },
        { $limit: limitNum },
        {
          $project: {
            boostActiveRank: 0
          }
        }
      ]),
      Campaign.countDocuments(filter)
    ]);

    const populatedCampaigns = await Campaign.populate(campaigns, {
      path: 'brandId',
      select: 'companyName email'
    });

    const totalPages = Math.ceil(total / limitNum);

    // Exclude aiSuggestionMetadata from all campaigns
    const campaignsWithoutMetadata = populatedCampaigns.map(campaign => {
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

    if (typeof updateData.engagement === 'string' && updateData.engagement.trim().length === 0) {
      delete updateData.engagement;
    }

    // Parse numeric fields from form-data
    const numericFields = ['budget', 'numberOfLivePosts', 'engagement'];
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

    if (updateData.engagement !== undefined && (!Number.isFinite(updateData.engagement) || updateData.engagement < 0)) {
      res.status(400).json({ message: 'engagement must be a non-negative number' });
      return;
    }

    const optionalStringFields = ['city', 'state', 'country'];
    for (const field of optionalStringFields) {
      if (updateData[field] !== undefined) {
        const normalizedValue = normalizeOptionalString(updateData[field]);
        if (normalizedValue === undefined) {
          delete updateData[field];
        } else {
          updateData[field] = normalizedValue;
        }
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
      'city',
      'state',
      'country',
      'engagement',
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
      'negotiations',
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
export const getCampaignApplications = async (
  req: AuthenticatedRequest<{ id: string }, any, any, GetCampaignApplicationsQuery>,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const getIdOnly = parseBooleanQueryFlag(req.query.get_id_only);

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const campaign = await Campaign.findOne({ campaignId: id, brandId: userId })
      .select('applicants')
      .lean();

    if (!campaign) {
      res.status(404).json({ success: false, message: 'Campaign not found' });
      return;
    }

    const applicantIds = Array.isArray(campaign.applicants)
      ? campaign.applicants.map((applicantId) => String(applicantId)).filter(Boolean)
      : [];

    const data = getIdOnly ? applicantIds : await fetchApplicantDetails(applicantIds);

    res.json({
      success: true,
      data,
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
export const counterOffer = async (
  req: AuthenticatedRequest<{ id: string }, {}, { influencerId?: string; amount?: number; message?: string }>,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const rawInfluencerId = normalizeOptionalString(req.body?.influencerId);
    const amount = typeof req.body?.amount === 'number' ? req.body.amount : Number(req.body?.amount);
    const message = normalizeOptionalString(req.body?.message);

    if (!Number.isFinite(amount) || amount <= 0) {
      res.status(400).json({ success: false, message: 'amount must be a positive number' });
      return;
    }

    const campaign = await Campaign.findOne({ campaignId: id });

    if (!campaign) {
      res.status(404).json({ success: false, message: 'Campaign not found' });
      return;
    }

    const isBrandOwner = campaign.brandId === userId;
    if (isBrandOwner && !rawInfluencerId) {
      res.status(400).json({ success: false, message: 'influencerId is required for brand counter offers' });
      return;
    }

    const influencerId = rawInfluencerId || userId;
    if (!hasNegotiationAccess(campaign.brandId, userId, influencerId)) {
      res.status(403).json({ success: false, message: 'You do not have permission to update this negotiation' });
      return;
    }

    const influencerInCampaign =
      campaign.applicants?.includes(influencerId) ||
      campaign.selectedInfluencers?.includes(influencerId);

    if (!influencerInCampaign) {
      res.status(400).json({
        success: false,
        message: 'Influencer must apply to this campaign before negotiation'
      });
      return;
    }

    const offeredByRole: NegotiationRole = isBrandOwner ? 'brand' : 'influencer';
    const now = new Date();
    const offer: CampaignNegotiationOffer = {
      amount,
      proposedBy: userId,
      proposedByRole: offeredByRole,
      proposedAt: now,
      ...(message ? { message } : {})
    };

    if (!Array.isArray(campaign.negotiations)) {
      campaign.negotiations = [];
    }

    let negotiation = campaign.negotiations.find((item) => item.influencerId === influencerId);

    if (!negotiation) {
      negotiation = {
        influencerId,
        status: 'pending',
        currentAmount: amount,
        ...(message ? { currentMessage: message } : {}),
        lastOfferedBy: userId,
        lastOfferedByRole: offeredByRole,
        offers: [offer],
        createdAt: now,
        updatedAt: now
      };
      campaign.negotiations.push(negotiation);
    } else {
      negotiation.status = 'pending';
      negotiation.currentAmount = amount;
      if (message) {
        negotiation.currentMessage = message;
      } else {
        delete negotiation.currentMessage;
      }
      negotiation.lastOfferedBy = userId;
      negotiation.lastOfferedByRole = offeredByRole;
      negotiation.updatedAt = now;
      delete negotiation.acceptedAt;
      delete negotiation.acceptedBy;
      delete negotiation.rejectedAt;
      delete negotiation.rejectedBy;

      if (!Array.isArray(negotiation.offers)) {
        negotiation.offers = [];
      }
      negotiation.offers.push(offer);
    }

    campaign.markModified('negotiations');
    await campaign.save();

    const savedNegotiation = campaign.negotiations?.find((item) => item.influencerId === influencerId) || null;

    res.json({
      success: true,
      message: 'Counter offer submitted successfully',
      data: {
        campaignId: id,
        influencerId,
        negotiation: savedNegotiation
      }
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

    const campaign = await Campaign.findOne({ campaignId: id }).lean();

    if (!campaign) {
      res.status(404).json({ success: false, message: 'Campaign not found' });
      return;
    }

    if (!hasNegotiationAccess(campaign.brandId, userId, influencerId)) {
      res.status(403).json({ success: false, message: 'You do not have permission to view this negotiation' });
      return;
    }

    const negotiations = Array.isArray((campaign as any).negotiations)
      ? ((campaign as any).negotiations as CampaignNegotiation[])
      : [];
    const negotiation = negotiations.find((item) => item.influencerId === influencerId) || null;
    const status = deriveNegotiationStatus(campaign, influencerId, negotiation?.status);

    res.json({
      success: true,
      data: {
        campaignId: id,
        influencerId,
        status,
        negotiation,
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

    const campaign = await Campaign.findOne({ campaignId: id });

    if (!campaign) {
      res.status(404).json({ success: false, message: 'Campaign not found' });
      return;
    }

    if (!hasNegotiationAccess(campaign.brandId, userId, influencerId)) {
      res.status(403).json({ success: false, message: 'You do not have permission to accept this negotiation' });
      return;
    }

    const influencerInCampaign =
      campaign.applicants?.includes(influencerId) ||
      campaign.selectedInfluencers?.includes(influencerId);

    if (!influencerInCampaign) {
      res.status(400).json({
        success: false,
        message: 'Influencer is not part of this campaign'
      });
      return;
    }

    if (!Array.isArray(campaign.negotiations)) {
      campaign.negotiations = [];
    }

    const now = new Date();
    let negotiation = campaign.negotiations.find((item) => item.influencerId === influencerId);

    if (!negotiation) {
      negotiation = {
        influencerId,
        status: 'accepted',
        currentAmount: campaign.compensation?.amount ?? 0,
        lastOfferedBy: campaign.brandId,
        lastOfferedByRole: 'brand',
        offers: [],
        acceptedAt: now,
        acceptedBy: userId,
        createdAt: now,
        updatedAt: now
      };
      campaign.negotiations.push(negotiation);
    } else {
      negotiation.status = 'accepted';
      negotiation.acceptedAt = now;
      negotiation.acceptedBy = userId;
      negotiation.updatedAt = now;
      delete negotiation.rejectedAt;
      delete negotiation.rejectedBy;
    }

    if (!Array.isArray(campaign.selectedInfluencers)) {
      campaign.selectedInfluencers = [];
    }

    if (!campaign.selectedInfluencers.includes(influencerId)) {
      campaign.selectedInfluencers.push(influencerId);
    }

    campaign.markModified('negotiations');
    await campaign.save();

    const savedNegotiation = campaign.negotiations.find((item) => item.influencerId === influencerId) || null;

    res.json({
      success: true,
      message: 'Negotiation accepted successfully',
      data: {
        campaignId: id,
        influencerId,
        negotiation: savedNegotiation
      }
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

    const campaign = await Campaign.findOne({ campaignId: id });

    if (!campaign) {
      res.status(404).json({ success: false, message: 'Campaign not found' });
      return;
    }

    if (!hasNegotiationAccess(campaign.brandId, userId, influencerId)) {
      res.status(403).json({ success: false, message: 'You do not have permission to reject this negotiation' });
      return;
    }

    const influencerInCampaign =
      campaign.applicants?.includes(influencerId) ||
      campaign.selectedInfluencers?.includes(influencerId);

    if (!influencerInCampaign) {
      res.status(400).json({
        success: false,
        message: 'Influencer is not part of this campaign'
      });
      return;
    }

    if (!Array.isArray(campaign.negotiations)) {
      campaign.negotiations = [];
    }

    const now = new Date();
    let negotiation = campaign.negotiations.find((item) => item.influencerId === influencerId);

    if (!negotiation) {
      const rejectedByRole: NegotiationRole = campaign.brandId === userId ? 'brand' : 'influencer';
      negotiation = {
        influencerId,
        status: 'rejected',
        currentAmount: campaign.compensation?.amount ?? 0,
        lastOfferedBy: userId,
        lastOfferedByRole: rejectedByRole,
        offers: [],
        rejectedAt: now,
        rejectedBy: userId,
        createdAt: now,
        updatedAt: now
      };
      campaign.negotiations.push(negotiation);
    } else {
      negotiation.status = 'rejected';
      negotiation.rejectedAt = now;
      negotiation.rejectedBy = userId;
      negotiation.updatedAt = now;
      delete negotiation.acceptedAt;
      delete negotiation.acceptedBy;
    }

    campaign.selectedInfluencers = (campaign.selectedInfluencers || []).filter((value) => value !== influencerId);

    campaign.markModified('negotiations');
    await campaign.save();

    const savedNegotiation = campaign.negotiations.find((item) => item.influencerId === influencerId) || null;

    res.json({
      success: true,
      message: 'Negotiation rejected successfully',
      data: {
        campaignId: id,
        influencerId,
        negotiation: savedNegotiation
      }
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
export const boostCampaign = async (
  req: AuthenticatedRequest<{ id: string }, {}, BoostCampaignBody>,
  res: Response
): Promise<void> => {
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

    if (campaign.status !== 'Active') {
      res.status(400).json({ success: false, message: 'Only active campaigns can be boosted' });
      return;
    }

    const duration = req.body?.duration;

    if (!isValidBoostDuration(duration)) {
      res.status(400).json({
        success: false,
        message: 'duration must be one of: 7days, 14days, 30days'
      });
      return;
    }

    const rawAmount = req.body?.amount;
    let providedAmount: number | undefined;

    if (rawAmount !== undefined) {
      const parsedAmount = typeof rawAmount === 'number' ? rawAmount : Number(rawAmount);
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        res.status(400).json({
          success: false,
          message: 'amount must be a positive number when provided'
        });
        return;
      }
      providedAmount = parsedAmount;
    }

    const serverAmount = BOOST_PRICE_BY_DURATION[duration];
    if (providedAmount !== undefined && providedAmount !== serverAmount) {
      res.status(400).json({
        success: false,
        message: 'amount does not match server pricing for selected duration',
        expectedAmount: serverAmount
      });
      return;
    }

    const now = new Date();
    const durationDays = BOOST_DURATION_DAYS[duration];
    const endsAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
    const baseReach = getCampaignBaseReach(campaign);
    const estimatedReach = getEstimatedBoostReach(baseReach, duration);
    const estimatedLiftPercent = BOOST_LIFT_BY_DURATION[duration];

    campaign.boost = {
      duration,
      amount: serverAmount,
      startsAt: now,
      endsAt,
      estimatedReach,
      estimatedLiftPercent,
      boostedBy: userId,
      createdAt: now,
      updatedAt: now
    };
    campaign.markModified('boost');
    await campaign.save();

    res.json({
      success: true,
      message: 'Campaign boosted successfully',
      data: {
        campaignId: id,
        chargeMode: 'record_only',
        boost: campaign.boost
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

    const applicantsCount = campaign.applicants?.length || 0;
    const budget = campaign.budget || 0;

    let recommendedDuration: BoostDuration = '7days';
    if (budget >= 150000 || applicantsCount >= 25) {
      recommendedDuration = '30days';
    } else if (budget >= 50000 || applicantsCount >= 10) {
      recommendedDuration = '14days';
    }

    const reasonByDuration: Record<BoostDuration, string> = {
      '7days': 'Short test run to quickly increase visibility with lower spend.',
      '14days': 'Balanced option for sustained reach and cost efficiency.',
      '30days': 'Long-run exposure for high-demand or high-budget campaigns.'
    };

    const baseReach = getCampaignBaseReach(campaign);
    const now = new Date();

    const recommendations = BOOST_DURATION_OPTIONS.map((duration) => ({
      duration,
      amount: BOOST_PRICE_BY_DURATION[duration],
      estimatedReach: getEstimatedBoostReach(baseReach, duration),
      estimatedLiftPercent: BOOST_LIFT_BY_DURATION[duration],
      isRecommended: duration === recommendedDuration,
      reason: duration === recommendedDuration
        ? 'Recommended based on your current budget and application volume.'
        : reasonByDuration[duration]
    }));

    const activeBoost = isBoostActive(campaign, now) ? campaign.boost : null;

    res.json({
      success: true,
      data: {
        campaignId: id,
        recommendedDuration,
        activeBoost,
        recommendations
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
    const pageNum = toValidPage(page, 1);
    const limitNum = toValidPage(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const now = new Date();

    const filter = {
      status: 'Active',
      applicants: { $ne: userId },
      brandId: { $ne: userId }
    };

    // Return active campaigns that the user hasn't applied to yet
    const [campaigns, total] = await Promise.all([
      Campaign.aggregate([
        { $match: filter },
        {
          $addFields: {
            boostActiveRank: {
              $cond: [
                { $gt: ['$boost.endsAt', now] },
                1,
                0
              ]
            }
          }
        },
        { $sort: { boostActiveRank: -1, createdAt: -1 } },
        { $skip: skip },
        { $limit: limitNum },
        {
          $project: {
            boostActiveRank: 0
          }
        }
      ]),
      Campaign.countDocuments(filter)
    ]);

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
