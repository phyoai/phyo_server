const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');
const auth = require('../middleware/authMiddleware');

// Nearby Influencers
router.get('/influencers/nearby', locationController.getNearbyInfluencers);
router.get('/influencers/location/search', locationController.searchInfluencersByLocation);

// Nearby Brands
router.get('/brands/nearby', locationController.getNearbyBrands);
router.get('/brands/location/search', locationController.searchBrandsByLocation);

// Nearby Campaigns
router.get('/campaigns/nearby', locationController.getNearbyActiveCampaigns);
router.get('/campaigns/location/search', locationController.searchCampaignsByLocation);

// Location Management
router.post('/users/location', auth, locationController.updateUserLocation);
router.get('/locations/supported', locationController.getSupportedLocations);

module.exports = router;
