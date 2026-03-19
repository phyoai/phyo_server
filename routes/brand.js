const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const {
    brandSignup,
    getBrandProfile,
    updateBrandProfile,
    changePassword,
    logout,
    deactivateAccount,
    listBrands,
    updateNotificationPreferences,
    getAllBrands,
    getBrandById,
    getBrandCampaigns,
    getBrandStats,
    updateBrandById
} = require('../controllers/brandController');

// Authentication
router.post('/signup', brandSignup);
router.post('/logout', authMiddleware, logout);

// Profile management
router.get('/profile', authMiddleware, getBrandProfile);
router.put('/profile', authMiddleware, updateBrandProfile);
router.put('/change-password', authMiddleware, changePassword);

// Account settings
router.patch('/notification-preferences', authMiddleware, updateNotificationPreferences);
router.delete('/account', authMiddleware, deactivateAccount);

// Brand CRUD
router.get('/', getAllBrands);
router.get('/:id', getBrandById);
router.get('/:id/campaigns', getBrandCampaigns);
router.get('/:id/stats', getBrandStats);
router.put('/:id/profile', authMiddleware, updateBrandById);

// Admin listing
router.get('/list', authMiddleware, adminMiddleware, listBrands);

module.exports = router;
