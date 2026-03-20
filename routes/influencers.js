const express = require('express');
const router = express.Router();
const {
    getAllInfluencers,
    getInfluencerById,
} = require('../controllers/authController');

// Public routes - No authentication required
router.get('/', getAllInfluencers);
router.get('/:id', getInfluencerById);

module.exports = router;
