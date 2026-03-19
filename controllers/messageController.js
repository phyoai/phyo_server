const Message = require('../models/message');
const Conversation = require('../models/conversation');

exports.sendMessage = async (req, res) => {
    try {
        const { conversationId, content, type = 'TEXT', mediaUrl, fileName } = req.body;
        const message = await Message.create({
            conversationId,
            senderId: req.user.id,
            senderName: req.user.name,
            content,
            type,
            mediaUrl,
            fileName
        });

        // Update conversation lastMessage
        await Conversation.findByIdAndUpdate(conversationId, {
            lastMessage: content,
            lastMessageAt: new Date(),
            lastMessageSenderId: req.user.id
        });

        res.status(201).json({ success: true, data: message });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getMessages = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { page = 1, limit = 20 } = req.query;

        const messages = await Message.find({ conversationId, isDeleted: false })
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Message.countDocuments({ conversationId, isDeleted: false });

        res.json({ success: true, total, page, limit, data: messages.reverse() });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.markAsRead = async (req, res) => {
    try {
        const message = await Message.findByIdAndUpdate(req.params.id, {
            isRead: true,
            readAt: new Date()
        }, { new: true });

        res.json({ success: true, data: message });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteMessage = async (req, res) => {
    try {
        const message = await Message.findByIdAndUpdate(req.params.id, { isDeleted: true }, { new: true });
        res.json({ success: true, message: 'Message deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
