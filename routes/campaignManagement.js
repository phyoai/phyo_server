const express = require('express');
const router = express.Router();
const campaignManagementController = require('../controllers/campaignManagementController');
const authMiddleware = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

// Milestones
router.post('/:campaignId/milestones', campaignManagementController.addMilestone);
router.get('/:campaignId/milestones', campaignManagementController.getMilestones);
router.patch('/:campaignId/milestones/:milestoneId', campaignManagementController.updateMilestoneStatus);

// Budget management
router.post('/:campaignId/budget-update', campaignManagementController.updateBudget);
router.get('/:campaignId/budget-overview', campaignManagementController.getBudgetOverview);

// Team members
router.post('/:campaignId/team-members', campaignManagementController.addTeamMember);
router.get('/:campaignId/team-members', campaignManagementController.getTeamMembers);
router.delete('/:campaignId/team-members/:memberId', campaignManagementController.removeTeamMember);

// Campaign updates
router.post('/:campaignId/update', campaignManagementController.updateCampaign);

// Performance
router.get('/:campaignId/performance', campaignManagementController.getCampaignPerformance);

module.exports = router;
