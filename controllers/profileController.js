const User = require('../models/auth');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const smsService = require('./smsService');

/**
 * GET /api/profile/full
 * Get complete user profile with all details
 */
exports.getFullProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId).select('-password');

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        return res.status(200).json({
            success: true,
            data: {
                // Basic Info
                id: user._id,
                email: user.email,
                type: user.type,
                status: user.isActive ? 'ACTIVE' : 'INACTIVE',

                // Personal Details
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                name: user.name || '',
                phone: user.phone || user.mobileNumber || '',
                bio: user.bio || user.biography || '',

                // Profile Image
                profileImage: user.profileImage || user.avatar || '',
                coverImage: user.coverImage || '',

                // Location
                city: user.city || '',
                state: user.state || '',
                country: user.country || '',
                zipCode: user.zipCode || '',
                address: user.address || '',

                // Professional Info
                categories: user.categories || [],
                skills: user.skills || [],
                website: user.website || '',
                socialLinks: {
                    instagram: user.instagramHandle || user.instagram || '',
                    youtube: user.youtubeHandle || user.youtube || '',
                    tiktok: user.tiktokHandle || user.tiktok || '',
                    twitter: user.twitterHandle || user.twitter || '',
                    linkedin: user.linkedinProfile || ''
                },

                // Social Stats
                followers: {
                    instagram: user.instagramFollowers || 0,
                    youtube: user.youtubeFollowers || 0,
                    tiktok: user.tiktokFollowers || 0,
                    twitter: user.twitterFollowers || 0
                },
                engagement: user.averageEngagement || 0,

                // Account Info
                accountVerified: user.accountVerified || false,
                emailVerified: user.emailVerified || false,
                phoneVerified: user.phoneVerified || false,
                idVerified: user.idVerified || false,

                // Preferences
                language: user.language || 'en',
                timezone: user.timezone || 'UTC',
                currency: user.currency || 'INR',

                // Dates
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
                lastLogin: user.lastLogin,

                // Additional
                bio: user.biography || user.bio || '',
                description: user.description || ''
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error fetching profile', error: error.message });
    }
};

/**
 * PUT /api/profile/personal-info
 * Update personal information (name, email, phone, bio, etc)
 */
exports.updatePersonalInfo = async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            firstName, lastName, name, email, phone,
            bio, city, state, country, zipCode, address,
            website, language, timezone, currency
        } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Update personal details
        if (firstName !== undefined) user.firstName = firstName;
        if (lastName !== undefined) user.lastName = lastName;
        if (name !== undefined) user.name = name;
        if (email !== undefined) {
            // Check if email already exists
            const existingUser = await User.findOne({ email, _id: { $ne: userId } });
            if (existingUser) {
                return res.status(409).json({ success: false, message: 'Email already in use' });
            }
            user.email = email;
        }
        if (phone !== undefined) user.phone = user.mobileNumber = phone;
        if (bio !== undefined) user.biography = user.bio = bio;

        // Update location
        if (city !== undefined) user.city = city;
        if (state !== undefined) user.state = state;
        if (country !== undefined) user.country = country;
        if (zipCode !== undefined) user.zipCode = zipCode;
        if (address !== undefined) user.address = address;

        // Update professional info
        if (website !== undefined) user.website = website;

        // Update preferences
        if (language !== undefined) user.language = language;
        if (timezone !== undefined) user.timezone = timezone;
        if (currency !== undefined) user.currency = currency;

        user.updatedAt = new Date();
        await user.save();

        return res.status(200).json({
            success: true,
            message: 'Personal information updated successfully',
            data: {
                firstName: user.firstName,
                lastName: user.lastName,
                name: user.name,
                email: user.email,
                phone: user.phone,
                bio: user.bio,
                city: user.city,
                state: user.state,
                country: user.country,
                website: user.website,
                language: user.language,
                timezone: user.timezone,
                updatedAt: user.updatedAt
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error updating personal info', error: error.message });
    }
};

/**
 * PUT /api/profile/professional-info
 * Update professional information (categories, skills, social links)
 */
exports.updateProfessionalInfo = async (req, res) => {
    try {
        const userId = req.user.id;
        const { categories, skills, instagram, youtube, tiktok, twitter, linkedin } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Update categories
        if (categories !== undefined) user.categories = categories;

        // Update skills
        if (skills !== undefined) user.skills = skills;

        // Update social links
        if (instagram !== undefined) user.instagramHandle = user.instagram = instagram;
        if (youtube !== undefined) user.youtubeHandle = user.youtube = youtube;
        if (tiktok !== undefined) user.tiktokHandle = user.tiktok = tiktok;
        if (twitter !== undefined) user.twitterHandle = user.twitter = twitter;
        if (linkedin !== undefined) user.linkedinProfile = user.linkedin = linkedin;

        user.updatedAt = new Date();
        await user.save();

        return res.status(200).json({
            success: true,
            message: 'Professional information updated successfully',
            data: {
                categories: user.categories,
                skills: user.skills,
                socialLinks: {
                    instagram: user.instagram,
                    youtube: user.youtube,
                    tiktok: user.tiktok,
                    twitter: user.twitter,
                    linkedin: user.linkedin
                },
                updatedAt: user.updatedAt
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error updating professional info', error: error.message });
    }
};

/**
 * PUT /api/profile/social-stats
 * Update social media statistics
 */
exports.updateSocialStats = async (req, res) => {
    try {
        const userId = req.user.id;
        const { instagramFollowers, youtubeFollowers, tiktokFollowers, twitterFollowers, engagement } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (instagramFollowers !== undefined) user.instagramFollowers = instagramFollowers;
        if (youtubeFollowers !== undefined) user.youtubeFollowers = youtubeFollowers;
        if (tiktokFollowers !== undefined) user.tiktokFollowers = tiktokFollowers;
        if (twitterFollowers !== undefined) user.twitterFollowers = twitterFollowers;
        if (engagement !== undefined) user.averageEngagement = engagement;

        user.updatedAt = new Date();
        await user.save();

        return res.status(200).json({
            success: true,
            message: 'Social statistics updated successfully',
            data: {
                followers: {
                    instagram: user.instagramFollowers,
                    youtube: user.youtubeFollowers,
                    tiktok: user.tiktokFollowers,
                    twitter: user.twitterFollowers
                },
                engagement: user.averageEngagement,
                updatedAt: user.updatedAt
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error updating social stats', error: error.message });
    }
};

/**
 * POST /api/profile/upload-image
 * Upload profile image
 */
exports.uploadProfileImage = async (req, res) => {
    try {
        const userId = req.user.id;
        const { imageUrl, imageType = 'profile' } = req.body;

        if (!imageUrl) {
            return res.status(400).json({ success: false, message: 'imageUrl is required' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (imageType === 'cover') {
            user.coverImage = imageUrl;
        } else {
            user.profileImage = user.avatar = imageUrl;
        }

        user.updatedAt = new Date();
        await user.save();

        return res.status(200).json({
            success: true,
            message: `${imageType === 'cover' ? 'Cover' : 'Profile'} image uploaded successfully`,
            data: {
                imageUrl: imageUrl,
                imageType: imageType,
                profileImage: user.profileImage,
                coverImage: user.coverImage
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error uploading image', error: error.message });
    }
};

/**
 * POST /api/profile/delete-image
 * Delete profile or cover image
 */
exports.deleteProfileImage = async (req, res) => {
    try {
        const userId = req.user.id;
        const { imageType = 'profile' } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (imageType === 'cover') {
            user.coverImage = null;
        } else {
            user.profileImage = user.avatar = null;
        }

        user.updatedAt = new Date();
        await user.save();

        return res.status(200).json({
            success: true,
            message: `${imageType === 'cover' ? 'Cover' : 'Profile'} image deleted successfully`
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error deleting image', error: error.message });
    }
};

/**
 * POST /api/profile/change-password
 * Change user password with current password verification
 */
exports.changePassword = async (req, res) => {
    try {
        const userId = req.user.id;
        const { currentPassword, newPassword, confirmPassword } = req.body;

        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'currentPassword, newPassword, and confirmPassword are required'
            });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'New passwords do not match'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 6 characters'
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Verify current password
        const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ success: false, message: 'Current password is incorrect' });
        }

        // Update password
        user.password = await bcrypt.hash(newPassword, 10);
        user.updatedAt = new Date();
        await user.save();

        return res.status(200).json({
            success: true,
            message: 'Password changed successfully',
            data: {
                message: 'Your password has been updated. Please login again with your new password.'
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error changing password', error: error.message });
    }
};

/**
 * PUT /api/profile/update-email
 * Update email address
 */
exports.updateEmail = async (req, res) => {
    try {
        const userId = req.user.id;
        const { newEmail, password } = req.body;

        if (!newEmail || !password) {
            return res.status(400).json({
                success: false,
                message: 'newEmail and password are required'
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ success: false, message: 'Password is incorrect' });
        }

        // Check if email already exists
        const existingUser = await User.findOne({ email: newEmail, _id: { $ne: userId } });
        if (existingUser) {
            return res.status(409).json({ success: false, message: 'Email already in use' });
        }

        const oldEmail = user.email;
        user.email = newEmail;
        user.emailVerified = false;
        user.updatedAt = new Date();
        await user.save();

        return res.status(200).json({
            success: true,
            message: 'Email updated successfully',
            data: {
                oldEmail: oldEmail,
                newEmail: newEmail,
                message: 'A verification email has been sent to your new email address'
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error updating email', error: error.message });
    }
};

/**
 * PUT /api/profile/update-phone
 * Update phone number
 */
exports.updatePhone = async (req, res) => {
    try {
        const userId = req.user.id;
        const { newPhone, password } = req.body;

        if (!newPhone || !password) {
            return res.status(400).json({
                success: false,
                message: 'newPhone and password are required'
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ success: false, message: 'Password is incorrect' });
        }

        const oldPhone = user.phone || user.mobileNumber;
        user.phone = user.mobileNumber = newPhone;
        user.phoneVerified = false;
        user.updatedAt = new Date();
        await user.save();

        return res.status(200).json({
            success: true,
            message: 'Phone number updated successfully',
            data: {
                oldPhone: oldPhone,
                newPhone: newPhone,
                message: 'A verification OTP has been sent to your new phone number'
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error updating phone', error: error.message });
    }
};

/**
 * POST /api/profile/verify-email-send-otp
 * Send email verification OTP
 */
exports.sendEmailVerificationOTP = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000);
        user.emailVerificationOTP = otp;
        user.emailVerificationOTPExpiry = new Date(Date.now() + 10 * 60 * 1000);

        await user.save();

        // Send OTP via SMS if phone is available
        if (user.phone || user.mobileNumber) {
            const phone = user.phone || user.mobileNumber;
            const smsResult = await smsService.sendOTP(phone, otp, 'email');

            // Log SMS result but don't fail the request if SMS fails
            if (!smsResult.success) {
                console.warn('SMS sending failed:', smsResult.error);
            }
        }

        return res.status(200).json({
            success: true,
            message: 'Verification OTP sent to your email',
            data: {
                email: user.email,
                message: `An OTP has been sent to ${user.email}`,
                expiresIn: '10 minutes'
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error sending OTP', error: error.message });
    }
};

/**
 * POST /api/profile/verify-email-with-otp
 * Verify email with OTP
 */
exports.verifyEmailWithOTP = async (req, res) => {
    try {
        const userId = req.user.id;
        const { otp } = req.body;

        if (!otp) {
            return res.status(400).json({ success: false, message: 'OTP is required' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Verify OTP
        if (user.emailVerificationOTP !== parseInt(otp)) {
            return res.status(400).json({ success: false, message: 'Invalid OTP' });
        }

        if (new Date() > user.emailVerificationOTPExpiry) {
            return res.status(400).json({ success: false, message: 'OTP has expired' });
        }

        user.emailVerified = true;
        user.emailVerificationOTP = null;
        user.emailVerificationOTPExpiry = null;
        user.updatedAt = new Date();
        await user.save();

        return res.status(200).json({
            success: true,
            message: 'Email verified successfully',
            data: {
                email: user.email,
                verified: true
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error verifying email', error: error.message });
    }
};

/**
 * GET /api/profile/verification-status
 * Get verification status of account
 */
exports.getVerificationStatus = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        return res.status(200).json({
            success: true,
            data: {
                accountVerified: user.accountVerified || false,
                emailVerified: user.emailVerified || false,
                phoneVerified: user.phoneVerified || false,
                idVerified: user.idVerified || false,
                completionPercentage: calculateVerificationPercentage(user)
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error fetching verification status', error: error.message });
    }
};

/**
 * GET /api/profile/summary
 * Get profile summary for quick view
 */
exports.getProfileSummary = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        return res.status(200).json({
            success: true,
            data: {
                name: user.name || `${user.firstName} ${user.lastName}`.trim(),
                email: user.email,
                phone: user.phone || user.mobileNumber,
                profileImage: user.profileImage || user.avatar,
                type: user.type,
                bio: user.bio || user.biography,
                location: `${user.city || ''} ${user.state || ''} ${user.country || ''}`.trim() || 'Not specified',
                categories: user.categories || [],
                followers: {
                    instagram: user.instagramFollowers || 0,
                    youtube: user.youtubeFollowers || 0,
                    tiktok: user.tiktokFollowers || 0
                },
                verificationStatus: {
                    email: user.emailVerified || false,
                    phone: user.phoneVerified || false,
                    id: user.idVerified || false
                }
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error fetching summary', error: error.message });
    }
};

/**
 * Helper function
 */
function calculateVerificationPercentage(user) {
    let verified = 0;
    const total = 4;

    if (user.accountVerified) verified++;
    if (user.emailVerified) verified++;
    if (user.phoneVerified) verified++;
    if (user.idVerified) verified++;

    return Math.round((verified / total) * 100);
}
