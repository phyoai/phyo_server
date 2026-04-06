import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { requireFeatureAccess, requireCredits, deductCredits } from '../middleware/planAccess';
import { uploadImageToS3 } from '../services/s3';
import {
  createCampaign,
  getCampaigns,
  getCampaignById,
  getBrandCampaigns,
  updateCampaign,
  deleteCampaign,
  applyCampaign,
  selectInfluencer,
  getCampaignApplications,
  acceptApplication,
  rejectApplication,
  getCampaignDeliverables,
  addCampaignDeliverable,
  counterOffer,
  getNegotiation,
  acceptNegotiation,
  rejectNegotiation,
  boostCampaign,
  getBoostRecommendations,
  getCampaignsForMe
} from '../controllers/campaign';
import { getTrendingCampaigns } from '../controllers/trending';

const router = express.Router();

router.get('/', authenticateToken, getCampaigns);
router.get('/trending', getTrendingCampaigns);

router.post('/', authenticateToken, requireCredits(5), deductCredits(5), uploadImageToS3.array('productImages', 10), createCampaign);

// Alias for getBrandCampaigns
router.get('/mine', authenticateToken, getBrandCampaigns);
router.get('/brand/my-campaigns', authenticateToken, getBrandCampaigns);

// Trending/recommended campaigns for current influencer
router.get('/trending/for-me', authenticateToken, getCampaignsForMe);

router.get('/:id', authenticateToken, getCampaignById);
router.patch('/:id', authenticateToken, uploadImageToS3.array('productImages', 10), updateCampaign);
router.delete('/:id', authenticateToken, deleteCampaign);

router.post('/:id/apply', authenticateToken, requireCredits(1), deductCredits(1), applyCampaign);
router.post('/:id/select', authenticateToken, requireFeatureAccess('campaignReports'), requireCredits(2), deductCredits(2), selectInfluencer);

// Applications
router.get('/:id/applications', authenticateToken, getCampaignApplications);
router.post('/:id/applications/:appId/accept', authenticateToken, acceptApplication);
router.post('/:id/applications/:appId/reject', authenticateToken, rejectApplication);

// Deliverables
router.get('/:id/deliverables', authenticateToken, getCampaignDeliverables);
router.post('/:id/deliverables', authenticateToken, addCampaignDeliverable);

// Negotiations
router.post('/:id/counter-offer', authenticateToken, counterOffer);
router.get('/:id/negotiations/:influencerId', authenticateToken, getNegotiation);
router.post('/:id/negotiations/:influencerId/accept', authenticateToken, acceptNegotiation);
router.post('/:id/negotiations/:influencerId/reject', authenticateToken, rejectNegotiation);

// Boost
router.post('/:id/boost', authenticateToken, boostCampaign);
router.get('/:id/boost-recommendations', authenticateToken, getBoostRecommendations);

export default router; 
