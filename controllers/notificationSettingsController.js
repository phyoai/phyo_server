const NotificationSettings = require('../models/notificationSettings');

/**
 * GET /api/notification-settings
 */
exports.getNotificationSettings = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        let settings = await NotificationSettings.findOne({ userId }).lean();

        if (!settings) {
            const defaultSettings = new NotificationSettings({ userId });
            await defaultSettings.save();
            settings = defaultSettings.toObject();
        }

        return res.status(200).json({ success: true, data: settings });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error fetching notification settings', error: error.message });
    }
};

/**
 * PATCH /api/notification-settings
 */
exports.updateNotificationSettings = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const { email, push, sms, inApp } = req.body;

        const settings = await NotificationSettings.findOneAndUpdate(
            { userId },
            {
                ...(email && { email }),
                ...(push && { push }),
                ...(sms && { sms }),
                ...(inApp && { inApp }),
                updatedAt: new Date()
            },
            { new: true, upsert: true }
        );

        return res.status(200).json({ success: true, message: 'Notification settings updated', data: settings });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error updating notification settings', error: error.message });
    }
};

/**
 * PATCH /api/notification-settings/email
 */
exports.updateEmailSettings = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const { campaigns, applications, offers, messages, promotions, weekly_digest, updates } = req.body;

        const settings = await NotificationSettings.findOneAndUpdate(
            { userId },
            {
                email: {
                    campaigns: campaigns !== undefined ? campaigns : true,
                    applications: applications !== undefined ? applications : true,
                    offers: offers !== undefined ? offers : true,
                    messages: messages !== undefined ? messages : true,
                    promotions: promotions !== undefined ? promotions : false,
                    weekly_digest: weekly_digest !== undefined ? weekly_digest : true,
                    updates: updates !== undefined ? updates : true
                },
                updatedAt: new Date()
            },
            { new: true, upsert: true }
        );

        return res.status(200).json({ success: true, message: 'Email settings updated', data: settings.email });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error updating email settings', error: error.message });
    }
};

/**
 * PATCH /api/notification-settings/push
 */
exports.updatePushSettings = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const { campaigns, applications, offers, messages, promotions, updates } = req.body;

        const settings = await NotificationSettings.findOneAndUpdate(
            { userId },
            {
                push: {
                    campaigns: campaigns !== undefined ? campaigns : true,
                    applications: applications !== undefined ? applications : true,
                    offers: offers !== undefined ? offers : true,
                    messages: messages !== undefined ? messages : true,
                    promotions: promotions !== undefined ? promotions : false,
                    updates: updates !== undefined ? updates : true
                },
                updatedAt: new Date()
            },
            { new: true, upsert: true }
        );

        return res.status(200).json({ success: true, message: 'Push notification settings updated', data: settings.push });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error updating push settings', error: error.message });
    }
};

/**
 * PATCH /api/notification-settings/sms
 */
exports.updateSmsSettings = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const { campaigns, applications, offers, messages, promotions, urgent } = req.body;

        const settings = await NotificationSettings.findOneAndUpdate(
            { userId },
            {
                sms: {
                    campaigns: campaigns !== undefined ? campaigns : false,
                    applications: applications !== undefined ? applications : false,
                    offers: offers !== undefined ? offers : false,
                    messages: messages !== undefined ? messages : false,
                    promotions: promotions !== undefined ? promotions : false,
                    urgent: urgent !== undefined ? urgent : true
                },
                updatedAt: new Date()
            },
            { new: true, upsert: true }
        );

        return res.status(200).json({ success: true, message: 'SMS settings updated', data: settings.sms });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error updating SMS settings', error: error.message });
    }
};

/**
 * PATCH /api/notification-settings/unsubscribe-all
 */
exports.unsubscribeAll = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const settings = await NotificationSettings.findOneAndUpdate(
            { userId },
            {
                email: {
                    campaigns: false,
                    applications: false,
                    offers: false,
                    messages: false,
                    promotions: false,
                    weekly_digest: false,
                    updates: false
                },
                push: {
                    campaigns: false,
                    applications: false,
                    offers: false,
                    messages: false,
                    promotions: false,
                    updates: false
                },
                sms: {
                    campaigns: false,
                    applications: false,
                    offers: false,
                    messages: false,
                    promotions: false,
                    urgent: false
                },
                updatedAt: new Date()
            },
            { new: true, upsert: true }
        );

        return res.status(200).json({ success: true, message: 'You have been unsubscribed from all notifications', data: settings });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error unsubscribing from notifications', error: error.message });
    }
};
