const User = require('../models/auth');
const mongoose = require('mongoose');

/**
 * GET /api/notification-settings
 * Get all notification settings
 */
exports.getNotificationSettings = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const defaultSettings = {
            email: {
                campaignUpdates: true,
                applicationReceived: true,
                applicationAccepted: true,
                paymentReceived: true,
                collaborationRequests: true,
                systemNotifications: true
            },
            push: {
                campaignUpdates: true,
                applicationReceived: true,
                applicationAccepted: true,
                paymentReceived: true,
                collaborationRequests: true,
                systemNotifications: false
            },
            sms: {
                paymentReceived: true,
                urgentNotifications: true,
                campaignMilestones: false
            },
            frequency: {
                immediate: true,
                daily: false,
                weekly: false
            }
        };

        return res.status(200).json({
            success: true,
            data: user.notificationSettings || defaultSettings
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error fetching settings', error: error.message });
    }
};

/**
 * PUT /api/notification-settings/email
 * Update email notification settings
 */
exports.updateEmailNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const { campaignUpdates, applicationReceived, applicationAccepted, paymentReceived, collaborationRequests, systemNotifications } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (!user.notificationSettings) {
            user.notificationSettings = {};
        }

        user.notificationSettings.email = {
            campaignUpdates: campaignUpdates !== undefined ? campaignUpdates : user.notificationSettings.email?.campaignUpdates || true,
            applicationReceived: applicationReceived !== undefined ? applicationReceived : user.notificationSettings.email?.applicationReceived || true,
            applicationAccepted: applicationAccepted !== undefined ? applicationAccepted : user.notificationSettings.email?.applicationAccepted || true,
            paymentReceived: paymentReceived !== undefined ? paymentReceived : user.notificationSettings.email?.paymentReceived || true,
            collaborationRequests: collaborationRequests !== undefined ? collaborationRequests : user.notificationSettings.email?.collaborationRequests || true,
            systemNotifications: systemNotifications !== undefined ? systemNotifications : user.notificationSettings.email?.systemNotifications || true
        };

        await user.save();

        return res.status(200).json({
            success: true,
            message: 'Email notification settings updated',
            data: user.notificationSettings.email
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error updating settings', error: error.message });
    }
};

/**
 * PUT /api/notification-settings/push
 * Update push notification settings
 */
exports.updatePushNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const { campaignUpdates, applicationReceived, applicationAccepted, paymentReceived, collaborationRequests, systemNotifications } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (!user.notificationSettings) {
            user.notificationSettings = {};
        }

        user.notificationSettings.push = {
            campaignUpdates: campaignUpdates !== undefined ? campaignUpdates : user.notificationSettings.push?.campaignUpdates || true,
            applicationReceived: applicationReceived !== undefined ? applicationReceived : user.notificationSettings.push?.applicationReceived || true,
            applicationAccepted: applicationAccepted !== undefined ? applicationAccepted : user.notificationSettings.push?.applicationAccepted || true,
            paymentReceived: paymentReceived !== undefined ? paymentReceived : user.notificationSettings.push?.paymentReceived || true,
            collaborationRequests: collaborationRequests !== undefined ? collaborationRequests : user.notificationSettings.push?.collaborationRequests || true,
            systemNotifications: systemNotifications !== undefined ? systemNotifications : user.notificationSettings.push?.systemNotifications || false
        };

        await user.save();

        return res.status(200).json({
            success: true,
            message: 'Push notification settings updated',
            data: user.notificationSettings.push
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error updating settings', error: error.message });
    }
};

/**
 * PUT /api/notification-settings/sms
 * Update SMS notification settings
 */
exports.updateSmsNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const { paymentReceived, urgentNotifications, campaignMilestones } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (!user.notificationSettings) {
            user.notificationSettings = {};
        }

        user.notificationSettings.sms = {
            paymentReceived: paymentReceived !== undefined ? paymentReceived : user.notificationSettings.sms?.paymentReceived || true,
            urgentNotifications: urgentNotifications !== undefined ? urgentNotifications : user.notificationSettings.sms?.urgentNotifications || true,
            campaignMilestones: campaignMilestones !== undefined ? campaignMilestones : user.notificationSettings.sms?.campaignMilestones || false
        };

        await user.save();

        return res.status(200).json({
            success: true,
            message: 'SMS notification settings updated',
            data: user.notificationSettings.sms
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error updating settings', error: error.message });
    }
};

