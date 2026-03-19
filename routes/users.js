const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const {
    getProfile,
    updateProfile,
    searchUsers,
    getUserById,
    deleteAccount,
    logout,
    getAccountSettings,
    updateNotificationPreferences,
    listUsers
} = require('../controllers/userController');

// Profile management
router.get('/profile', authMiddleware, getProfile);
router.patch('/profile', authMiddleware, updateProfile);

// Account settings
router.get('/settings', authMiddleware, getAccountSettings);
router.patch('/notification-preferences', authMiddleware, updateNotificationPreferences);

// Authentication
router.post('/logout', authMiddleware, logout);

// Search and listing
router.get('/search', authMiddleware, searchUsers);
router.get('/list', authMiddleware, adminMiddleware, listUsers);

// Get user by ID
router.get('/:id', authMiddleware, getUserById);

// Account deletion
router.delete('/account', authMiddleware, deleteAccount);

module.exports = router;
