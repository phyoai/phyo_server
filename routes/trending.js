const express = require('express');
const router = express.Router();
const trendingController = require('../controllers/trendingController');

// Trending Influencers
router.get('/influencers', trendingController.getTrendingInfluencers);

// Trending Campaigns
router.get('/campaigns', trendingController.getTrendingCampaigns);

// Trending Brands
router.get('/brands', trendingController.getTrendingBrands);

// Trending Categories
router.get('/categories', trendingController.getTrendingCategories);

module.exports = router;
