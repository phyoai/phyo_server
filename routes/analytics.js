const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const authMiddleware = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

// Dashboard and performance metrics
router.get('/dashboard', analyticsController.getDashboard);
router.get('/influencer-performance', analyticsController.getInfluencerPerformance);
router.get('/campaign-performance/:campaignId', analyticsController.getCampaignPerformance);

// Reports and earnings
router.get('/reports', analyticsController.generateReport);
router.get('/earnings', analyticsController.getEarnings);

module.exports = router;
