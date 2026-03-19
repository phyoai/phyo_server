const Conversation = require('../models/conversation');
const Message = require('../models/message');

exports.createConversation = async (req, res) => {
    try {
        const { participantId, campaignId, projectId } = req.body;
        const conversation = await Conversation.create({
            participants: [
                { userId: req.user.id, userName: req.user.name || req.user.email },
                { userId: participantId }
            ],
            campaignId,
            projectId
        });
        res.status(201).json({ success: true, data: conversation });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getConversations = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const conversations = await Conversation.find({
            'participants.userId': req.user.id
        }).skip((page - 1) * limit).limit(parseInt(limit)).sort({ updatedAt: -1 });
        const total = await Conversation.countDocuments({ 'participants.userId': req.user.id });
        res.json({ success: true, total, page, limit, data: conversations });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getConversationById = async (req, res) => {
    try {
        const conversation = await Conversation.findById(req.params.id);
        if (!conversation) return res.status(404).json({ success: false, message: 'Conversation not found' });
        res.json({ success: true, data: conversation });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteConversation = async (req, res) => {
    try {
        await Conversation.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Conversation deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
