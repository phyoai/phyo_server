const express = require('express');
const router = express.Router();
const campaignStatusController = require('../controllers/campaignStatusController');
const authMiddleware = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

// Update campaign status
router.post('/update/:campaignId', campaignStatusController.updateCampaignStatus);

// Get status history
router.get('/:campaignId/history', campaignStatusController.getStatusHistory);

// Pause campaign
router.post('/:campaignId/pause', campaignStatusController.pauseCampaign);

// Resume campaign
router.post('/:campaignId/resume', campaignStatusController.resumeCampaign);

// Cancel campaign
router.post('/:campaignId/cancel', campaignStatusController.cancelCampaign);

// Get allowed transitions
router.get('/workflow/allowed-transitions', campaignStatusController.getAllowedTransitions);

// Extend campaign
router.post('/:campaignId/extend', campaignStatusController.extendCampaign);

// Get status summary
router.get('/bulk/status-summary', campaignStatusController.getCampaignStatusSummary);

module.exports = router;
