const Campaign = require('../models/campaign');
const User = require('../models/auth');
const Influencer = require('../models/influencer');
const mongoose = require('mongoose');

/**
 * GET /api/campaigns
 * Get all campaigns with filters
 */
exports.getAllCampaigns = async (req, res) => {
    try {
        const { page = 1, limit = 20, category, status = 'ACTIVE', minBudget, maxBudget, city, sortBy = 'createdAt' } = req.query;
        const skip = (page - 1) * limit;

        let query = {};

        if (status) query.status = status;
        if (category) query.category = category;
        if (minBudget) query.budget = { $gte: parseInt(minBudget) };
        if (maxBudget) {
            query.budget = { ...(query.budget || {}), $lte: parseInt(maxBudget) };
        }
        if (city) query['location.city'] = city;

        const sortOptions = {};
        switch (sortBy) {
            case 'budget': sortOptions.budget = -1; break;
            case 'recent': sortOptions.createdAt = -1; break;
            case 'trending': sortOptions.selectedInfluencersCount = -1; break;
            default: sortOptions.createdAt = -1;
        }

        const total = await Campaign.countDocuments(query);
        const campaigns = await Campaign.find(query)
            .sort(sortOptions)
            .skip(skip)
            .limit(parseInt(limit))
            .select('_id title description category budget currency status visibility brandId brandName brandLogo duration requirements selectedInfluencersCount applicationCount location createdAt');

        return res.status(200).json({
            success: true,
            data: campaigns,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error fetching campaigns', error: error.message });
    }
};

/**
 * GET /api/campaigns/:id
 * Get campaign by ID
 */
exports.getCampaignById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid campaign ID' });
        }

        const campaign = await Campaign.findById(id)
            .populate('brandId', 'name email website profileImage location');

        if (!campaign) {
            return res.status(404).json({ success: false, message: 'Campaign not found' });
        }

        return res.status(200).json({ success: true, data: campaign });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error fetching campaign', error: error.message });
    }
};

/**
 * POST /api/campaigns/:campaignId/apply
 * Influencer applies to campaign
 */
