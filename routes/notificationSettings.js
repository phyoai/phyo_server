const express = require('express');
const router = express.Router();
const notificationSettingsController = require('../controllers/notificationSettingsController');
const authMiddleware = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

// Get and update notification settings
router.get('/', notificationSettingsController.getNotificationSettings);
router.patch('/', notificationSettingsController.updateNotificationSettings);

// Update specific notification channels
router.patch('/email', notificationSettingsController.updateEmailSettings);
router.patch('/push', notificationSettingsController.updatePushSettings);
router.patch('/sms', notificationSettingsController.updateSmsSettings);

// Unsubscribe from all
router.patch('/unsubscribe-all', notificationSettingsController.unsubscribeAll);

module.exports = router;
