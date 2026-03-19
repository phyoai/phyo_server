const Campaign = require('../models/campaign');
const User = require('../models/auth');
const mongoose = require('mongoose');

/**
 * POST /api/advanced-campaigns/:campaignId/schedule
 * Schedule campaign to start/activate at specific time
 */
exports.scheduleCampaign = async (req, res) => {
    try {
        const { campaignId } = req.params;
        const userId = req.user.id;
        const { scheduledStartTime, scheduledEndTime, timezone } = req.body;

        if (!mongoose.Types.ObjectId.isValid(campaignId)) {
            return res.status(400).json({ success: false, message: 'Invalid campaign ID' });
        }

        const campaign = await Campaign.findById(campaignId);
        if (!campaign) {
            return res.status(404).json({ success: false, message: 'Campaign not found' });
        }

        if (campaign.brandId.toString() !== userId) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        campaign.scheduling = {
            scheduledStartTime: new Date(scheduledStartTime),
            scheduledEndTime: new Date(scheduledEndTime),
            timezone: timezone || 'UTC',
            isScheduled: true,
            createdAt: new Date()
        };

        await campaign.save();

        return res.status(200).json({
            success: true,
            message: 'Campaign scheduled successfully',
            data: {
                campaignId: campaign._id,
                scheduledStartTime: campaign.scheduling.scheduledStartTime,
                scheduledEndTime: campaign.scheduling.scheduledEndTime,
                timezone: campaign.scheduling.timezone
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error scheduling campaign', error: error.message });
    }
};

/**
 * POST /api/advanced-campaigns/:campaignId/clone
 * Clone campaign with all settings
 */
exports.cloneCampaign = async (req, res) => {
    try {
        const { campaignId } = req.params;
        const userId = req.user.id;
        const { newTitle, newStartDate, newEndDate } = req.body;

        const originalCampaign = await Campaign.findById(campaignId);
        if (!originalCampaign) {
            return res.status(404).json({ success: false, message: 'Campaign not found' });
        }

        if (originalCampaign.brandId.toString() !== userId) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        const clonedData = {
            ...originalCampaign.toObject(),
            _id: new mongoose.Types.ObjectId(),
            title: newTitle || `${originalCampaign.title} (Clone)`,
            status: 'DRAFT',
            createdAt: new Date(),
            updatedAt: new Date(),
            applications: [],
            milestones: [],
            duration: {
                startDate: newStartDate ? new Date(newStartDate) : originalCampaign.duration?.startDate,
                endDate: newEndDate ? new Date(newEndDate) : originalCampaign.duration?.endDate
            },
            statusHistory: [],
            budgetHistory: [],
            updateHistory: [],
            clonedFrom: campaignId
        };

        const clonedCampaign = await Campaign.create(clonedData);

        return res.status(201).json({
            success: true,
            message: 'Campaign cloned successfully',
            data: {
                originalCampaignId: campaignId,
                clonedCampaignId: clonedCampaign._id,
                clonedTitle: clonedCampaign.title,
                clonedStatus: clonedCampaign.status
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error cloning campaign', error: error.message });
    }
};

/**
 * GET /api/advanced-campaigns/:campaignId/detailed-report
 * Get comprehensive campaign report
 */
exports.getDetailedReport = async (req, res) => {
    try {
        const { campaignId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(campaignId)) {
            return res.status(400).json({ success: false, message: 'Invalid campaign ID' });
        }

        const campaign = await Campaign.findById(campaignId);
        if (!campaign) {
            return res.status(404).json({ success: false, message: 'Campaign not found' });
        }

        const applications = campaign.applications || [];
        const acceptedApps = applications.filter(a => a.status === 'ACCEPTED');
        const rejectedApps = applications.filter(a => a.status === 'REJECTED');
        const pendingApps = applications.filter(a => a.status === 'PENDING');

        const report = {
            campaignId: campaign._id,
            title: campaign.title,
            reportGeneratedAt: new Date(),

            overview: {
                status: campaign.status,
                category: campaign.category,
                totalBudget: campaign.budget,
                budgetSpent: campaign.budgetSpent || 0,
                createdAt: campaign.createdAt,
                duration: campaign.duration
            },

            applications: {
                total: applications.length,
                accepted: acceptedApps.length,
                rejected: rejectedApps.length,
                pending: pendingApps.length,
                acceptanceRate: applications.length > 0 ?
                    ((acceptedApps.length / applications.length) * 100).toFixed(2) : 0,
                averageProposedRate: acceptedApps.length > 0 ?
                    (acceptedApps.reduce((sum, a) => sum + (a.proposedRate || 0), 0) / acceptedApps.length).toFixed(2) : 0
            },

            budget: {
                allocated: campaign.budget,
                spent: campaign.budgetSpent || 0,
                remaining: campaign.budget - (campaign.budgetSpent || 0),
                percentageUtilized: ((campaign.budgetSpent || 0) / campaign.budget * 100).toFixed(2),
                budgetPerInfluencer: acceptedApps.length > 0 ?
                    (campaign.budget / acceptedApps.length).toFixed(2) : 0
            },

            milestones: {
                total: campaign.milestones?.length || 0,
                completed: campaign.milestones?.filter(m => m.status === 'COMPLETED').length || 0,
                pending: campaign.milestones?.filter(m => m.status === 'PENDING').length || 0,
                inProgress: campaign.milestones?.filter(m => m.status === 'IN_PROGRESS').length || 0,
                completionPercentage: campaign.milestones?.length > 0 ?
                    ((campaign.milestones.filter(m => m.status === 'COMPLETED').length / campaign.milestones.length) * 100).toFixed(2) : 0
            },

            team: {
                totalMembers: campaign.teamMembers?.length || 0,
                roles: campaign.teamMembers?.reduce((acc, m) => {
                    acc[m.role] = (acc[m.role] || 0) + 1;
                    return acc;
                }, {}) || {}
            },

            timeline: {
                daysActive: Math.floor((new Date() - campaign.createdAt) / (1000 * 60 * 60 * 24)),
                daysRemaining: campaign.duration?.endDate ?
                    Math.ceil((new Date(campaign.duration.endDate) - new Date()) / (1000 * 60 * 60 * 24)) : 0,
                startDate: campaign.duration?.startDate,
                endDate: campaign.duration?.endDate
            },

            history: {
                statusChanges: campaign.statusHistory?.length || 0,
                budgetUpdates: campaign.budgetHistory?.length || 0,
                campaignUpdates: campaign.updateHistory?.length || 0
            }
        };

        return res.status(200).json({
            success: true,
            data: report
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error generating report', error: error.message });
    }
};

/**
 * POST /api/advanced-campaigns/bulk/status-update
 * Update status for multiple campaigns
 */
exports.bulkStatusUpdate = async (req, res) => {
    try {
        const userId = req.user.id;
        const { campaignIds, newStatus, reason } = req.body;

        if (!Array.isArray(campaignIds) || campaignIds.length === 0) {
            return res.status(400).json({ success: false, message: 'campaignIds must be a non-empty array' });
        }

        const validIds = campaignIds.filter(id => mongoose.Types.ObjectId.isValid(id));
        const campaigns = await Campaign.find({
            _id: { $in: validIds },
            brandId: userId
        });

        if (campaigns.length === 0) {
            return res.status(404).json({ success: false, message: 'No campaigns found' });
        }

        const results = {
            successful: [],
            failed: []
        };

        for (const campaign of campaigns) {
            try {
                const validTransitions = {
                    'DRAFT': ['PENDING', 'CANCELLED'],
                    'PENDING': ['ACTIVE', 'REJECTED', 'CANCELLED'],
                    'ACTIVE': ['ONGOING', 'PAUSED', 'CANCELLED'],
                    'ONGOING': ['COMPLETED', 'PAUSED', 'CANCELLED'],
                    'PAUSED': ['ONGOING', 'CANCELLED'],
                    'COMPLETED': [],
                    'CANCELLED': [],
                    'REJECTED': ['DRAFT']
                };

                if (validTransitions[campaign.status]?.includes(newStatus)) {
                    campaign.status = newStatus;
                    if (!campaign.statusHistory) campaign.statusHistory = [];
                    campaign.statusHistory.push({
                        _id: new mongoose.Types.ObjectId(),
                        from: campaign.status,
                        to: newStatus,
                        reason: reason || '',
                        changedBy: userId,
                        changedAt: new Date()
                    });
                    await campaign.save();

                    results.successful.push({
                        campaignId: campaign._id,
                        title: campaign.title,
                        newStatus: newStatus
                    });
                } else {
                    results.failed.push({
                        campaignId: campaign._id,
                        title: campaign.title,
                        reason: `Cannot transition from ${campaign.status} to ${newStatus}`
                    });
                }
            } catch (err) {
                results.failed.push({
                    campaignId: campaign._id,
                    title: campaign.title,
                    reason: err.message
                });
            }
        }

        return res.status(200).json({
            success: true,
            message: `Bulk update completed: ${results.successful.length} successful, ${results.failed.length} failed`,
            data: results
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error bulk updating campaigns', error: error.message });
    }
};

/**
 * POST /api/advanced-campaigns/:campaignId/feedback/:influencerId
 * Add feedback on influencer performance
 */
exports.addInfluencerFeedback = async (req, res) => {
    try {
        const { campaignId, influencerId } = req.params;
        const userId = req.user.id;
        const { rating, comment, deliveryQuality, communicationQuality, performanceNotes } = req.body;

        if (!mongoose.Types.ObjectId.isValid(campaignId)) {
            return res.status(400).json({ success: false, message: 'Invalid campaign ID' });
        }

        const campaign = await Campaign.findById(campaignId);
        if (!campaign) {
            return res.status(404).json({ success: false, message: 'Campaign not found' });
        }

        if (campaign.brandId.toString() !== userId) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        if (!campaign.influencerFeedback) campaign.influencerFeedback = [];

        const feedback = {
            _id: new mongoose.Types.ObjectId(),
            influencerId: new mongoose.Types.ObjectId(influencerId),
            rating: rating || 0,
            comment: comment || '',
            deliveryQuality: deliveryQuality || 0,
            communicationQuality: communicationQuality || 0,
            performanceNotes: performanceNotes || '',
            createdAt: new Date()
        };

        campaign.influencerFeedback.push(feedback);
        await campaign.save();

        return res.status(201).json({
            success: true,
            message: 'Feedback added successfully',
            data: feedback
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error adding feedback', error: error.message });
    }
};

/**
 * GET /api/advanced-campaigns/:campaignId/influencer-feedback
 * Get all feedback for influencers
 */
exports.getInfluencerFeedback = async (req, res) => {
    try {
        const { campaignId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(campaignId)) {
            return res.status(400).json({ success: false, message: 'Invalid campaign ID' });
        }

        const campaign = await Campaign.findById(campaignId);
        if (!campaign) {
            return res.status(404).json({ success: false, message: 'Campaign not found' });
        }

        const feedbacks = campaign.influencerFeedback || [];
        const averageRating = feedbacks.length > 0 ?
            (feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length).toFixed(2) : 0;

        return res.status(200).json({
            success: true,
            data: feedbacks,
            stats: {
                totalFeedbacks: feedbacks.length,
                averageRating: averageRating,
                averageDeliveryQuality: feedbacks.length > 0 ?
                    (feedbacks.reduce((sum, f) => sum + f.deliveryQuality, 0) / feedbacks.length).toFixed(2) : 0,
                averageCommunication: feedbacks.length > 0 ?
                    (feedbacks.reduce((sum, f) => sum + f.communicationQuality, 0) / feedbacks.length).toFixed(2) : 0
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error fetching feedback', error: error.message });
    }
};

/**
 * GET /api/advanced-campaigns/compare
 * Compare multiple campaigns
 */
exports.compareCampaigns = async (req, res) => {
    try {
        const userId = req.user.id;
        const { campaignIds } = req.query;

        if (!campaignIds || typeof campaignIds !== 'string') {
            return res.status(400).json({ success: false, message: 'campaignIds query parameter required' });
        }

        const ids = campaignIds.split(',').filter(id => mongoose.Types.ObjectId.isValid(id));
        if (ids.length === 0) {
            return res.status(400).json({ success: false, message: 'No valid campaign IDs provided' });
        }

        const campaigns = await Campaign.find({
            _id: { $in: ids },
            brandId: userId
        });

        const comparison = campaigns.map(campaign => ({
            campaignId: campaign._id,
            title: campaign.title,
            status: campaign.status,
            budget: campaign.budget,
            budgetSpent: campaign.budgetSpent || 0,
            applications: (campaign.applications || []).length,
            acceptedApplications: (campaign.applications || []).filter(a => a.status === 'ACCEPTED').length,
            duration: {
                startDate: campaign.duration?.startDate,
                endDate: campaign.duration?.endDate
            },
            milestones: (campaign.milestones || []).length,
            completedMilestones: (campaign.milestones || []).filter(m => m.status === 'COMPLETED').length
        }));

        return res.status(200).json({
            success: true,
            data: comparison,
            totalComparison: comparison.length
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error comparing campaigns', error: error.message });
    }
};

/**
 * POST /api/advanced-campaigns/:campaignId/export-data
 * Export campaign data
 */
exports.exportCampaignData = async (req, res) => {
    try {
        const { campaignId } = req.params;
        const userId = req.user.id;
        const { format = 'json' } = req.body;

        if (!mongoose.Types.ObjectId.isValid(campaignId)) {
            return res.status(400).json({ success: false, message: 'Invalid campaign ID' });
        }

        const campaign = await Campaign.findById(campaignId);
        if (!campaign) {
            return res.status(404).json({ success: false, message: 'Campaign not found' });
        }

        if (campaign.brandId.toString() !== userId) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        const exportData = {
            exportedAt: new Date(),
            format: format,
            campaign: {
                id: campaign._id,
                title: campaign.title,
                status: campaign.status,
                budget: campaign.budget,
                applications: campaign.applications || [],
                milestones: campaign.milestones || [],
                teamMembers: campaign.teamMembers || [],
                statusHistory: campaign.statusHistory || [],
                budgetHistory: campaign.budgetHistory || []
            }
        };

        return res.status(200).json({
            success: true,
            message: `Campaign data exported as ${format}`,
            data: exportData,
            downloadUrl: `/api/advanced-campaigns/${campaignId}/export/${format}`
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error exporting data', error: error.message });
    }
};
