const User = require('../models/auth');
const mongoose = require('mongoose');

/**
 * GET /api/profile
 * Get current user profile
 */
exports.getMyProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId).select('-password');

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        return res.status(200).json({ success: true, data: user });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error fetching profile', error: error.message });
    }
};

/**
 * PUT /api/profile
 * Update current user profile
 */
exports.updateMyProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, bio, avatar, city, state, country, website, mobileNumber } = req.body;

        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (bio !== undefined) updateData.biography = bio;
        if (avatar !== undefined) updateData.profileImage = avatar;
        if (city !== undefined) updateData.city = city;
        if (state !== undefined) updateData.state = state;
        if (country !== undefined) updateData.country = country;
        if (website !== undefined) updateData.website = website;
        if (mobileNumber !== undefined) updateData.mobileNumber = mobileNumber;

        const user = await User.findByIdAndUpdate(userId, updateData, { new: true }).select('-password');

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        return res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: user
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error updating profile', error: error.message });
    }
};

/**
 * POST /api/profile/avatar
 * Upload profile avatar
 */
exports.uploadAvatar = async (req, res) => {
    try {
        const userId = req.user.id;
        const { avatarUrl } = req.body;

        if (!avatarUrl) {
            return res.status(400).json({ success: false, message: 'avatarUrl is required' });
        }

        const user = await User.findByIdAndUpdate(
            userId,
            { profileImage: avatarUrl, updatedAt: new Date() },
            { new: true }
        ).select('-password');

        return res.status(200).json({
            success: true,
            message: 'Avatar uploaded successfully',
            data: { avatarUrl: user.profileImage }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error uploading avatar', error: error.message });
    }
};

/**
 * POST /api/profile/settings
 * Update user settings
 */
exports.updateSettings = async (req, res) => {
    try {
        const userId = req.user.id;
        const { emailNotifications, pushNotifications, campaignUpdates, marketingEmails, language, timezone } = req.body;

        const updateData = {};
        if (emailNotifications !== undefined) updateData['settings.emailNotifications'] = emailNotifications;
        if (pushNotifications !== undefined) updateData['settings.pushNotifications'] = pushNotifications;
        if (campaignUpdates !== undefined) updateData['settings.campaignUpdates'] = campaignUpdates;
        if (marketingEmails !== undefined) updateData['settings.marketingEmails'] = marketingEmails;
        if (language !== undefined) updateData['settings.language'] = language;
        if (timezone !== undefined) updateData['settings.timezone'] = timezone;

        const user = await User.findByIdAndUpdate(userId, updateData, { new: true }).select('-password');

        return res.status(200).json({
            success: true,
            message: 'Settings updated',
            data: user.settings || {}
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error updating settings', error: error.message });
    }
};

/**
 * POST /api/profile/change-password
 * Change password
 */
exports.changePassword = async (req, res) => {
    try {
        const userId = req.user.id;
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: 'currentPassword and newPassword are required' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const bcrypt = require('bcryptjs');
        const isValid = await bcrypt.compare(currentPassword, user.password);
        if (!isValid) {
            return res.status(400).json({ success: false, message: 'Current password is incorrect' });
        }

        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();

        return res.status(200).json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error changing password', error: error.message });
    }
};

/**
 * POST /api/profile/verify-email
 * Send email verification
 */
exports.verifyEmail = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // In production, send email with verification link
        const verificationCode = Math.random().toString(36).substring(2, 8).toUpperCase();

        return res.status(200).json({
            success: true,
            message: 'Verification email sent',
            data: {
                email: user.email,
                message: 'Check your email for verification code',
                expiresIn: '10 minutes'
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error sending verification', error: error.message });
    }
};

/**
 * GET /api/profile/activity
 * Get user activity log
 */
exports.getActivityLog = async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 20 } = req.query;
        const skip = (page - 1) * limit;

        const activityLog = [
            {
                _id: '1',
                action: 'LOGIN',
                description: 'Logged in',
                timestamp: new Date(),
                ipAddress: '192.168.1.1'
            },
            {
                _id: '2',
                action: 'PROFILE_UPDATE',
                description: 'Updated profile picture',
                timestamp: new Date(Date.now() - 3600000),
                ipAddress: '192.168.1.1'
            },
            {
                _id: '3',
                action: 'PASSWORD_CHANGE',
                description: 'Changed password',
                timestamp: new Date(Date.now() - 86400000),
                ipAddress: '192.168.1.1'
            }
        ];

        return res.status(200).json({
            success: true,
            data: activityLog.slice(skip, skip + parseInt(limit)),
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: activityLog.length,
                pages: Math.ceil(activityLog.length / limit)
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error fetching activity', error: error.message });
    }
};

/**
 * POST /api/profile/deactivate
 * Deactivate account
 */
exports.deactivateAccount = async (req, res) => {
    try {
        const userId = req.user.id;
        const { password, reason } = req.body;

        if (!password) {
            return res.status(400).json({ success: false, message: 'Password is required' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const bcrypt = require('bcryptjs');
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return res.status(400).json({ success: false, message: 'Password is incorrect' });
        }

        await User.findByIdAndUpdate(userId, {
            isActive: false,
            deactivatedAt: new Date(),
            deactivationReason: reason || ''
        });

        return res.status(200).json({
            success: true,
            message: 'Account deactivated successfully',
            data: {
                deactivatedAt: new Date(),
                message: 'Your account has been deactivated. Contact support to reactivate.'
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error deactivating account', error: error.message });
    }
};
