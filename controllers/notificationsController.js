const User = require('../models/auth');
const Notification = require('../models/notification');
const Message = require('../models/message');
const Conversation = require('../models/conversation');
const mongoose = require('mongoose');

/**
 * GET /api/notifications
 * Get user notifications
 */
exports.getNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 20, read } = req.query;
        const skip = (page - 1) * limit;

        let query = { userId };
        if (read === 'true') query.read = true;
        if (read === 'false') query.read = false;

        const total = await Notification.countDocuments(query);
        const notifications = await Notification.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        return res.status(200).json({
            success: true,
            data: notifications,
            pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error fetching notifications', error: error.message });
    }
};

/**
 * PUT /api/notifications/:id/read
 * Mark notification as read
 */
exports.markNotificationAsRead = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid notification ID' });
        }

        const notification = await Notification.findByIdAndUpdate(
            id,
            { read: true, readAt: new Date() },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }

        return res.status(200).json({
            success: true,
            message: 'Notification marked as read',
            data: notification
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error updating notification', error: error.message });
    }
};

/**
 * DELETE /api/notifications/:id
 * Delete notification
 */
exports.deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid notification ID' });
        }

        const notification = await Notification.findByIdAndDelete(id);
        if (!notification) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }

        return res.status(200).json({
            success: true,
            message: 'Notification deleted',
            data: notification
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error deleting notification', error: error.message });
    }
};

/**
 * POST /api/messages/conversations
 * Create new conversation
 */
exports.createConversation = async (req, res) => {
    try {
        const userId = req.user.id;
        const { participantId, title } = req.body;

        if (!participantId) {
            return res.status(400).json({ success: false, message: 'participantId is required' });
        }

        if (!mongoose.Types.ObjectId.isValid(participantId)) {
            return res.status(400).json({ success: false, message: 'Invalid participant ID' });
        }

        const existingConversation = await Conversation.findOne({
            participants: { $all: [userId, participantId] }
        });

        if (existingConversation) {
            return res.status(200).json({
                success: true,
                message: 'Conversation already exists',
                data: existingConversation
            });
        }

        const conversation = new Conversation({
            participants: [userId, participantId],
            title: title || '',
            createdAt: new Date(),
            lastMessageAt: new Date()
        });

        await conversation.save();

        return res.status(201).json({
            success: true,
            message: 'Conversation created',
            data: conversation
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error creating conversation', error: error.message });
    }
};

/**
 * GET /api/messages/conversations
 * Get user conversations
 */
exports.getConversations = async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 20 } = req.query;
        const skip = (page - 1) * limit;

        const total = await Conversation.countDocuments({ participants: userId });
        const conversations = await Conversation.find({ participants: userId })
            .populate('participants', 'name avatar')
            .sort({ lastMessageAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        return res.status(200).json({
            success: true,
            data: conversations,
            pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error fetching conversations', error: error.message });
    }
};

/**
 * GET /api/messages/conversations/:conversationId/messages
 * Get messages in a conversation
 */
exports.getConversationMessages = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { page = 1, limit = 50 } = req.query;
        const skip = (page - 1) * limit;

        if (!mongoose.Types.ObjectId.isValid(conversationId)) {
            return res.status(400).json({ success: false, message: 'Invalid conversation ID' });
        }

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            return res.status(404).json({ success: false, message: 'Conversation not found' });
        }

        const total = await Message.countDocuments({ conversationId });
        const messages = await Message.find({ conversationId })
            .populate('senderId', 'name avatar')
            .sort({ createdAt: 1 })
            .skip(skip)
            .limit(parseInt(limit));

        return res.status(200).json({
            success: true,
            data: messages,
            pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error fetching messages', error: error.message });
    }
};

/**
 * POST /api/messages/conversations/:conversationId/messages
 * Send message
 */
exports.sendMessage = async (req, res) => {
    try {
        const userId = req.user.id;
        const { conversationId } = req.params;
        const { content, attachments } = req.body;

        if (!content) {
            return res.status(400).json({ success: false, message: 'content is required' });
        }

        if (!mongoose.Types.ObjectId.isValid(conversationId)) {
            return res.status(400).json({ success: false, message: 'Invalid conversation ID' });
        }

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            return res.status(404).json({ success: false, message: 'Conversation not found' });
        }

        const message = new Message({
            conversationId,
            senderId: userId,
            content,
            attachments: attachments || [],
            read: false,
            createdAt: new Date()
        });

        await message.save();
        conversation.lastMessageAt = new Date();
        await conversation.save();

        return res.status(201).json({
            success: true,
            message: 'Message sent',
            data: message
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error sending message', error: error.message });
    }
};

/**
 * GET /api/messages/conversations/:conversationId/unread
 * Get unread message count
 */
exports.getUnreadCount = async (req, res) => {
    try {
        const userId = req.user.id;
        const { conversationId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(conversationId)) {
            return res.status(400).json({ success: false, message: 'Invalid conversation ID' });
        }

        const unreadCount = await Message.countDocuments({
            conversationId,
            senderId: { $ne: userId },
            read: false
        });

        return res.status(200).json({
            success: true,
            data: { unreadCount }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error fetching unread count', error: error.message });
    }
};

/**
 * PUT /api/messages/conversations/:conversationId/mark-read
 * Mark all messages as read
 */
exports.markConversationAsRead = async (req, res) => {
    try {
        const userId = req.user.id;
        const { conversationId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(conversationId)) {
            return res.status(400).json({ success: false, message: 'Invalid conversation ID' });
        }

        const result = await Message.updateMany(
            { conversationId, senderId: { $ne: userId }, read: false },
            { read: true, readAt: new Date() }
        );

        return res.status(200).json({
            success: true,
            message: 'Conversation marked as read',
            data: { modifiedCount: result.modifiedCount }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error marking messages as read', error: error.message });
    }
};
