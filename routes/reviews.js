const express = require('express');
const router = express.Router();
const reviewsController = require('../controllers/reviewsController');
const authMiddleware = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

// Influencer reviews
router.post('/influencers/:influencerId', reviewsController.reviewInfluencer);
router.get('/influencers/:influencerId', reviewsController.getInfluencerReviews);

// Brand reviews
router.post('/brands/:brandId', reviewsController.reviewBrand);
router.get('/brands/:brandId', reviewsController.getBrandReviews);

// Manage reviews
router.delete('/:reviewId', reviewsController.deleteReview);
router.get('/my-reviews', reviewsController.getMyReviews);

module.exports = router;
