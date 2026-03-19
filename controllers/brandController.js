const { user } = require('../models/auth');
const bcrypt = require('bcryptjs');

exports.brandSignup = async (req, res) => {
    try {
        const { email, password, name, website, agencyName } = req.body;
        const existingUser = await user.findOne({ email });
        if (existingUser) return res.status(400).json({ success: false, message: 'Email already registered' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newBrand = await user.create({
            email,
            password: hashedPassword,
            name,
            website,
            agencyName,
            type: 'BRAND',
            emailVerified: false
        });

        res.status(201).json({ success: true, message: 'Brand registered successfully', data: { id: newBrand._id, email: newBrand.email } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getBrandProfile = async (req, res) => {
    try {
        const brandUser = await user.findById(req.user.id).select('-password');
        if (!brandUser || brandUser.type !== 'BRAND') {
            return res.status(404).json({ success: false, message: 'Brand not found' });
        }
        res.json({ success: true, data: brandUser });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateBrandProfile = async (req, res) => {
    try {
        const { name, website, agencyName, profileImage, mobileNumber } = req.body;
        const brandUser = await user.findByIdAndUpdate(req.user.id, {
            name, website, agencyName, profileImage, mobileNumber
        }, { new: true }).select('-password');
        res.json({ success: true, data: brandUser });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const brandUser = await user.findById(req.user.id);

        const isPasswordValid = await bcrypt.compare(currentPassword, brandUser.password);
        if (!isPasswordValid) {
            return res.status(400).json({ success: false, message: 'Current password is incorrect' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        brandUser.password = hashedPassword;
        await brandUser.save();

        res.json({ success: true, message: 'Password changed successfully' });
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

exports.deactivateAccount = async (req, res) => {
    try {
        const { password } = req.body;
        const brandUser = await user.findById(req.user.id);

        // Verify password before deactivating
        const isPasswordValid = await bcrypt.compare(password, brandUser.password);
        if (!isPasswordValid) {
            return res.status(400).json({ success: false, message: 'Password is incorrect' });
        }

        // Soft delete - mark as inactive
        await user.findByIdAndUpdate(req.user.id, { isActive: false });

        // Clear authentication cookie
        res.clearCookie('authtoken', { httpOnly: true, secure: process.env.NODE_ENV === 'production' });

        res.json({ success: true, message: 'Account deactivated successfully', clearLocalStorage: true });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.listBrands = async (req, res) => {
    try {
        const { status, page = 1, limit = 10 } = req.query;

        let filter = { type: 'BRAND' };
        if (status === 'approved') filter.isApproved = true;
        if (status === 'pending') filter.isApproved = false;
        if (status === 'active') filter.isActive = true;
        if (status === 'inactive') filter.isActive = false;

        const brands = await user.find(filter)
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
            data: brands
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

/**
 * GET /api/brands
 * Get all brands
 */
exports.getAllBrands = async (req, res) => {
    try {
        const { page = 1, limit = 20, status = 'approved' } = req.query;
        const skip = (page - 1) * limit;

        let query = { type: 'BRAND' };
        if (status === 'approved') query.isApproved = true;
        if (status === 'pending') query.isApproved = false;

        const total = await user.countDocuments(query);
        const brands = await user.find(query)
            .select('-password')
            .skip(skip)
            .limit(parseInt(limit))
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            data: brands,
            pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error fetching brands', error: error.message });
    }
};

/**
 * GET /api/brands/:id
 * Get brand details
 */
exports.getBrandById = async (req, res) => {
    try {
        const { id } = req.params;

        const brandUser = await user.findById(id).select('-password');
        if (!brandUser || brandUser.type !== 'BRAND') {
            return res.status(404).json({ success: false, message: 'Brand not found' });
        }

        return res.status(200).json({ success: true, data: brandUser });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error fetching brand', error: error.message });
    }
};

/**
 * GET /api/brands/:id/campaigns
 * Get brand campaigns
 */
exports.getBrandCampaigns = async (req, res) => {
    try {
        const { id } = req.params;
        const { page = 1, limit = 20, status } = req.query;
        const skip = (page - 1) * limit;

        const brandUser = await user.findById(id);
        if (!brandUser || brandUser.type !== 'BRAND') {
            return res.status(404).json({ success: false, message: 'Brand not found' });
        }

        // Placeholder for campaign queries
        // In a real scenario, this would query the Campaign model
        const campaigns = [];
        const total = 0;

        return res.status(200).json({
            success: true,
            data: campaigns,
            pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) || 1 }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error fetching campaigns', error: error.message });
    }
};

/**
 * GET /api/brands/:id/stats
 * Get brand statistics
 */
exports.getBrandStats = async (req, res) => {
    try {
        const { id } = req.params;

        const brandUser = await user.findById(id).select('-password');
        if (!brandUser || brandUser.type !== 'BRAND') {
            return res.status(404).json({ success: false, message: 'Brand not found' });
        }

        const stats = {
            brandId: brandUser._id,
            brandName: brandUser.name,
            totalCampaigns: 0,
            activeCampaigns: 0,
            completedCampaigns: 0,
            totalBudgetSpent: 0,
            totalInfluencersEngaged: 0,
            averageEngagement: 0,
            memberSince: brandUser.createdAt,
            isApproved: brandUser.isApproved
        };

        return res.status(200).json({ success: true, data: stats });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error fetching stats', error: error.message });
    }
};

/**
 * PUT /api/brands/:id/profile
 * Update brand profile
 */
exports.updateBrandById = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, website, agencyName, profileImage, mobileNumber, description, industry } = req.body;

        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (website !== undefined) updateData.website = website;
        if (agencyName !== undefined) updateData.agencyName = agencyName;
        if (profileImage !== undefined) updateData.profileImage = profileImage;
        if (mobileNumber !== undefined) updateData.mobileNumber = mobileNumber;
        if (description !== undefined) updateData.description = description;
        if (industry !== undefined) updateData.industry = industry;

        const updatedBrand = await user.findByIdAndUpdate(id, updateData, { new: true }).select('-password');
        if (!updatedBrand || updatedBrand.type !== 'BRAND') {
            return res.status(404).json({ success: false, message: 'Brand not found' });
        }

        return res.status(200).json({
            success: true,
            message: 'Brand profile updated',
            data: updatedBrand
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error updating brand', error: error.message });
    }
};
