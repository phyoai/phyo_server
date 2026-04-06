import express from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  getNotifications,
  getUnreadNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getUnreadCount,
  clearAllNotifications,
  getNotificationPreferences,
  updateNotificationPreferences
} from '../controllers/notification';

const router = express.Router();

// Specific routes BEFORE generic routes
// Get unread count
router.get('/unread-count', authenticateToken, getUnreadCount);

// Get unread notifications
router.get('/unread', authenticateToken, getUnreadNotifications);

// Mark all as read
router.patch('/read-all', authenticateToken, markAllNotificationsAsRead);
router.get('/preferences', authenticateToken, getNotificationPreferences);
router.patch('/preferences', authenticateToken, updateNotificationPreferences);

// Dynamic routes AFTER specific ones
// Get all notifications
router.get('/', authenticateToken, getNotifications);

// Mark single as read
router.patch('/:id/read', authenticateToken, markNotificationAsRead);

// Delete single notification
router.delete('/:id', authenticateToken, deleteNotification);

// Clear all notifications - allow DELETE on root
router.delete('/', authenticateToken, clearAllNotifications);

export default router;
