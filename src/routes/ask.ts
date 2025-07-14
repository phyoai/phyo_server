import express from 'express';
import { handleAsk, handleDetails, handleDebugData, handleTestBrightData, handleTestSnapshot } from '../controllers/ask';

const router = express.Router();

// POST /api/ask - Process AI prompt to find influencers
router.post('/', handleAsk);

// GET /api/ask/details - Get detailed influencer information
router.get('/details', handleDetails);

// GET /api/ask/debug - Debug endpoint to check database content
router.get('/debug', handleDebugData);

// GET /api/ask/test-brightdata - Test Bright Data integration
router.get('/test-brightdata', handleTestBrightData);

// GET /api/ask/test-snapshot - Test Bright Data snapshot
router.get('/test-snapshot', handleTestSnapshot);

export default router; 