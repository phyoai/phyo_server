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
    getTrendingCampaignsForMe,
    approveApplication,
    rejectApplication,
    getCampaignApplications
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

// Get all applications for a campaign (brand only)
router.get('/:campaignId/applications', authMiddleware, getCampaignApplications);

// Approve application (brand only)
router.patch('/:campaignId/applications/:influencerId/approve', authMiddleware, approveApplication);

// Reject application (brand only)
router.patch('/:campaignId/applications/:influencerId/reject', authMiddleware, rejectApplication);

module.exports = router;
