import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { requireFeatureAccess, requireCredits, deductCredits } from '../middleware/planAccess';
import { handleAsk, handleDetails, handleDebugData, handleTestBrightData, handleTestSnapshot, handleInstagramReel } from '../controllers/askOptimized';

const router = express.Router();

// POST /api/ask - Process AI prompt to find influencers (OPTIMIZED FLOW)
router.post('/', authenticateToken, requireFeatureAccess('creatorSearch'), requireCredits(1), deductCredits(1), handleAsk);

// GET /api/ask/details - Get detailed influencer information
router.get('/details', authenticateToken, requireFeatureAccess('creatorSearch'), handleDetails);

// GET /api/ask/debug - Debug endpoint to check database content
router.get('/debug', authenticateToken, handleDebugData);

// GET /api/ask/test-brightdata - Test Bright Data integration
router.get('/test-brightdata', authenticateToken, handleTestBrightData);

// GET /api/ask/test-snapshot - Test Bright Data snapshot
router.get('/test-snapshot', authenticateToken, handleTestSnapshot);

// POST /api/ask/reel - Fetch Instagram reel data from Bright Data
router.post('/reel', authenticateToken, requireFeatureAccess('creatorSearch'), requireCredits(1), deductCredits(1), handleInstagramReel);

export default router; 