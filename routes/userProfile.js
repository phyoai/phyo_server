const express = require('express');
const router = express.Router();
const userProfileController = require('../controllers/userProfileController');
const authMiddleware = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

// Get current user profile
router.get('/', userProfileController.getMyProfile);

// Update user profile
router.put('/', userProfileController.updateMyProfile);

// Upload profile avatar
router.post('/avatar', userProfileController.uploadAvatar);

// Update user settings
router.post('/settings', userProfileController.updateSettings);

// Change password
router.post('/change-password', userProfileController.changePassword);

// Send email verification
router.post('/verify-email', userProfileController.verifyEmail);

// Get activity log
router.get('/activity', userProfileController.getActivityLog);

// Deactivate account
router.post('/deactivate', userProfileController.deactivateAccount);

module.exports = router;
