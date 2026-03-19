const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
    getAllInfluencers,
    createInfluencer,
    getInfluencerById,
    updateInfluencer,
    deleteInfluencer,
    getInfluencerStats,
    getInfluencerPricing,
    addPortfolioItem,
    getInfluencerCampaigns,
    getInfluencerReviews,
    getInfluencerByUsername
} = require('../controllers/influencerController');

// CRUD Operations
router.get('/', getAllInfluencers);
router.post('/', authMiddleware, createInfluencer);
router.get('/:id', getInfluencerById);
router.patch('/:id', authMiddleware, updateInfluencer);
router.delete('/:id', authMiddleware, deleteInfluencer);

// Profile Details
router.get('/:id/stats', getInfluencerStats);
router.get('/:id/pricing', getInfluencerPricing);
router.post('/:id/portfolio', authMiddleware, addPortfolioItem);
router.get('/:id/campaigns', getInfluencerCampaigns);
router.get('/:id/reviews', getInfluencerReviews);

// Get by Username
router.get('/:username', getInfluencerByUsername);

module.exports = router;
