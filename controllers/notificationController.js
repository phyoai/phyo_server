const Notification = require('../models/notification');

// Get paginated notifications for the user
exports.getNotifications = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;

        const notifications = await Notification.find({ userId: req.user.id })
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Notification.countDocuments({ userId: req.user.id });
        const unreadCount = await Notification.countDocuments({ userId: req.user.id, isRead: false });

        res.json({
            success: true,
            total,
            unreadCount,
            page: parseInt(page),
            limit: parseInt(limit),
            data: notifications
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get count of unread notifications
exports.getUnreadCount = async (req, res) => {
    try {
        const unreadCount = await Notification.countDocuments({
            userId: req.user.id,
            isRead: false
        });

        res.json({ success: true, data: { unreadCount } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Mark a single notification as read
exports.markAsRead = async (req, res) => {
    try {
        const { id } = req.params;

        const notification = await Notification.findOneAndUpdate(
            { _id: id, userId: req.user.id },
            { isRead: true, readAt: new Date() },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }

        res.json({ success: true, message: 'Notification marked as read', data: notification });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Mark all notifications as read
exports.markAllAsRead = async (req, res) => {
    try {
        const result = await Notification.updateMany(
            { userId: req.user.id, isRead: false },
            { isRead: true, readAt: new Date() }
        );

        res.json({
            success: true,
            message: 'All notifications marked as read',
            data: { modifiedCount: result.modifiedCount }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Delete a single notification
exports.deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await Notification.findOneAndDelete({
            _id: id,
            userId: req.user.id
        });

        if (!result) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }

        res.json({ success: true, message: 'Notification deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Clear all read notifications
exports.clearAllRead = async (req, res) => {
    try {
        const result = await Notification.deleteMany({
            userId: req.user.id,
            isRead: true
        });

        res.json({
            success: true,
            message: 'All read notifications cleared',
            data: { deletedCount: result.deletedCount }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Internal helper function to create notifications
exports.createNotification = async (userId, type, title, message, data = null) => {
    try {
        const notification = await Notification.create({
            userId,
            type,
            title,
            message,
            data,
            isRead: false
        });
        return notification;
    } catch (error) {
        console.error('Error creating notification:', error.message);
        return null;
    }
};
