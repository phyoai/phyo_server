import express from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  getNearbyInfluencers,
  searchInfluencersByLocation,
  getTrendingCategories,
  getNearbyDashboard,
  updateUserLocation,
  getSupportedLocations,
  getNearbyCampaigns,
  getNearbyCampaignsBatch
} from '../controllers/trending';

const router = express.Router();

// Influencer location routes
router.get('/influencers/nearby', getNearbyInfluencers);
router.get('/influencers/location/search', searchInfluencersByLocation);

// Category routes
router.get('/categories/trending', getTrendingCategories);

// Nearby dashboard
router.get('/nearby/dashboard', getNearbyDashboard);

// User location update (requires auth)
router.post('/users/location', authenticateToken, updateUserLocation);

// Supported locations
router.get('/locations/supported', getSupportedLocations);

// Nearby campaigns
router.get('/campaigns/nearby', getNearbyCampaigns);
router.post('/campaigns/nearby', getNearbyCampaignsBatch);

// ===== ALIASES FOR API COMPATIBILITY =====
// These routes support the /nearby/* structure for API compatibility
router.get('/nearby/influencers', getNearbyInfluencers);
router.get('/nearby/campaigns', getNearbyCampaigns);

export default router;
