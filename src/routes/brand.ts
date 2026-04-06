import express from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  getBrands,
  getBrandById,
  getMyBrand,
  getNearbyBrands,
  searchBrandsByLocation,
  getBrandCampaigns,
  getBrandStats
} from '../controllers/brand';
import { getTrendingBrands } from '../controllers/trending';

const router = express.Router();

router.get('/', getBrands);
router.get('/me', authenticateToken, getMyBrand);
router.get('/trending', getTrendingBrands);
router.get('/nearby', getNearbyBrands);
router.get('/location/search', searchBrandsByLocation);
router.get('/:id/campaigns', getBrandCampaigns);
router.get('/:id/stats', getBrandStats);
router.get('/:id', getBrandById);

export default router;
