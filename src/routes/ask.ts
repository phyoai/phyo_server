import express from 'express';
import { 
  handleAsk, 
  handleDetails, 
  handleDebugData,
  handleBrightDataDetails,
  handleBrightDataAnalytics,
  handleBrightDataPosts,
  handleBrightDataStatus
} from '../controllers/ask';

const router = express.Router();

// POST /api/ask - Process AI prompt to find influencers
router.post('/', handleAsk);

// GET /api/ask/details - Get detailed influencer information
router.get('/details', handleDetails);

// GET /api/ask/debug - Debug endpoint to check database content
router.get('/debug', handleDebugData);

// Bright Data specific endpoints
// GET /api/ask/brightdata/details - Get Bright Data influencer details
router.get('/brightdata/details', handleBrightDataDetails);

// GET /api/ask/brightdata/analytics - Get Bright Data influencer analytics
router.get('/brightdata/analytics', handleBrightDataAnalytics);

// GET /api/ask/brightdata/posts - Get Bright Data influencer posts
router.get('/brightdata/posts', handleBrightDataPosts);

// GET /api/ask/brightdata/status - Check Bright Data API status
router.get('/brightdata/status', handleBrightDataStatus);

export default router; 