exports.applyToCampaign = async (req, res) => {
    try {
        const { campaignId } = req.params;
        const influencerId = req.user.id;
        const { proposedRate, message, portfolioLink } = req.body;

        if (!mongoose.Types.ObjectId.isValid(campaignId)) {
            return res.status(400).json({ success: false, message: 'Invalid campaign ID' });
        }

        if (!proposedRate) {
            return res.status(400).json({ success: false, message: 'proposedRate is required' });
        }

        // Check if campaign exists
        const campaign = await Campaign.findById(campaignId);
        if (!campaign) {
            return res.status(404).json({ success: false, message: 'Campaign not found' });
        }

        // Check if already applied
        const alreadyApplied = campaign.applications?.find(app => app.influencerId.toString() === influencerId);
        if (alreadyApplied) {
            return res.status(409).json({ success: false, message: 'You have already applied to this campaign' });
        }

        // Get influencer details
        const influencer = await User.findById(influencerId);
        if (!influencer) {
            return res.status(404).json({ success: false, message: 'Influencer not found' });
        }

        // Create application
        const application = {
            _id: new mongoose.Types.ObjectId(),
            influencerId: new mongoose.Types.ObjectId(influencerId),
            influencerName: influencer.name,
            influencerUsername: influencer.username || influencer.email,
            influencerAvatar: influencer.profileImage || null,
            proposedRate,
            message: message || '',
            portfolioLink: portfolioLink || '',
            status: 'PENDING',
            appliedAt: new Date()
        };

        // Add application to campaign
        if (!campaign.applications) campaign.applications = [];
        campaign.applications.push(application);
        campaign.applicationCount = campaign.applications.length;

        await campaign.save();

        return res.status(201).json({
            success: true,
            message: 'Application submitted successfully',
            data: application
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error applying to campaign', error: error.message });
    }
};

/**
 * GET /api/campaigns/:campaignId/application-status
 * Get influencer's application status for a campaign
 */
exports.getApplicationStatus = async (req, res) => {
    try {
        const { campaignId } = req.params;
        const influencerId = req.user.id;

        if (!mongoose.Types.ObjectId.isValid(campaignId)) {
            return res.status(400).json({ success: false, message: 'Invalid campaign ID' });
        }

        const campaign = await Campaign.findById(campaignId);
        if (!campaign) {
            return res.status(404).json({ success: false, message: 'Campaign not found' });
        }

        const application = campaign.applications?.find(app => app.influencerId.toString() === influencerId);

        if (!application) {
            return res.status(200).json({
                success: true,
                data: {
                    campaignId,
                    status: 'NOT_APPLIED',
                    message: 'You have not applied to this campaign yet'
                }
            });
        }

        return res.status(200).json({
            success: true,
            data: {
                campaignId,
                applicationId: application._id,
                status: application.status,
                proposedRate: application.proposedRate,
                appliedAt: application.appliedAt,
                acceptedAt: application.acceptedAt || null,
                rejectionReason: application.rejectionReason || null
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error checking application status', error: error.message });
    }
};

/**
 * DELETE /api/campaigns/:campaignId/withdraw-application
 * Withdraw application
 */
exports.withdrawApplication = async (req, res) => {
    try {
        const { campaignId } = req.params;
        const influencerId = req.user.id;

        if (!mongoose.Types.ObjectId.isValid(campaignId)) {
            return res.status(400).json({ success: false, message: 'Invalid campaign ID' });
        }

        const campaign = await Campaign.findById(campaignId);
        if (!campaign) {
            return res.status(404).json({ success: false, message: 'Campaign not found' });
        }

        const appIndex = campaign.applications?.findIndex(app => app.influencerId.toString() === influencerId);
        if (appIndex === -1 || appIndex === undefined) {
            return res.status(404).json({ success: false, message: 'Application not found' });
        }

        const withdrawn = campaign.applications.splice(appIndex, 1);
        campaign.applicationCount = campaign.applications.length;
        await campaign.save();

        return res.status(200).json({
            success: true,
            message: 'Application withdrawn successfully',
            data: withdrawn[0]
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error withdrawing application', error: error.message });
    }
};

/**
 * GET /api/my-campaigns
 * Get campaigns influencer applied to (with status)
 */
exports.getMyApplications = async (req, res) => {
    try {
        const influencerId = req.user.id;
        const { page = 1, limit = 20, status } = req.query;
        const skip = (page - 1) * limit;

        // Find all campaigns where this influencer has applied
        let query = { 'applications.influencerId': new mongoose.Types.ObjectId(influencerId) };

        const total = await Campaign.countDocuments(query);
        const campaigns = await Campaign.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .select('_id title description category budget currency status brandName location duration requirements applications');

        // Extract only this influencer's applications
        const applicationsData = campaigns.map(campaign => {
            const application = campaign.applications.find(app => app.influencerId.toString() === influencerId);

            // Filter by status if provided
            if (status && application.status !== status) return null;

            return {
                campaignId: campaign._id,
                campaignTitle: campaign.title,
                campaignCategory: campaign.category,
                campaignBudget: campaign.budget,
                campaignStatus: campaign.status,
                brandName: campaign.brandName,
                location: campaign.location,
                duration: campaign.duration,
                requirements: campaign.requirements,
                applicationId: application._id,
                applicationStatus: application.status,
                proposedRate: application.proposedRate,
                message: application.message,
                appliedAt: application.appliedAt,
                acceptedAt: application.acceptedAt || null,
                rejectionReason: application.rejectionReason || null
            };
        }).filter(Boolean);

        return res.status(200).json({
            success: true,
            data: applicationsData,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: applicationsData.length,
                pages: Math.ceil(applicationsData.length / limit)
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error fetching applications', error: error.message });
    }
};

/**
 * GET /api/campaigns/search
 * Advanced campaign search
 */
exports.searchCampaigns = async (req, res) => {
    try {
        const { keyword, category, minBudget, maxBudget, minFollowers, minEngagement, city, country, page = 1, limit = 20 } = req.query;
        const skip = (page - 1) * limit;

        let query = { status: 'ACTIVE' };

        // Text search on title and description
        if (keyword) {
            query.$or = [
                { title: { $regex: keyword, $options: 'i' } },
                { description: { $regex: keyword, $options: 'i' } }
            ];
        }

        if (category) query.category = category;
        if (minBudget) query.budget = { $gte: parseInt(minBudget) };
        if (maxBudget) {
            query.budget = { ...(query.budget || {}), $lte: parseInt(maxBudget) };
        }
        if (city) query['location.city'] = { $regex: city, $options: 'i' };
        if (country) query['location.country'] = { $regex: country, $options: 'i' };

        // Requirements filtering
        if (minFollowers) query['requirements.minFollowers'] = { $lte: parseInt(minFollowers) };
        if (minEngagement) query['requirements.minEngagement'] = { $lte: parseFloat(minEngagement) };

        const total = await Campaign.countDocuments(query);
        const campaigns = await Campaign.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .select('_id title description category budget currency status brandName location requirements selectedInfluencersCount applicationCount');

        return res.status(200).json({
            success: true,
            data: campaigns,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit),
                keyword: keyword || null
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error searching campaigns', error: error.message });
    }
};

/**
 * GET /api/trending/campaigns-for-me
 * Get trending campaigns matching influencer profile
 */
exports.getTrendingCampaignsForMe = async (req, res) => {
    try {
        const influencerId = req.user.id;
        const { limit = 10, page = 1 } = req.query;
        const skip = (page - 1) * limit;

        // Get influencer profile
        const influencer = await User.findById(influencerId);
        if (!influencer) {
            return res.status(404).json({ success: false, message: 'Influencer not found' });
        }

        // Find campaigns matching influencer's profile
        let query = {
            status: 'ACTIVE',
            'requirements.minFollowers': { $lte: influencer.followers || 0 },
            'requirements.minEngagement': { $lte: influencer.averageEngagement || 0 }
        };

        // Filter by category if influencer has one
        if (influencer.categoryInstagram) {
            query.$or = [
                { category: influencer.categoryInstagram },
                { category: { $exists: false } }
            ];
        }

        const total = await Campaign.countDocuments(query);
        const campaigns = await Campaign.find(query)
            .sort({ selectedInfluencersCount: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .select('_id title description category budget currency status brandName location duration requirements selectedInfluencersCount applicationCount');

        return res.status(200).json({
            success: true,
            data: campaigns,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            },
            message: `Found ${total} campaigns matching your profile`
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error fetching personalized campaigns', error: error.message });
    }
};

/**
 * PATCH /api/campaigns/:campaignId/applications/:influencerId/approve
 * Brand approves influencer application
 */
exports.approveApplication = async (req, res) => {
    try {
        const { campaignId, influencerId } = req.params;
        const brandId = req.user.id;

        if (!mongoose.Types.ObjectId.isValid(campaignId)) {
            return res.status(400).json({ success: false, message: 'Invalid campaign ID' });
        }

        // Verify campaign ownership
        const campaign = await Campaign.findOne({
            _id: campaignId,
            userId: brandId
        });

        if (!campaign) {
            return res.status(404).json({ success: false, message: 'Campaign not found or unauthorized' });
        }

        // Find and update application
        const appIndex = campaign.applications?.findIndex(
            app => app.influencerId.toString() === influencerId
        );

        if (appIndex === -1 || appIndex === undefined) {
            return res.status(404).json({ success: false, message: 'Application not found' });
        }

        campaign.applications[appIndex].status = 'APPROVED';
        campaign.applications[appIndex].acceptedAt = new Date();
        campaign.updatedAt = Date.now();

        await campaign.save();

        return res.status(200).json({
            success: true,
            message: 'Application approved successfully',
            data: campaign.applications[appIndex]
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error approving application', error: error.message });
    }
};

/**
 * PATCH /api/campaigns/:campaignId/applications/:influencerId/reject
 * Brand rejects influencer application with reason
 */
exports.rejectApplication = async (req, res) => {
    try {
        const { campaignId, influencerId } = req.params;
        const { reason } = req.body;
        const brandId = req.user.id;

        if (!mongoose.Types.ObjectId.isValid(campaignId)) {
            return res.status(400).json({ success: false, message: 'Invalid campaign ID' });
        }

        // Verify campaign ownership
        const campaign = await Campaign.findOne({
            _id: campaignId,
            userId: brandId
        });

        if (!campaign) {
            return res.status(404).json({ success: false, message: 'Campaign not found or unauthorized' });
        }

        // Find and update application
        const appIndex = campaign.applications?.findIndex(
            app => app.influencerId.toString() === influencerId
        );

        if (appIndex === -1 || appIndex === undefined) {
            return res.status(404).json({ success: false, message: 'Application not found' });
        }

        campaign.applications[appIndex].status = 'REJECTED';
        campaign.applications[appIndex].rejectionReason = reason || 'No reason provided';
        campaign.applications[appIndex].rejectedAt = new Date();
        campaign.updatedAt = Date.now();

        await campaign.save();

        return res.status(200).json({
            success: true,
            message: 'Application rejected successfully',
            data: campaign.applications[appIndex]
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error rejecting application', error: error.message });
    }
};

/**
 * GET /api/campaigns/:campaignId/applications
 * Get all applications for a campaign (brand only)
 */
exports.getCampaignApplications = async (req, res) => {
    try {
        const { campaignId } = req.params;
        const brandId = req.user.id;
        const { status } = req.query;

        if (!mongoose.Types.ObjectId.isValid(campaignId)) {
            return res.status(400).json({ success: false, message: 'Invalid campaign ID' });
        }

        const campaign = await Campaign.findOne({
            _id: campaignId,
            userId: brandId
        });

        if (!campaign) {
            return res.status(404).json({ success: false, message: 'Campaign not found or unauthorized' });
        }

        let applications = campaign.applications || [];

        // Filter by status if provided
        if (status) {
            applications = applications.filter(app => app.status === status);
        }

        return res.status(200).json({
            success: true,
            data: applications,
            total: applications.length
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error fetching applications', error: error.message });
    }
};
