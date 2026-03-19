const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
    getAllCampaigns,
    getCampaignById,
    applyToCampaign,
    getApplicationStatus,
    withdrawApplication,
    getMyApplications,
    searchCampaigns,
    getTrendingCampaignsForMe
} = require('../controllers/campaignApplicationController');

// Get all campaigns
router.get('/all', getAllCampaigns);

// Get single campaign
router.get('/:id', getCampaignById);

// Search campaigns
router.get('/search/advanced', searchCampaigns);

// Apply to campaign (requires auth)
router.post('/:campaignId/apply', authMiddleware, applyToCampaign);

// Get application status (requires auth)
router.get('/:campaignId/application-status', authMiddleware, getApplicationStatus);

// Withdraw application (requires auth)
router.delete('/:campaignId/withdraw-application', authMiddleware, withdrawApplication);

// Get my applications (requires auth)
router.get('/my/applications', authMiddleware, getMyApplications);

// Get trending campaigns for me (requires auth)
router.get('/trending/for-me', authMiddleware, getTrendingCampaignsForMe);

module.exports = router;
