const express = require('express');
const router = express.Router();
const favoritesController = require('../controllers/favoritesController');
const authMiddleware = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

// Favorite campaigns
router.post('/campaigns/:campaignId', favoritesController.addCampaignToFavorites);
router.delete('/campaigns/:campaignId', favoritesController.removeCampaignFromFavorites);
router.get('/campaigns', favoritesController.getFavoriteCampaigns);

// Saved influencers
router.post('/saved-influencers/:influencerId', favoritesController.saveInfluencer);
router.delete('/saved-influencers/:influencerId', favoritesController.unsaveInfluencer);
router.get('/saved-influencers', favoritesController.getSavedInfluencers);

// Check if item is favorited
router.get('/check/:type/:id', favoritesController.checkIsFavorited);

module.exports = router;
