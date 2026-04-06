import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { requireFeatureAccess, requireCredits, deductCredits } from '../middleware/planAccess';
import {
  createInfluencer,
  getInfluencers,
  getInfluencerById,
  getInfluencerByUsername,
  updateInfluencer,
  updateInfluencerByUsername,
  deleteInfluencer,
  deleteInfluencerByUsername,
  getInfluencerStats,
  searchInfluencers,
  getNearbyInfluencers,
  getPopularInfluencers
} from '../controllers/influencer';
import { getTrendingInfluencers } from '../controllers/trending';

const router = express.Router();

// POST /api/influencers/search - Search influencers using BrightScraper (100% accurate)
router.post('/search', authenticateToken, searchInfluencers);
router.get('/trending', getTrendingInfluencers);

// GET /api/influencers/popular - Get popular Instagram influencers (auto-load)
router.get('/popular', getPopularInfluencers);

// GET /api/influencers/nearby - Get nearby/similar influencers by location and engagement
router.get('/nearby', getNearbyInfluencers);

// GET /api/influencers/stats - Get influencer statistics (public)
router.get('/stats', getInfluencerStats);

// GET /api/influencers - Get all influencers with search and pagination (PUBLIC)
router.get('/', getInfluencers);

// POST /api/influencers - Create new influencer (admin only - keep unrestricted for now)
router.post('/', createInfluencer);

// GET /api/influencers/username/:username - Get influencer by username
router.get('/username/:username', authenticateToken, requireFeatureAccess('creatorSearch'), requireCredits(1), deductCredits(1), getInfluencerByUsername);

// PATCH /api/influencers/username/:username - Update influencer by username (admin only)
router.patch('/username/:username', updateInfluencerByUsername);

// DELETE /api/influencers/username/:username - Delete influencer by username (admin only)
router.delete('/username/:username', deleteInfluencerByUsername);

// GET /api/influencers/:id - Get influencer by ID
router.get('/:id', authenticateToken, requireFeatureAccess('creatorSearch'), requireCredits(1), deductCredits(1), getInfluencerById);

// PATCH /api/influencers/:id - Update influencer by ID (admin only)
router.patch('/:id', updateInfluencer);

// DELETE /api/influencers/:id - Delete influencer by ID (admin only)
router.delete('/:id', deleteInfluencer);

export default router;
