const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
    createCampaign, getAllCampaigns, getMyCampaigns, getCampaignById,
    updateCampaign, deleteCampaign, applyToCampaign, selectInfluencer
} = require('../controllers/campaignController');

router.post('/', authMiddleware, createCampaign);
router.get('/', authMiddleware, getAllCampaigns);
router.get('/mine', authMiddleware, getMyCampaigns);
router.get('/:id', authMiddleware, getCampaignById);
router.patch('/:id', authMiddleware, updateCampaign);
router.delete('/:id', authMiddleware, deleteCampaign);
router.post('/:id/apply', authMiddleware, applyToCampaign);
router.post('/:id/select', authMiddleware, selectInfluencer);

module.exports = router;
