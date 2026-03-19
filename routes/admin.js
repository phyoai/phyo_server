const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const {
    getProfile, changePassword, listRequests, approveBrandRequest, getStatistics,
    getSingleRequest, rejectBrandRequest, createAdmin, listAdmins, getInfluencerRequests,
    approveInfluencer, getBrandRequests, approveRequest, rejectRequest, getHelpCategories
} = require('../controllers/adminController');

router.get('/profile', authMiddleware, adminMiddleware, getProfile);
router.put('/change-password', authMiddleware, adminMiddleware, changePassword);

// Brand Requests
router.get('/requests/brands', authMiddleware, adminMiddleware, getBrandRequests);
router.get('/requests/brands/:id', authMiddleware, adminMiddleware, getSingleRequest);

// Influencer Requests
router.get('/requests/influencers', authMiddleware, adminMiddleware, getInfluencerRequests);
router.get('/requests/influencers/:id', authMiddleware, adminMiddleware, getSingleRequest);

// Approval/Rejection
router.put('/requests/:id/approve', authMiddleware, adminMiddleware, approveRequest);
router.put('/requests/:id/reject', authMiddleware, adminMiddleware, rejectRequest);

// Statistics
router.get('/statistics', authMiddleware, adminMiddleware, getStatistics);

// Help
router.get('/help/categories', getHelpCategories);

// Legacy routes for compatibility
router.get('/requests', authMiddleware, adminMiddleware, listRequests);
router.put('/requests/:id/approve-brand', authMiddleware, adminMiddleware, approveBrandRequest);
router.post('/create', authMiddleware, adminMiddleware, createAdmin);
router.get('/list', authMiddleware, adminMiddleware, listAdmins);

module.exports = router;
