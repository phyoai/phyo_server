import express from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  getDashboardMetrics,
  getRecentCampaigns,
  getTrendingInfluencers,
  getCampaignStats
} from '../controllers/dashboard';

const router = express.Router();

router.get('/metrics', authenticateToken, getDashboardMetrics);
router.get('/campaigns', authenticateToken, getRecentCampaigns);
router.get('/trending-influencers', authenticateToken, getTrendingInfluencers);
router.get('/campaign-stats', authenticateToken, getCampaignStats);

export default router;
