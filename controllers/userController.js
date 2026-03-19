const { user } = require('../models/auth');

exports.getProfile = async (req, res) => {
    try {
        const foundUser = await user.findById(req.user.id).select('-password');
        if (!foundUser) return res.status(404).json({ success: false, message: 'User not found' });
        res.json({ success: true, data: foundUser });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const { name, profileImage, mobileNumber, website, agencyName, ...updateData } = req.body;
        const foundUser = await user.findByIdAndUpdate(req.user.id, {
            name, profileImage, mobileNumber, website, agencyName, ...updateData
        }, { new: true }).select('-password');
        res.json({ success: true, data: foundUser });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.searchUsers = async (req, res) => {
    try {
        const { q, type, page = 1, limit = 10 } = req.query;
        let filter = {};
        if (q) filter.$or = [{ name: { $regex: q, $options: 'i' } }, { email: { $regex: q, $options: 'i' } }];
        if (type) filter.type = type;
        const users = await user.find(filter).select('-password').skip((page - 1) * limit).limit(parseInt(limit));
        const total = await user.countDocuments(filter);
        res.json({ success: true, total, page, limit, data: users });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getUserById = async (req, res) => {
    try {
        const foundUser = await user.findById(req.params.id).select('-password');
        if (!foundUser) return res.status(404).json({ success: false, message: 'User not found' });
        res.json({ success: true, data: foundUser });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteAccount = async (req, res) => {
    try {
        await user.findByIdAndDelete(req.user.id);
        res.json({ success: true, message: 'Account deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.logout = async (req, res) => {
    try {
        // Increment tokenVersion to invalidate all existing tokens
        await user.findByIdAndUpdate(req.user.id, { $inc: { tokenVersion: 1 } });

        // Clear authentication cookie
        res.clearCookie('authtoken', { httpOnly: true, secure: process.env.NODE_ENV === 'production' });

        res.json({
            success: true,
            message: 'Logged out successfully',
            clearLocalStorage: true
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getAccountSettings = async (req, res) => {
    try {
        const foundUser = await user.findById(req.user.id).select('email name type notificationPreferences currentPlan subscriptionStatus isActive');
        if (!foundUser) return res.status(404).json({ success: false, message: 'User not found' });

        res.json({
            success: true,
            data: {
                email: foundUser.email,
                name: foundUser.name,
                type: foundUser.type,
                notificationPreferences: foundUser.notificationPreferences,
                currentPlan: foundUser.currentPlan,
                subscriptionStatus: foundUser.subscriptionStatus,
                isActive: foundUser.isActive
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateNotificationPreferences = async (req, res) => {
    try {
        const { email, push, sms, campaignUpdates, paymentAlerts, marketingEmails } = req.body;

        const updateData = {};
        if (email !== undefined) updateData['notificationPreferences.email'] = email;
        if (push !== undefined) updateData['notificationPreferences.push'] = push;
        if (sms !== undefined) updateData['notificationPreferences.sms'] = sms;
        if (campaignUpdates !== undefined) updateData['notificationPreferences.campaignUpdates'] = campaignUpdates;
        if (paymentAlerts !== undefined) updateData['notificationPreferences.paymentAlerts'] = paymentAlerts;
        if (marketingEmails !== undefined) updateData['notificationPreferences.marketingEmails'] = marketingEmails;

        const updatedUser = await user.findByIdAndUpdate(req.user.id, updateData, { new: true })
            .select('notificationPreferences');

        res.json({ success: true, data: updatedUser.notificationPreferences });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.listUsers = async (req, res) => {
    try {
        const { type, status, page = 1, limit = 10 } = req.query;

        let filter = {};
        if (type) filter.type = type;
        if (status === 'active') filter.isActive = true;
        if (status === 'inactive') filter.isActive = false;
        if (status === 'approved') filter.isApproved = true;
        if (status === 'pending') filter.isApproved = false;

        const users = await user.find(filter)
            .select('-password')
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .sort({ createdAt: -1 });

        const total = await user.countDocuments(filter);

        res.json({
            success: true,
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            data: users
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
