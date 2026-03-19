const Campaign = require('../models/campaign');
const User = require('../models/auth');
const mongoose = require('mongoose');

/**
 * POST /api/campaign-status/update/:campaignId
 * Update campaign status with workflow validation
 */
exports.updateCampaignStatus = async (req, res) => {
    try {
        const { campaignId } = req.params;
        const userId = req.user.id;
        const { status, reason } = req.body;

        if (!mongoose.Types.ObjectId.isValid(campaignId)) {
            return res.status(400).json({ success: false, message: 'Invalid campaign ID' });
        }

        const campaign = await Campaign.findById(campaignId);
        if (!campaign) {
            return res.status(404).json({ success: false, message: 'Campaign not found' });
        }

        // Verify ownership
        if (campaign.brandId.toString() !== userId) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        // Valid status transitions
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

        if (!validTransitions[campaign.status]?.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Cannot transition from ${campaign.status} to ${status}`,
                allowedTransitions: validTransitions[campaign.status] || []
            });
        }

        const statusHistory = {
            _id: new mongoose.Types.ObjectId(),
            from: campaign.status,
            to: status,
            reason: reason || '',
            changedBy: userId,
            changedAt: new Date()
        };

        campaign.status = status;
        if (!campaign.statusHistory) campaign.statusHistory = [];
        campaign.statusHistory.push(statusHistory);
        campaign.updatedAt = new Date();

        await campaign.save();

        return res.status(200).json({
            success: true,
            message: `Campaign status updated to ${status}`,
            data: {
                campaignId: campaign._id,
                previousStatus: statusHistory.from,
                currentStatus: campaign.status,
                reason: statusHistory.reason,
                changedAt: statusHistory.changedAt
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error updating status', error: error.message });
    }
};

/**
 * GET /api/campaign-status/:campaignId/history
 * Get campaign status history
 */
exports.getStatusHistory = async (req, res) => {
    try {
        const { campaignId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(campaignId)) {
            return res.status(400).json({ success: false, message: 'Invalid campaign ID' });
        }

        const campaign = await Campaign.findById(campaignId);
        if (!campaign) {
            return res.status(404).json({ success: false, message: 'Campaign not found' });
        }

        const history = campaign.statusHistory || [];

        return res.status(200).json({
            success: true,
            data: {
                campaignId: campaign._id,
                currentStatus: campaign.status,
                history: history.sort((a, b) => new Date(b.changedAt) - new Date(a.changedAt))
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error fetching history', error: error.message });
    }
};

/**
 * POST /api/campaign-status/:campaignId/pause
 * Pause campaign
 */
exports.pauseCampaign = async (req, res) => {
    try {
        const { campaignId } = req.params;
        const userId = req.user.id;
        const { reason } = req.body;

        const campaign = await Campaign.findById(campaignId);
        if (!campaign) {
            return res.status(404).json({ success: false, message: 'Campaign not found' });
        }

        if (campaign.brandId.toString() !== userId) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        if (campaign.status !== 'ONGOING' && campaign.status !== 'ACTIVE') {
            return res.status(400).json({
                success: false,
                message: `Cannot pause campaign with status ${campaign.status}`
            });
        }

        campaign.status = 'PAUSED';
        campaign.pausedAt = new Date();
        campaign.pauseReason = reason || '';

        if (!campaign.statusHistory) campaign.statusHistory = [];
        campaign.statusHistory.push({
            _id: new mongoose.Types.ObjectId(),
            from: 'ONGOING',
            to: 'PAUSED',
            reason: reason || '',
            changedBy: userId,
            changedAt: new Date()
        });

        await campaign.save();

        return res.status(200).json({
            success: true,
            message: 'Campaign paused successfully',
            data: {
                campaignId: campaign._id,
                status: campaign.status,
                pausedAt: campaign.pausedAt
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error pausing campaign', error: error.message });
    }
};

/**
 * POST /api/campaign-status/:campaignId/resume
 * Resume paused campaign
 */
exports.resumeCampaign = async (req, res) => {
    try {
        const { campaignId } = req.params;
        const userId = req.user.id;

        const campaign = await Campaign.findById(campaignId);
        if (!campaign) {
            return res.status(404).json({ success: false, message: 'Campaign not found' });
        }

        if (campaign.brandId.toString() !== userId) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        if (campaign.status !== 'PAUSED') {
            return res.status(400).json({
                success: false,
                message: `Cannot resume campaign with status ${campaign.status}`
            });
        }

        campaign.status = 'ONGOING';
        campaign.resumedAt = new Date();

        if (!campaign.statusHistory) campaign.statusHistory = [];
        campaign.statusHistory.push({
            _id: new mongoose.Types.ObjectId(),
            from: 'PAUSED',
            to: 'ONGOING',
            reason: 'Campaign resumed',
            changedBy: userId,
            changedAt: new Date()
        });

        await campaign.save();

        return res.status(200).json({
            success: true,
            message: 'Campaign resumed successfully',
            data: {
                campaignId: campaign._id,
                status: campaign.status,
                resumedAt: campaign.resumedAt
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error resuming campaign', error: error.message });
    }
};

/**
 * POST /api/campaign-status/:campaignId/cancel
 * Cancel campaign with refund
 */
exports.cancelCampaign = async (req, res) => {
    try {
        const { campaignId } = req.params;
        const userId = req.user.id;
        const { reason, refundPercentage = 100 } = req.body;

        const campaign = await Campaign.findById(campaignId);
        if (!campaign) {
            return res.status(404).json({ success: false, message: 'Campaign not found' });
        }

        if (campaign.brandId.toString() !== userId) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        const refundAmount = (campaign.budget * refundPercentage) / 100;

        campaign.status = 'CANCELLED';
        campaign.cancelledAt = new Date();
        campaign.cancellationReason = reason || '';
        campaign.refundAmount = refundAmount;
        campaign.refundPercentage = refundPercentage;

        if (!campaign.statusHistory) campaign.statusHistory = [];
        campaign.statusHistory.push({
            _id: new mongoose.Types.ObjectId(),
            from: campaign.status,
            to: 'CANCELLED',
            reason: reason || '',
            changedBy: userId,
            changedAt: new Date()
        });

        await campaign.save();

        return res.status(200).json({
            success: true,
            message: 'Campaign cancelled successfully',
            data: {
                campaignId: campaign._id,
                status: campaign.status,
                cancelledAt: campaign.cancelledAt,
                refundAmount: refundAmount,
                refundStatus: 'PENDING'
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error cancelling campaign', error: error.message });
    }
};

/**
 * GET /api/campaign-status/workflow/allowed-transitions
 * Get allowed status transitions for current campaign
 */
exports.getAllowedTransitions = async (req, res) => {
    try {
        const { campaignId } = req.query;

        if (!campaignId || !mongoose.Types.ObjectId.isValid(campaignId)) {
            return res.status(400).json({ success: false, message: 'Invalid campaign ID' });
        }

        const campaign = await Campaign.findById(campaignId);
        if (!campaign) {
            return res.status(404).json({ success: false, message: 'Campaign not found' });
        }

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

        return res.status(200).json({
            success: true,
            data: {
                campaignId: campaign._id,
                currentStatus: campaign.status,
                allowedTransitions: validTransitions[campaign.status] || []
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error fetching transitions', error: error.message });
    }
};

/**
 * POST /api/campaign-status/:campaignId/extend
 * Extend campaign end date
 */
exports.extendCampaign = async (req, res) => {
    try {
        const { campaignId } = req.params;
        const userId = req.user.id;
        const { extendDays, additionalBudget = 0 } = req.body;

        if (!extendDays || extendDays <= 0) {
            return res.status(400).json({ success: false, message: 'extendDays must be greater than 0' });
        }

        const campaign = await Campaign.findById(campaignId);
        if (!campaign) {
            return res.status(404).json({ success: false, message: 'Campaign not found' });
        }

        if (campaign.brandId.toString() !== userId) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        if (!campaign.duration || !campaign.duration.endDate) {
            return res.status(400).json({ success: false, message: 'Campaign has no end date' });
        }

        const oldEndDate = campaign.duration.endDate;
        const newEndDate = new Date(oldEndDate.getTime() + extendDays * 24 * 60 * 60 * 1000);

        campaign.duration.endDate = newEndDate;
        campaign.budget += additionalBudget;

        if (!campaign.extensions) campaign.extensions = [];
        campaign.extensions.push({
            _id: new mongoose.Types.ObjectId(),
            extendedBy: extendDays,
            oldEndDate: oldEndDate,
            newEndDate: newEndDate,
            additionalBudget: additionalBudget,
            extendedAt: new Date(),
            extendedBy: userId
        });

        await campaign.save();

        return res.status(200).json({
            success: true,
            message: 'Campaign extended successfully',
            data: {
                campaignId: campaign._id,
                oldEndDate: oldEndDate,
                newEndDate: newEndDate,
                extendedDays: extendDays,
                additionalBudget: additionalBudget,
                totalBudget: campaign.budget
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error extending campaign', error: error.message });
    }
};

/**
 * GET /api/campaign-status/bulk/status-summary
 * Get summary of campaigns by status
 */
exports.getCampaignStatusSummary = async (req, res) => {
    try {
        const userId = req.user.id;

        const campaigns = await Campaign.find({ brandId: userId });

        const summary = {
            total: campaigns.length,
            byStatus: {
                DRAFT: campaigns.filter(c => c.status === 'DRAFT').length,
                PENDING: campaigns.filter(c => c.status === 'PENDING').length,
                ACTIVE: campaigns.filter(c => c.status === 'ACTIVE').length,
                ONGOING: campaigns.filter(c => c.status === 'ONGOING').length,
                PAUSED: campaigns.filter(c => c.status === 'PAUSED').length,
                COMPLETED: campaigns.filter(c => c.status === 'COMPLETED').length,
                CANCELLED: campaigns.filter(c => c.status === 'CANCELLED').length,
                REJECTED: campaigns.filter(c => c.status === 'REJECTED').length
            },
            activeCampaigns: campaigns.filter(c => ['ACTIVE', 'ONGOING'].includes(c.status)).length,
            totalBudgetAllocated: campaigns.reduce((sum, c) => sum + (c.budget || 0), 0),
            totalApplications: campaigns.reduce((sum, c) => sum + (c.applications?.length || 0), 0)
        };

        return res.status(200).json({
            success: true,
            data: summary
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error fetching summary', error: error.message });
    }
};
