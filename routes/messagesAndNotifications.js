const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
    getNotifications,
    markNotificationAsRead,
    deleteNotification,
    createConversation,
    getConversations,
    getConversationMessages,
    sendMessage,
    getUnreadCount,
    markConversationAsRead
} = require('../controllers/notificationsController');

// Notifications
router.get('/notifications', authMiddleware, getNotifications);
router.put('/notifications/:id/read', authMiddleware, markNotificationAsRead);
router.delete('/notifications/:id', authMiddleware, deleteNotification);

// Conversations
router.post('/conversations', authMiddleware, createConversation);
router.get('/conversations', authMiddleware, getConversations);
router.get('/conversations/:conversationId/messages', authMiddleware, getConversationMessages);
router.post('/conversations/:conversationId/messages', authMiddleware, sendMessage);
router.get('/conversations/:conversationId/unread', authMiddleware, getUnreadCount);
router.put('/conversations/:conversationId/mark-read', authMiddleware, markConversationAsRead);

module.exports = router;