/**
 * PUT /api/notification-settings/frequency
 * Update notification frequency
 */
exports.updateNotificationFrequency = async (req, res) => {
    try {
        const userId = req.user.id;
        const { immediate, daily, weekly } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (!user.notificationSettings) {
            user.notificationSettings = {};
        }

        user.notificationSettings.frequency = {
            immediate: immediate !== undefined ? immediate : user.notificationSettings.frequency?.immediate || true,
            daily: daily !== undefined ? daily : user.notificationSettings.frequency?.daily || false,
            weekly: weekly !== undefined ? weekly : user.notificationSettings.frequency?.weekly || false
        };

        await user.save();

        return res.status(200).json({
            success: true,
            message: 'Notification frequency updated',
            data: user.notificationSettings.frequency
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error updating frequency', error: error.message });
    }
};

/**
 * POST /api/notification-settings/disable-all
 * Disable all notifications
 */
exports.disableAllNotifications = async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        user.notificationSettings = {
            email: {
                campaignUpdates: false,
                applicationReceived: false,
                applicationAccepted: false,
                paymentReceived: false,
                collaborationRequests: false,
                systemNotifications: false
            },
            push: {
                campaignUpdates: false,
                applicationReceived: false,
                applicationAccepted: false,
                paymentReceived: false,
                collaborationRequests: false,
                systemNotifications: false
            },
            sms: {
                paymentReceived: false,
                urgentNotifications: false,
                campaignMilestones: false
            },
            frequency: {
                immediate: false,
                daily: false,
                weekly: false
            }
        };

        await user.save();

        return res.status(200).json({
            success: true,
            message: 'All notifications disabled',
            data: { status: 'All notifications disabled' }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error disabling notifications', error: error.message });
    }
};

/**
 * POST /api/notification-settings/enable-all
 * Enable all notifications
 */
exports.enableAllNotifications = async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        user.notificationSettings = {
            email: {
                campaignUpdates: true,
                applicationReceived: true,
                applicationAccepted: true,
                paymentReceived: true,
                collaborationRequests: true,
                systemNotifications: true
            },
            push: {
                campaignUpdates: true,
                applicationReceived: true,
                applicationAccepted: true,
                paymentReceived: true,
                collaborationRequests: true,
                systemNotifications: true
            },
            sms: {
                paymentReceived: true,
                urgentNotifications: true,
                campaignMilestones: true
            },
            frequency: {
                immediate: true,
                daily: false,
                weekly: false
            }
        };

        await user.save();

        return res.status(200).json({
            success: true,
            message: 'All notifications enabled',
            data: { status: 'All notifications enabled' }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error enabling notifications', error: error.message });
    }
};

/**
 * GET /api/notification-settings/preferences
 * Get notification preferences summary
 */
exports.getNotificationPreferences = async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const settings = user.notificationSettings || {};

        // Count enabled notifications
        const emailEnabled = Object.values(settings.email || {}).filter(v => v).length;
        const pushEnabled = Object.values(settings.push || {}).filter(v => v).length;
        const smsEnabled = Object.values(settings.sms || {}).filter(v => v).length;

        return res.status(200).json({
            success: true,
            data: {
                emailNotificationsEnabled: emailEnabled > 0,
                emailCount: emailEnabled,
                pushNotificationsEnabled: pushEnabled > 0,
                pushCount: pushEnabled,
                smsNotificationsEnabled: smsEnabled > 0,
                smsCount: smsEnabled,
                frequency: settings.frequency || {},
                overallStatus: emailEnabled > 0 || pushEnabled > 0 || smsEnabled > 0 ? 'ENABLED' : 'DISABLED'
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error fetching preferences', error: error.message });
    }
};
