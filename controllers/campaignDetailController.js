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
            .populate({
                path: 'applicants',
                select: 'name username avatar bio instagramFollowers youtubeFollowers stats pricing memberSince availabilityStatus role',
                options: { skip: skip, limit: parseInt(limit) }
            });

        if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });

        const applications = (campaign.applicants || []).map(influencer => ({
            id: influencer._id,
            _id: influencer._id,
            name: influencer.name,
            username: influencer.username,
            bio: influencer.bio,
            description: influencer.bio, // Alias for flexibility
            avatar: influencer.avatar,
            profileImage: influencer.avatar, // Alias for flexibility
            role: influencer.role || 'Influencer',
            stats: influencer.stats,
            pricing: influencer.pricing,
            memberSince: influencer.memberSince,
            availabilityStatus: influencer.availabilityStatus,
            status: influencer.availabilityStatus || 'Pending'
        }));

        return res.status(200).json({
            success: true,
            data: applications,
            pagination: { page: parseInt(page), limit: parseInt(limit), total: campaign.applicants?.length || 0 }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error fetching applications', error: error.message });
    }
};

/**
 * GET /api/campaigns/{campaignId}/influencers
 */
exports.getCampaignInfluencers = async (req, res) => {
    try {
        const { campaignId } = req.params;
        const { page = 1, limit = 10 } = req.query;
        const skip = (page - 1) * limit;

        const campaign = await Campaign.findById(campaignId)
            .select('selectedInfluencers selectedInfluencersCount')
            .populate({
                path: 'selectedInfluencers',
                select: 'name username avatar bio instagramFollowers youtubeFollowers stats pricing memberSince availabilityStatus role',
                options: { skip: skip, limit: parseInt(limit) }
            });

        if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });

        const influencers = (campaign.selectedInfluencers || []).map(influencer => ({
            id: influencer._id,
            name: influencer.name,
            username: influencer.username,
            avatar: influencer.avatar,
            profileImage: influencer.avatar, // Alias for flexibility
            bio: influencer.bio,
            description: influencer.bio, // Alias for flexibility
            role: influencer.role || 'Influencer',
            stats: influencer.stats,
            pricing: influencer.pricing,
            memberSince: influencer.memberSince,
            availabilityStatus: influencer.availabilityStatus,
            status: influencer.availabilityStatus || 'Active',
            statusColor: influencer.availabilityStatus === 'available' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-blue-50 text-blue-700 border-blue-200'
        }));

        return res.status(200).json({
            success: true,
            data: influencers,
            pagination: { page: parseInt(page), limit: parseInt(limit), total: campaign.selectedInfluencersCount || 0 }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error fetching influencers', error: error.message });
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

        // Check if applicant exists in applicants array
        const applicantIndex = campaign.applicants?.findIndex(id => id.toString() === applicationId);
        if (applicantIndex === -1 || applicantIndex === undefined) {
            return res.status(404).json({ success: false, message: 'Application not found' });
        }

        // Move applicant to selectedInfluencers
        if (!campaign.selectedInfluencers) campaign.selectedInfluencers = [];
        if (!campaign.selectedInfluencers.includes(applicationId)) {
            campaign.selectedInfluencers.push(applicationId);
            campaign.selectedInfluencersCount = campaign.selectedInfluencers.length;
        }

        // Remove from applicants array
        campaign.applicants.splice(applicantIndex, 1);

        await campaign.save();

        return res.status(200).json({
            success: true,
            message: 'Application accepted',
            data: { influencerId: applicationId, status: 'ACCEPTED' }
        });
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

        // Check if applicant exists in applicants array
        const applicantIndex = campaign.applicants?.findIndex(id => id.toString() === applicationId);
        if (applicantIndex === -1 || applicantIndex === undefined) {
            return res.status(404).json({ success: false, message: 'Application not found' });
        }

        // Remove from applicants array
        campaign.applicants.splice(applicantIndex, 1);

        await campaign.save();

        return res.status(200).json({
            success: true,
            message: 'Application rejected',
            data: { influencerId: applicationId, status: 'REJECTED', reason: reason || '' }
        });
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

/**
 * GET /api/campaigns/{campaignId}/activity-timeline
 */
exports.getActivityTimeline = async (req, res) => {
    try {
        const { campaignId } = req.params;

        const campaign = await Campaign.findById(campaignId);
        if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });

        // Build timeline from campaign events
        const timeline = [
            {
                id: 1,
                title: 'Campaign Created',
                time: campaign.createdAt,
                status: 'completed'
            }
        ];

        // Add deliverable submitted events
        if (campaign.deliverables && campaign.deliverables.length > 0) {
            campaign.deliverables.forEach((deliverable, index) => {
                timeline.push({
                    id: timeline.length + 1,
                    title: 'Deliverable Submitted',
                    time: deliverable.submittedAt || campaign.updatedAt,
                    status: 'completed'
                });
            });
        }

        // Add counter offer events
        if (campaign.counterOffers && campaign.counterOffers.length > 0) {
            campaign.counterOffers.forEach((offer) => {
                timeline.push({
                    id: timeline.length + 1,
                    title: 'Counter offer sent',
                    time: offer.sentAt || campaign.updatedAt,
                    status: 'completed'
                });

                if (offer.acceptedAt) {
                    timeline.push({
                        id: timeline.length + 1,
                        title: 'Offer Accepted',
                        time: offer.acceptedAt,
                        status: 'completed'
                    });
                }
            });
        }

        // Add influencer invited event
        if (campaign.selectedInfluencers && campaign.selectedInfluencers.length > 0) {
            timeline.push({
                id: timeline.length + 1,
                title: 'Influencer invited',
                time: campaign.createdAt,
                status: 'pending'
            });
        }

        // Sort timeline by date descending (most recent first)
        timeline.sort((a, b) => new Date(b.time) - new Date(a.time));

        // Reassign IDs after sorting to maintain order
        timeline.forEach((event, index) => {
            event.id = index + 1;
        });

        return res.status(200).json({ success: true, data: timeline });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error fetching activity timeline', error: error.message });
    }
};
