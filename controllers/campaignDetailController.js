const Campaign = require('../models/campaign');
const User = require('../models/auth');
const mongoose = require('mongoose');

/**
 * GET /api/campaigns/{campaignId}/deliverables
 */
exports.getCampaignDeliverables = async (req, res) => {
    try {
        const { campaignId } = req.params;

        const campaign = await Campaign.findById(campaignId).select('deliverables').lean();
        if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });

        return res.status(200).json({ success: true, data: campaign.deliverables || [] });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error fetching deliverables', error: error.message });
    }
};

/**
 * POST /api/campaigns/{campaignId}/deliverables
 */
exports.addDeliverable = async (req, res) => {
    try {
        const { campaignId } = req.params;
        const { title, details, icon, status } = req.body;

        if (!title || !details) {
            return res.status(400).json({ success: false, message: 'title and details are required' });
        }

        const campaign = await Campaign.findById(campaignId);
        if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });

        const deliverable = {
            _id: new mongoose.Types.ObjectId(),
            title,
            details,
            icon: icon || 'AddLine',
            status: status || 'pending'
        };

        if (!campaign.deliverables) campaign.deliverables = [];
        campaign.deliverables.push(deliverable);
        await campaign.save();

        return res.status(201).json({ success: true, data: deliverable });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error adding deliverable', error: error.message });
    }
};

/**
 * GET /api/campaigns/{campaignId}/applications
 */
exports.getCampaignApplications = async (req, res) => {
    try {
        const { campaignId } = req.params;
        const { page = 1, limit = 10 } = req.query;
        const skip = (page - 1) * limit;

        const campaign = await Campaign.findById(campaignId)
            .populate('applications.influencerId', 'name username avatar bio instagramFollowers youtubeFollowers stats pricing memberSince availabilityStatus')
            .skip(skip)
            .limit(parseInt(limit));

        if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });

        const applications = campaign.applications.map(app => ({
            id: app._id,
            influencerId: app.influencerId?._id,
            name: app.influencerId?.name,
            username: app.influencerId?.username,
            bio: app.influencerId?.bio,
            avatar: app.influencerId?.avatar,
            stats: app.influencerId?.stats,
            pricing: app.influencerId?.pricing,
            memberSince: app.influencerId?.memberSince,
            availabilityStatus: app.influencerId?.availabilityStatus,
            status: app.status,
            appliedAt: app.appliedAt
        }));

        return res.status(200).json({
            success: true,
            data: applications,
            pagination: { page: parseInt(page), limit: parseInt(limit), total: campaign.applications.length }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error fetching applications', error: error.message });
    }
};

/**
 * POST /api/campaigns/{campaignId}/applications/{applicationId}/accept
 */
exports.acceptApplication = async (req, res) => {
    try {
        const { campaignId, applicationId } = req.params;

        const campaign = await Campaign.findById(campaignId);
        if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });

        const application = campaign.applications.id(applicationId);
        if (!application) return res.status(404).json({ success: false, message: 'Application not found' });

        application.status = 'ACCEPTED';
        application.acceptedAt = new Date();

        if (!campaign.selectedInfluencers) campaign.selectedInfluencers = [];
        if (!campaign.selectedInfluencers.includes(application.influencerId)) {
            campaign.selectedInfluencers.push(application.influencerId);
            campaign.selectedInfluencersCount = campaign.selectedInfluencers.length;
        }

        await campaign.save();

        return res.status(200).json({ success: true, message: 'Application accepted', data: application });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error accepting application', error: error.message });
    }
};

/**
 * POST /api/campaigns/{campaignId}/applications/{applicationId}/reject
 */
exports.rejectApplication = async (req, res) => {
    try {
        const { campaignId, applicationId } = req.params;
        const { reason } = req.body;

        const campaign = await Campaign.findById(campaignId);
        if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });

        const application = campaign.applications.id(applicationId);
        if (!application) return res.status(404).json({ success: false, message: 'Application not found' });

        application.status = 'REJECTED';
        application.rejectionReason = reason || '';
        application.rejectedAt = new Date();

        await campaign.save();

        return res.status(200).json({ success: true, message: 'Application rejected', data: application });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error rejecting application', error: error.message });
    }
};

/**
 * POST /api/campaigns/{campaignId}/counter-offer
 */
exports.sendCounterOffer = async (req, res) => {
    try {
        const { campaignId } = req.params;
        const { influencerId, amount, message } = req.body;

        if (!amount || !influencerId) {
            return res.status(400).json({ success: false, message: 'amount and influencerId are required' });
        }

        const campaign = await Campaign.findById(campaignId);
        if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });

        const counterOffer = {
            _id: new mongoose.Types.ObjectId(),
            influencerId: new mongoose.Types.ObjectId(influencerId),
            amount,
            message: message || '',
            status: 'PENDING',
            sentAt: new Date()
        };

        if (!campaign.counterOffers) campaign.counterOffers = [];
        campaign.counterOffers.push(counterOffer);
        await campaign.save();

        return res.status(201).json({ success: true, data: counterOffer });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error sending counter offer', error: error.message });
    }
};

