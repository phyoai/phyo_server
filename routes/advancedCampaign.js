const express = require('express');
const router = express.Router();
const advancedCampaignController = require('../controllers/advancedCampaignController');
const authMiddleware = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

// Schedule campaign
router.post('/:campaignId/schedule', advancedCampaignController.scheduleCampaign);

// Clone campaign
router.post('/:campaignId/clone', advancedCampaignController.cloneCampaign);

// Get detailed report
router.get('/:campaignId/detailed-report', advancedCampaignController.getDetailedReport);

// Bulk operations
router.post('/bulk/status-update', advancedCampaignController.bulkStatusUpdate);

// Influencer feedback
router.post('/:campaignId/feedback/:influencerId', advancedCampaignController.addInfluencerFeedback);
router.get('/:campaignId/influencer-feedback', advancedCampaignController.getInfluencerFeedback);

// Compare campaigns
router.get('/compare', advancedCampaignController.compareCampaigns);

// Export data
router.post('/:campaignId/export-data', advancedCampaignController.exportCampaignData);

module.exports = router;
