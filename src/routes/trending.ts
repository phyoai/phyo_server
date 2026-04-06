import express from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  getTrendingInfluencers,
  getTrendingCampaigns,
  getTrendingBrands,
  getTrendingDashboard
} from '../controllers/trending';

const router = express.Router();

router.get('/influencers', getTrendingInfluencers);
router.get('/campaigns', getTrendingCampaigns);
router.get('/brands', getTrendingBrands);
router.get('/dashboard', getTrendingDashboard);

export default router;
