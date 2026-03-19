const Admin = require('../models/admin');
const { user } = require('../models/auth');
const bcrypt = require('bcryptjs');

exports.getProfile = async (req, res) => {
    try {
        const admin = await Admin.findById(req.user.id).select('-password');
        if (!admin) return res.status(404).json({ success: false, message: 'Admin not found' });
        res.json({ success: true, data: admin });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const admin = await Admin.findById(req.user.id);

        const isPasswordValid = await bcrypt.compare(currentPassword, admin.password);
        if (!isPasswordValid) {
            return res.status(400).json({ success: false, message: 'Current password is incorrect' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        admin.password = hashedPassword;
        await admin.save();

        res.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.listRequests = async (req, res) => {
    try {
        const { status = 'PENDING', type = 'BRAND', page = 1, limit = 10 } = req.query;
        let filter = { type, isApproved: status === 'PENDING' ? false : true };

        const requests = await user.find(filter)
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .select('-password');

        const total = await user.countDocuments(filter);
        res.json({ success: true, total, page, limit, data: requests });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.approveBrandRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const brandUser = await user.findByIdAndUpdate(id, { isApproved: true }, { new: true });
        res.json({ success: true, message: 'Brand request approved', data: brandUser });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getStatistics = async (req, res) => {
    try {
        const totalUsers = await user.countDocuments();
        const totalBrands = await user.countDocuments({ type: 'BRAND' });
        const totalInfluencers = await user.countDocuments({ type: 'INFLUENCER' });
        const pendingBrandApprovals = await user.countDocuments({ type: 'BRAND', isApproved: false });
        const pendingInfluencerApprovals = await user.countDocuments({ type: 'INFLUENCER', isApproved: false });

        res.json({
            success: true,
            data: {
                totalUsers,
                totalBrands,
                totalInfluencers,
                pendingBrandApprovals,
                pendingInfluencerApprovals
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getSingleRequest = async (req, res) => {
    try {
        const request = await user.findById(req.params.id).select('-password');
        if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
        res.json({ success: true, data: request });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.rejectBrandRequest = async (req, res) => {
    try {
        const { id } = req.params;
        await user.findByIdAndDelete(id);
        res.json({ success: true, message: 'Brand request rejected' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.createAdmin = async (req, res) => {
    try {
        const { email, name, password, role = 'ADMIN' } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);

        const newAdmin = await Admin.create({
            email,
            name,
            password: hashedPassword,
            role,
            isActive: true
        });

        res.status(201).json({ success: true, data: { id: newAdmin._id, email: newAdmin.email, name: newAdmin.name } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.listAdmins = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const admins = await Admin.find()
            .select('-password')
            .skip((page - 1) * limit)
            .limit(parseInt(limit));
        const total = await Admin.countDocuments();
        res.json({ success: true, total, page, limit, data: admins });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getInfluencerRequests = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const requests = await user.find({ type: 'INFLUENCER', isApproved: false })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .select('-password');
        const total = await user.countDocuments({ type: 'INFLUENCER', isApproved: false });
        res.json({ success: true, total, page, limit, data: requests });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.approveInfluencer = async (req, res) => {
    try {
        const { id } = req.params;
        const influencerUser = await user.findByIdAndUpdate(id, { isApproved: true }, { new: true });
        res.json({ success: true, message: 'Influencer approved', data: influencerUser });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * GET /api/admin/requests/brands
 * Get all pending brand requests
 */
exports.getBrandRequests = async (req, res) => {
    try {
        const { page = 1, limit = 20, status = 'pending' } = req.query;
        const skip = (page - 1) * limit;

        let query = { type: 'BRAND' };
        if (status === 'pending') query.isApproved = false;
        if (status === 'approved') query.isApproved = true;

        const total = await user.countDocuments(query);
        const requests = await user.find(query)
            .select('-password')
            .skip(skip)
            .limit(parseInt(limit))
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            data: requests,
            pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error fetching brand requests', error: error.message });
    }
};

/**
 * GET /api/admin/requests/influencers
 * Get all pending influencer requests
 */
exports.getInfluencerRequests = async (req, res) => {
    try {
        const { page = 1, limit = 20, status = 'pending' } = req.query;
        const skip = (page - 1) * limit;

        let query = { type: 'INFLUENCER' };
        if (status === 'pending') query.isApproved = false;
        if (status === 'approved') query.isApproved = true;

        const total = await user.countDocuments(query);
        const requests = await user.find(query)
            .select('-password')
            .skip(skip)
            .limit(parseInt(limit))
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            data: requests,
            pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error fetching influencer requests', error: error.message });
    }
};

/**
 * PUT /api/admin/requests/:id/approve
 * Approve user request
 */
exports.approveRequest = async (req, res) => {
    try {
        const { id } = req.params;

        const approvedUser = await user.findByIdAndUpdate(
            id,
            { isApproved: true, approvedAt: new Date() },
            { new: true }
        ).select('-password');

        if (!approvedUser) {
            return res.status(404).json({ success: false, message: 'Request not found' });
        }

        return res.status(200).json({
            success: true,
            message: 'Request approved',
            data: approvedUser
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error approving request', error: error.message });
    }
};

/**
 * PUT /api/admin/requests/:id/reject
 * Reject user request
 */
exports.rejectRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const rejectedUser = await user.findByIdAndUpdate(
            id,
            { isApproved: false, rejectionReason: reason || '', rejectedAt: new Date() },
            { new: true }
        ).select('-password');

        if (!rejectedUser) {
            return res.status(404).json({ success: false, message: 'Request not found' });
        }

        return res.status(200).json({
            success: true,
            message: 'Request rejected',
            data: rejectedUser
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error rejecting request', error: error.message });
    }
};

/**
 * GET /api/help/categories
 * Get help categories
 */
exports.getHelpCategories = async (req, res) => {
    try {
        const categories = [
            {
                id: 1,
                name: 'Getting Started',
                description: 'Learn the basics of Phyo',
                icon: 'rocket',
                articles: 15
            },
            {
                id: 2,
                name: 'Account & Profile',
                description: 'Manage your account settings and profile',
                icon: 'user',
                articles: 12
            },
            {
                id: 3,
                name: 'Campaigns',
                description: 'Create and manage campaigns',
                icon: 'briefcase',
                articles: 18
            },
            {
                id: 4,
                name: 'Payments & Billing',
                description: 'Payment methods and subscription management',
                icon: 'creditcard',
                articles: 10
            },
            {
                id: 5,
                name: 'Messaging',
                description: 'Communication and messaging features',
                icon: 'message',
                articles: 8
            },
            {
                id: 6,
                name: 'Safety & Support',
                description: 'Safety tips and customer support',
                icon: 'shield',
                articles: 14
            }
        ];

        return res.status(200).json({
            success: true,
            data: categories
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error fetching categories', error: error.message });
    }
};
