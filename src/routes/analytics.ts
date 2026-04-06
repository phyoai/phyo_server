import express from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  getDashboardAnalytics,
  getInfluencerPerformance,
  getCampaignPerformance,
  getAllCampaignAnalytics,
  getProfileAnalytics,
  getCampaignAnalytics,
  generateReport,
  getEarnings
} from '../controllers/analytics';

const router = express.Router();

router.get('/dashboard', authenticateToken, getDashboardAnalytics);
router.get('/profile', authenticateToken, getProfileAnalytics);
router.get('/campaigns', authenticateToken, getAllCampaignAnalytics);
router.get('/influencers/:id', authenticateToken, getInfluencerPerformance);
router.get('/influencer-performance/:id?', authenticateToken, getInfluencerPerformance);
router.get('/campaign-performance/:campaignId', authenticateToken, getCampaignPerformance);
router.get('/campaigns/:campaignId/report', authenticateToken, getCampaignAnalytics);
router.get('/campaigns/:campaignId', authenticateToken, getCampaignAnalytics);
router.get('/reports', authenticateToken, generateReport);
router.get('/earnings', authenticateToken, getEarnings);

export default router;
