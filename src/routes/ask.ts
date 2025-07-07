import express from 'express';
import { handleAsk, handleDetails } from '../controllers/ask';

const router = express.Router();

// POST /api/ask - Process AI prompt to find influencers
router.post('/', handleAsk);

// GET /api/ask/details - Get detailed influencer information
router.get('/details', handleDetails);

export default router; 