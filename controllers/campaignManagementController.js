const Campaign = require('../models/campaign');
const User = require('../models/auth');
const mongoose = require('mongoose');

/**
 * POST /api/campaign-management/:campaignId/milestones
 * Add milestone to campaign
 */
exports.addMilestone = async (req, res) => {
    try {
        const { campaignId } = req.params;
        const userId = req.user.id;
        const { title, description, dueDate, deliverables, budget } = req.body;

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

        const milestone = {
            _id: new mongoose.Types.ObjectId(),
            title,
            description,
            dueDate: new Date(dueDate),
            deliverables: deliverables || [],
            budget: budget || 0,
            status: 'PENDING',
            createdAt: new Date(),
            completedAt: null
        };

        if (!campaign.milestones) campaign.milestones = [];
        campaign.milestones.push(milestone);
        await campaign.save();

        return res.status(201).json({
            success: true,
            message: 'Milestone added successfully',
            data: milestone
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error adding milestone', error: error.message });
    }
};

/**
 * GET /api/campaign-management/:campaignId/milestones
 * Get campaign milestones
 */
exports.getMilestones = async (req, res) => {
    try {
        const { campaignId } = req.params;
        const { status } = req.query;

        if (!mongoose.Types.ObjectId.isValid(campaignId)) {
            return res.status(400).json({ success: false, message: 'Invalid campaign ID' });
        }

        const campaign = await Campaign.findById(campaignId);
        if (!campaign) {
            return res.status(404).json({ success: false, message: 'Campaign not found' });
        }

        let milestones = campaign.milestones || [];
        if (status) {
            milestones = milestones.filter(m => m.status === status);
        }

        return res.status(200).json({
            success: true,
            data: milestones.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)),
            stats: {
                total: campaign.milestones?.length || 0,
                completed: campaign.milestones?.filter(m => m.status === 'COMPLETED').length || 0,
                pending: campaign.milestones?.filter(m => m.status === 'PENDING').length || 0,
                inProgress: campaign.milestones?.filter(m => m.status === 'IN_PROGRESS').length || 0
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error fetching milestones', error: error.message });
    }
};

/**
 * PATCH /api/campaign-management/:campaignId/milestones/:milestoneId
 * Update milestone status
 */
exports.updateMilestoneStatus = async (req, res) => {
    try {
        const { campaignId, milestoneId } = req.params;
        const userId = req.user.id;
        const { status } = req.body;

        const campaign = await Campaign.findById(campaignId);
        if (!campaign) {
            return res.status(404).json({ success: false, message: 'Campaign not found' });
        }

        if (campaign.brandId.toString() !== userId) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        const milestone = campaign.milestones?.find(m => m._id.toString() === milestoneId);
        if (!milestone) {
            return res.status(404).json({ success: false, message: 'Milestone not found' });
        }

        const oldStatus = milestone.status;
        milestone.status = status;
        if (status === 'COMPLETED') {
            milestone.completedAt = new Date();
        }

        await campaign.save();

        return res.status(200).json({
            success: true,
            message: 'Milestone updated successfully',
            data: {
                milestoneId: milestone._id,
                previousStatus: oldStatus,
                currentStatus: milestone.status,
                completedAt: milestone.completedAt
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error updating milestone', error: error.message });
    }
};

/**
 * POST /api/campaign-management/:campaignId/budget-update
 * Update campaign budget and track spending
 */
exports.updateBudget = async (req, res) => {
    try {
        const { campaignId } = req.params;
        const userId = req.user.id;
        const { newBudget, spent, reason } = req.body;

        if (!newBudget || newBudget < 0) {
            return res.status(400).json({ success: false, message: 'Invalid budget amount' });
        }

        const campaign = await Campaign.findById(campaignId);
        if (!campaign) {
            return res.status(404).json({ success: false, message: 'Campaign not found' });
        }

        if (campaign.brandId.toString() !== userId) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        const oldBudget = campaign.budget;
        const budgetDifference = newBudget - oldBudget;

        campaign.budget = newBudget;
        if (spent !== undefined) {
            campaign.budgetSpent = spent;
        }

        if (!campaign.budgetHistory) campaign.budgetHistory = [];
        campaign.budgetHistory.push({
            _id: new mongoose.Types.ObjectId(),
            previousBudget: oldBudget,
            newBudget: newBudget,
            difference: budgetDifference,
            spent: spent || 0,
            reason: reason || '',
            updatedAt: new Date(),
            updatedBy: userId
        });

        await campaign.save();

        return res.status(200).json({
            success: true,
            message: 'Budget updated successfully',
            data: {
                campaignId: campaign._id,
                previousBudget: oldBudget,
                currentBudget: newBudget,
                budgetDifference: budgetDifference,
                spent: campaign.budgetSpent || 0,
                remaining: newBudget - (campaign.budgetSpent || 0)
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error updating budget', error: error.message });
    }
};

/**
 * GET /api/campaign-management/:campaignId/budget-overview
 * Get detailed budget overview
 */
exports.getBudgetOverview = async (req, res) => {
    try {
        const { campaignId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(campaignId)) {
            return res.status(400).json({ success: false, message: 'Invalid campaign ID' });
        }

        const campaign = await Campaign.findById(campaignId);
        if (!campaign) {
            return res.status(404).json({ success: false, message: 'Campaign not found' });
        }

        const spent = campaign.budgetSpent || 0;
        const remaining = campaign.budget - spent;
        const percentageSpent = (spent / campaign.budget) * 100;

        return res.status(200).json({
            success: true,
            data: {
                campaignId: campaign._id,
                totalBudget: campaign.budget,
                spent: spent,
                remaining: remaining,
                percentageSpent: percentageSpent.toFixed(2),
                budgetHealth: percentageSpent > 90 ? 'WARNING' : percentageSpent > 100 ? 'EXCEEDED' : 'NORMAL',
                budgetHistory: campaign.budgetHistory || [],
                projectedEndDate: campaign.duration?.endDate || null
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error fetching budget', error: error.message });
    }
};

/**
 * POST /api/campaign-management/:campaignId/team-members
 * Add team member to campaign
 */
exports.addTeamMember = async (req, res) => {
    try {
        const { campaignId } = req.params;
        const userId = req.user.id;
        const { memberId, role, permissions } = req.body;

        if (!mongoose.Types.ObjectId.isValid(memberId)) {
            return res.status(400).json({ success: false, message: 'Invalid member ID' });
        }

        const campaign = await Campaign.findById(campaignId);
        if (!campaign) {
            return res.status(404).json({ success: false, message: 'Campaign not found' });
        }

        if (campaign.brandId.toString() !== userId) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        const member = await User.findById(memberId);
        if (!member) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (!campaign.teamMembers) campaign.teamMembers = [];

        if (campaign.teamMembers.find(m => m.memberId.toString() === memberId)) {
            return res.status(409).json({ success: false, message: 'Member already in team' });
        }

        campaign.teamMembers.push({
            _id: new mongoose.Types.ObjectId(),
            memberId: new mongoose.Types.ObjectId(memberId),
            memberName: member.name,
            role: role || 'VIEWER',
            permissions: permissions || ['VIEW'],
            addedAt: new Date(),
            addedBy: userId
        });

        await campaign.save();

        return res.status(201).json({
            success: true,
            message: 'Team member added successfully',
            data: {
                campaignId: campaign._id,
                memberId: memberId,
                memberName: member.name,
                role: role,
                permissions: permissions
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error adding team member', error: error.message });
    }
};

/**
 * GET /api/campaign-management/:campaignId/team-members
 * Get campaign team members
 */
exports.getTeamMembers = async (req, res) => {
    try {
        const { campaignId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(campaignId)) {
            return res.status(400).json({ success: false, message: 'Invalid campaign ID' });
        }

        const campaign = await Campaign.findById(campaignId);
        if (!campaign) {
            return res.status(404).json({ success: false, message: 'Campaign not found' });
        }

        return res.status(200).json({
            success: true,
            data: campaign.teamMembers || [],
            totalMembers: campaign.teamMembers?.length || 0
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error fetching team members', error: error.message });
    }
};

/**
 * DELETE /api/campaign-management/:campaignId/team-members/:memberId
 * Remove team member from campaign
 */
exports.removeTeamMember = async (req, res) => {
    try {
        const { campaignId, memberId } = req.params;
        const userId = req.user.id;

        const campaign = await Campaign.findById(campaignId);
        if (!campaign) {
            return res.status(404).json({ success: false, message: 'Campaign not found' });
        }

        if (campaign.brandId.toString() !== userId) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        const memberIndex = campaign.teamMembers?.findIndex(m => m.memberId.toString() === memberId);
        if (memberIndex === -1 || memberIndex === undefined) {
            return res.status(404).json({ success: false, message: 'Team member not found' });
        }

        campaign.teamMembers.splice(memberIndex, 1);
        await campaign.save();

        return res.status(200).json({
            success: true,
            message: 'Team member removed successfully'
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error removing team member', error: error.message });
    }
};

/**
 * POST /api/campaign-management/:campaignId/update
 * Comprehensive campaign update
 */
exports.updateCampaign = async (req, res) => {
    try {
        const { campaignId } = req.params;
        const userId = req.user.id;
        const { title, description, category, budget, startDate, endDate, tags, requirements } = req.body;

        const campaign = await Campaign.findById(campaignId);
        if (!campaign) {
            return res.status(404).json({ success: false, message: 'Campaign not found' });
        }

        if (campaign.brandId.toString() !== userId) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        if (campaign.status !== 'DRAFT' && campaign.status !== 'PENDING') {
            return res.status(400).json({
                success: false,
                message: 'Can only update campaigns in DRAFT or PENDING status'
            });
        }

        // Track changes
        const changes = {};
        if (title !== undefined && title !== campaign.title) {
            changes.title = { old: campaign.title, new: title };
            campaign.title = title;
        }
        if (description !== undefined && description !== campaign.description) {
            changes.description = { old: campaign.description, new: description };
            campaign.description = description;
        }
        if (category !== undefined && category !== campaign.category) {
            changes.category = { old: campaign.category, new: category };
            campaign.category = category;
        }
        if (budget !== undefined && budget !== campaign.budget) {
            changes.budget = { old: campaign.budget, new: budget };
            campaign.budget = budget;
        }
        if (tags !== undefined) {
            changes.tags = { old: campaign.tags, new: tags };
            campaign.tags = tags;
        }
        if (requirements !== undefined) {
            changes.requirements = { old: campaign.requirements, new: requirements };
            campaign.requirements = requirements;
        }

        if (startDate !== undefined && endDate !== undefined) {
            campaign.duration = {
                startDate: new Date(startDate),
                endDate: new Date(endDate)
            };
            changes.duration = { old: campaign.duration, new: campaign.duration };
        }

        if (!campaign.updateHistory) campaign.updateHistory = [];
        campaign.updateHistory.push({
            _id: new mongoose.Types.ObjectId(),
            changes: changes,
            updatedAt: new Date(),
            updatedBy: userId
        });

        campaign.updatedAt = new Date();
        await campaign.save();

        return res.status(200).json({
            success: true,
            message: 'Campaign updated successfully',
            data: {
                campaignId: campaign._id,
                changes: changes,
                updatedAt: campaign.updatedAt
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error updating campaign', error: error.message });
    }
};

/**
 * GET /api/campaign-management/:campaignId/performance
 * Get detailed campaign performance metrics
 */
exports.getCampaignPerformance = async (req, res) => {
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
        const acceptedApplications = applications.filter(a => a.status === 'ACCEPTED');
        const rejectedApplications = applications.filter(a => a.status === 'REJECTED');

        const performance = {
            campaignId: campaign._id,
            title: campaign.title,
            status: campaign.status,
            applications: {
                total: applications.length,
                accepted: acceptedApplications.length,
                rejected: rejectedApplications.length,
                pending: applications.filter(a => a.status === 'PENDING').length,
                acceptanceRate: applications.length > 0 ?
                    ((acceptedApplications.length / applications.length) * 100).toFixed(2) : 0
            },
            budget: {
                allocated: campaign.budget,
                spent: campaign.budgetSpent || 0,
                remaining: campaign.budget - (campaign.budgetSpent || 0),
                percentageSpent: ((campaign.budgetSpent || 0) / campaign.budget * 100).toFixed(2)
            },
            timeline: {
                createdAt: campaign.createdAt,
                startDate: campaign.duration?.startDate,
                endDate: campaign.duration?.endDate,
                daysRemaining: campaign.duration?.endDate ?
                    Math.ceil((new Date(campaign.duration.endDate) - new Date()) / (1000 * 60 * 60 * 24)) : 0
            },
            milestones: {
                total: campaign.milestones?.length || 0,
                completed: campaign.milestones?.filter(m => m.status === 'COMPLETED').length || 0,
                pending: campaign.milestones?.filter(m => m.status === 'PENDING').length || 0,
                completionRate: campaign.milestones?.length > 0 ?
                    ((campaign.milestones.filter(m => m.status === 'COMPLETED').length / campaign.milestones.length) * 100).toFixed(2) : 0
            },
            selectedInfluencers: campaign.selectedInfluencersCount || 0
        };

        return res.status(200).json({
            success: true,
            data: performance
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error fetching performance', error: error.message });
    }
};
