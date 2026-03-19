const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllRead
} = require('../controllers/notificationController');

// Get notifications (paginated)
router.get('/', authMiddleware, getNotifications);

// Get unread count
router.get('/unread-count', authMiddleware, getUnreadCount);

// Mark single notification as read
router.patch('/:id/read', authMiddleware, markAsRead);

// Mark all as read
router.patch('/read-all', authMiddleware, markAllAsRead);

// Delete single notification
router.delete('/:id', authMiddleware, deleteNotification);

// Delete all read notifications
router.delete('/clear-all', authMiddleware, clearAllRead);

module.exports = router;
