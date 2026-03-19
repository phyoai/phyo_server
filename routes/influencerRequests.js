const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const {
    createInfluencerRequest,
    getAllInfluencerRequests,
    getInfluencerRequestById,
    getInfluencerRequestByEmail,
    getInfluencerRequestByUsername,
    updateInfluencerRequest,
    approveInfluencerRequest,
    rejectInfluencerRequest,
    deleteInfluencerRequest,
    searchInfluencerRequests,
    advancedSearchInfluencers,
    getInfluencerRequestStats
} = require('../controllers/influencerRequestController');

// Public routes
router.post('/', createInfluencerRequest);
router.get('/search/email', getInfluencerRequestByEmail);
router.get('/search/username', getInfluencerRequestByUsername);

// Admin routes
router.get('/', authMiddleware, adminMiddleware, getAllInfluencerRequests);
router.get('/stats', authMiddleware, adminMiddleware, getInfluencerRequestStats);
router.get('/search', authMiddleware, adminMiddleware, searchInfluencerRequests);
router.get('/search/advanced', authMiddleware, adminMiddleware, advancedSearchInfluencers);
router.get('/:id', authMiddleware, adminMiddleware, getInfluencerRequestById);
router.patch('/:id', authMiddleware, adminMiddleware, updateInfluencerRequest);
router.patch('/:id/approve', authMiddleware, adminMiddleware, approveInfluencerRequest);
router.patch('/:id/reject', authMiddleware, adminMiddleware, rejectInfluencerRequest);
router.delete('/:id', authMiddleware, adminMiddleware, deleteInfluencerRequest);

module.exports = router;