/**
 * POST /api/campaigns/{campaignId}/boost
 */
exports.boostCampaign = async (req, res) => {
    try {
        const { campaignId } = req.params;
        const { selectedOptions } = req.body;

        if (!selectedOptions || selectedOptions.length === 0) {
            return res.status(400).json({ success: false, message: 'selectedOptions are required' });
        }

        const campaign = await Campaign.findByIdAndUpdate(
            campaignId,
            {
                boosted: true,
                boostOptions: selectedOptions,
                boostAppliedAt: new Date(),
                visibility: 'HIGH'
            },
            { new: true }
        );

        if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });

        return res.status(200).json({ success: true, message: 'Campaign boosted', data: campaign });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error boosting campaign', error: error.message });
    }
};

/**
 * GET /api/campaigns/{campaignId}/negotiations/{influencerId}
 */
exports.getNegotiationDetails = async (req, res) => {
    try {
        const { campaignId, influencerId } = req.params;

        const campaign = await Campaign.findById(campaignId);
        if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });

        const negotiation = campaign.counterOffers?.find(o => o.influencerId.toString() === influencerId);

        return res.status(200).json({
            success: true,
            data: negotiation || { status: 'NO_OFFER', influencerId }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error fetching negotiation', error: error.message });
    }
};

/**
 * POST /api/campaigns/{campaignId}/negotiations/{influencerId}/accept
 */
exports.acceptCounterOffer = async (req, res) => {
    try {
        const { campaignId, influencerId } = req.params;

        const campaign = await Campaign.findById(campaignId);
        if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });

        const offer = campaign.counterOffers?.find(o => o.influencerId.toString() === influencerId);
        if (!offer) return res.status(404).json({ success: false, message: 'Offer not found' });

        offer.status = 'ACCEPTED';
        offer.acceptedAt = new Date();

        if (!campaign.selectedInfluencers) campaign.selectedInfluencers = [];
        if (!campaign.selectedInfluencers.some(id => id.toString() === influencerId)) {
            campaign.selectedInfluencers.push(new mongoose.Types.ObjectId(influencerId));
        }

        await campaign.save();

        return res.status(200).json({ success: true, message: 'Counter offer accepted', data: offer });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error accepting offer', error: error.message });
    }
};

/**
 * POST /api/campaigns/{campaignId}/negotiations/{influencerId}/reject
 */
exports.rejectCounterOffer = async (req, res) => {
    try {
        const { campaignId, influencerId } = req.params;
        const { reason } = req.body;

        const campaign = await Campaign.findById(campaignId);
        if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });

        const offer = campaign.counterOffers?.find(o => o.influencerId.toString() === influencerId);
        if (!offer) return res.status(404).json({ success: false, message: 'Offer not found' });

        offer.status = 'REJECTED';
        offer.rejectionReason = reason || '';
        offer.rejectedAt = new Date();

        await campaign.save();

        return res.status(200).json({ success: true, message: 'Counter offer rejected', data: offer });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error rejecting offer', error: error.message });
    }
};

/**
 * GET /api/campaigns/{campaignId}/negotiations/{influencerId}/timeline
 */
exports.getNegotiationTimeline = async (req, res) => {
    try {
        const { campaignId, influencerId } = req.params;

        const campaign = await Campaign.findById(campaignId);
        if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });

        const offer = campaign.counterOffers?.find(o => o.influencerId.toString() === influencerId);

        const timeline = [
            { title: 'Campaign Created', time: campaign.createdAt, status: 'completed' },
            offer && { title: 'Counter Offer Sent', time: offer.sentAt, status: offer.status === 'ACCEPTED' ? 'completed' : 'pending' },
            offer?.acceptedAt && { title: 'Offer Accepted', time: offer.acceptedAt, status: 'completed' }
        ].filter(Boolean);

        return res.status(200).json({ success: true, data: timeline });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error fetching timeline', error: error.message });
    }
};

/**
 * GET /api/campaigns/{campaignId}/boost-recommendations
 */
exports.getBoostRecommendations = async (req, res) => {
    try {
        const recommendations = [
            {
                id: 1,
                title: 'Supercharge Campaign',
                description: 'Amplify reach and engagement with advanced boost options',
                badge: 'RECOMMENDED',
                badgeColor: 'bg-green-100 text-green-700',
                cardColor: 'bg-green-700',
                icon: '⚡'
            },
            {
                id: 2,
                title: 'Featured Placement',
                description: 'Get featured in top recommendations',
                badge: 'POPULAR',
                badgeColor: 'bg-blue-100 text-blue-700',
                cardColor: 'bg-blue-700',
                icon: '⭐'
            },
            {
                id: 3,
                title: 'Extended Duration',
                description: 'Keep your campaign active longer',
                badge: 'EXTEND',
                badgeColor: 'bg-purple-100 text-purple-700',
                cardColor: 'bg-purple-700',
                icon: '📅'
            }
        ];

        return res.status(200).json({ success: true, data: recommendations });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error fetching recommendations', error: error.message });
    }
};
