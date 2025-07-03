import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { 
  createCampaign, 
  getCampaigns, 
  getCampaignById, 
  getBrandCampaigns,
  updateCampaign, 
  deleteCampaign,
  applyCampaign,
  selectInfluencer
} from '../controllers/campaign';

const router = express.Router();

router.get('/', authenticateToken, getCampaigns);

router.post('/', authenticateToken, createCampaign);
router.get('/brand/my-campaigns', authenticateToken, getBrandCampaigns);
router.get('/:id', getCampaignById);
router.patch('/:id', authenticateToken, updateCampaign);
router.delete('/:id', authenticateToken, deleteCampaign);

router.post('/:id/apply', authenticateToken, applyCampaign);

router.post('/:id/select', authenticateToken, selectInfluencer);

export default router; 