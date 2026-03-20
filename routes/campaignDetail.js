const express = require('express');
const router = express.Router();
const campaignDetailController = require('../controllers/campaignDetailController');

// Deliverables
router.get('/:campaignId/deliverables', campaignDetailController.getCampaignDeliverables);
router.post('/:campaignId/deliverables', campaignDetailController.addDeliverable);

// Applications
router.get('/:campaignId/applications', campaignDetailController.getCampaignApplications);

// Influencers working on campaign
router.get('/:campaignId/influencers', campaignDetailController.getCampaignInfluencers);
router.post('/:campaignId/applications/:applicationId/accept', campaignDetailController.acceptApplication);
router.post('/:campaignId/applications/:applicationId/reject', campaignDetailController.rejectApplication);

// Counter Offers
router.post('/:campaignId/counter-offer', campaignDetailController.sendCounterOffer);
router.get('/:campaignId/negotiations/:influencerId', campaignDetailController.getNegotiationDetails);
router.post('/:campaignId/negotiations/:influencerId/accept', campaignDetailController.acceptCounterOffer);
router.post('/:campaignId/negotiations/:influencerId/reject', campaignDetailController.rejectCounterOffer);
router.get('/:campaignId/negotiations/:influencerId/timeline', campaignDetailController.getNegotiationTimeline);

// Campaign Boost
router.post('/:campaignId/boost', campaignDetailController.boostCampaign);
router.get('/:campaignId/boost-recommendations', campaignDetailController.getBoostRecommendations);

// Activity Timeline
router.get('/:campaignId/activity-timeline', campaignDetailController.getActivityTimeline);
router.get('/:campaignId/negotiations/:influencerId/activity-timeline', campaignDetailController.getNegotiationTimeline);

module.exports = router;
