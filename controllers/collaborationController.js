const User = require('../models/auth');
const mongoose = require('mongoose');

/**
 * POST /api/collaborations/request
 * Send collaboration request
 */
exports.sendCollaborationRequest = async (req, res) => {
    try {
        const senderId = req.user.id;
        const { receiverId, type, details, message } = req.body;

        if (!receiverId || !type) {
            return res.status(400).json({ success: false, message: 'receiverId and type are required' });
        }

        if (!mongoose.Types.ObjectId.isValid(receiverId)) {
            return res.status(400).json({ success: false, message: 'Invalid receiver ID' });
        }

        const receiver = await User.findById(receiverId);
        if (!receiver) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const collaborationRequest = {
            _id: new mongoose.Types.ObjectId(),
            senderId: new mongoose.Types.ObjectId(senderId),
            senderName: (await User.findById(senderId)).name,
            type: type, // brand-influencer, influencer-influencer, etc.
            details: details || {},
            message: message || '',
            status: 'PENDING',
            createdAt: new Date(),
            responseDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        };

        if (!receiver.collaborationRequests) receiver.collaborationRequests = [];
        receiver.collaborationRequests.push(collaborationRequest);
        await receiver.save();

        return res.status(201).json({
            success: true,
            message: 'Collaboration request sent',
            data: collaborationRequest
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error sending request', error: error.message });
    }
};

/**
 * GET /api/collaborations/requests
 * Get pending collaboration requests
 */
exports.getCollaborationRequests = async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 20, status = 'PENDING' } = req.query;
        const skip = (page - 1) * limit;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        let requests = user.collaborationRequests || [];
        if (status) {
            requests = requests.filter(r => r.status === status);
        }

        const total = requests.length;
        const paginated = requests.slice(skip, skip + parseInt(limit));

        return res.status(200).json({
            success: true,
            data: paginated,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error fetching requests', error: error.message });
    }
};

/**
 * POST /api/collaborations/requests/:requestId/accept
 * Accept collaboration request
 */
exports.acceptCollaborationRequest = async (req, res) => {
    try {
        const userId = req.user.id;
        const { requestId } = req.params;
        const { message } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const request = user.collaborationRequests?.find(r => r._id.toString() === requestId);
        if (!request) {
            return res.status(404).json({ success: false, message: 'Request not found' });
        }

        request.status = 'ACCEPTED';
        request.acceptedAt = new Date();
        request.responseMessage = message || '';

        await user.save();

        // Create collaboration record
        const collaboration = {
            _id: new mongoose.Types.ObjectId(),
            user1Id: request.senderId,
            user2Id: new mongoose.Types.ObjectId(userId),
            type: request.type,
            status: 'ACTIVE',
            createdAt: new Date(),
            details: request.details
        };

        return res.status(200).json({
            success: true,
            message: 'Collaboration request accepted',
            data: {
                request,
                collaboration
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error accepting request', error: error.message });
    }
};

/**
 * POST /api/collaborations/requests/:requestId/reject
 * Reject collaboration request
 */
exports.rejectCollaborationRequest = async (req, res) => {
    try {
        const userId = req.user.id;
        const { requestId } = req.params;
        const { reason } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const request = user.collaborationRequests?.find(r => r._id.toString() === requestId);
        if (!request) {
            return res.status(404).json({ success: false, message: 'Request not found' });
        }

        request.status = 'REJECTED';
        request.rejectedAt = new Date();
        request.rejectionReason = reason || '';

        await user.save();

        return res.status(200).json({
            success: true,
            message: 'Collaboration request rejected',
            data: request
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error rejecting request', error: error.message });
    }
};

/**
 * GET /api/collaborations/active
 * Get active collaborations
 */
exports.getActiveCollaborations = async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 20 } = req.query;
        const skip = (page - 1) * limit;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const activeRequests = (user.collaborationRequests || []).filter(r => r.status === 'ACCEPTED');

        const collaborations = activeRequests.map(req => ({
            collaborationId: req._id,
            partnerId: req.senderId,
            partnerName: req.senderName,
            type: req.type,
            status: 'ACTIVE',
            startDate: req.acceptedAt,
            details: req.details
        }));

        const total = collaborations.length;
        const paginated = collaborations.slice(skip, skip + parseInt(limit));

        return res.status(200).json({
            success: true,
            data: paginated,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error fetching collaborations', error: error.message });
    }
};

/**
 * POST /api/collaborations/:collaborationId/end
 * End collaboration
 */
exports.endCollaboration = async (req, res) => {
    try {
        const userId = req.user.id;
        const { collaborationId } = req.params;
        const { reason } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const request = user.collaborationRequests?.find(r => r._id.toString() === collaborationId);
        if (!request) {
            return res.status(404).json({ success: false, message: 'Collaboration not found' });
        }

        request.status = 'ENDED';
        request.endedAt = new Date();
        request.endReason = reason || '';

        await user.save();

        return res.status(200).json({
            success: true,
            message: 'Collaboration ended',
            data: request
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error ending collaboration', error: error.message });
    }
};

/**
 * GET /api/collaborations/stats
 * Get collaboration statistics
 */
exports.getCollaborationStats = async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const requests = user.collaborationRequests || [];

        const stats = {
            total: requests.length,
            pending: requests.filter(r => r.status === 'PENDING').length,
            accepted: requests.filter(r => r.status === 'ACCEPTED').length,
            rejected: requests.filter(r => r.status === 'REJECTED').length,
            active: requests.filter(r => r.status === 'ACTIVE').length,
            ended: requests.filter(r => r.status === 'ENDED').length,
            acceptanceRate: requests.length > 0
                ? Math.round((requests.filter(r => r.status === 'ACCEPTED').length / requests.length) * 100)
                : 0
        };

        return res.status(200).json({
            success: true,
            data: stats
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error fetching stats', error: error.message });
    }
};
