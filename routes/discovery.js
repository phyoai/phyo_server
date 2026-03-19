const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
    discoverInfluencers,
    getInfluencerProfile,
    searchInfluencers,
    getInfluencersByCategory,
    contactInfluencer,
    getAllCategories,
    getRecommendedInfluencers
} = require('../controllers/influencerDiscoveryController');

// Public endpoints - Get influencers
router.get('/influencers', discoverInfluencers);
router.get('/influencers/:id', getInfluencerProfile);
router.get('/influencers/search', searchInfluencers);
router.get('/influencers/category/:category', getInfluencersByCategory);

// Categories
router.get('/categories', getAllCategories);

// Recommendations
router.get('/recommendations', getRecommendedInfluencers);

// Contact influencer (requires auth)
router.post('/influencers/:id/contact', authMiddleware, contactInfluencer);

module.exports = router;
