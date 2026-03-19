const express = require('express');
const router = express.Router();
const notificationSettingsController = require('../controllers/notificationSettingsController');
const authMiddleware = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

// Get all notification settings
router.get('/', notificationSettingsController.getNotificationSettings);

// Update email notifications
router.put('/email', notificationSettingsController.updateEmailNotifications);

// Update push notifications
router.put('/push', notificationSettingsController.updatePushNotifications);

// Update SMS notifications
router.put('/sms', notificationSettingsController.updateSmsNotifications);

// Update notification frequency
router.put('/frequency', notificationSettingsController.updateNotificationFrequency);

// Disable all notifications
router.post('/disable-all', notificationSettingsController.disableAllNotifications);

// Enable all notifications
router.post('/enable-all', notificationSettingsController.enableAllNotifications);

// Get notification preferences
router.get('/preferences', notificationSettingsController.getNotificationPreferences);

module.exports = router;
