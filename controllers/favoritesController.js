const User = require('../models/auth');
const Campaign = require('../models/campaign');
const mongoose = require('mongoose');

/**
 * POST /api/favorites/campaigns/:campaignId
 * Add campaign to favorites
 */
exports.addCampaignToFavorites = async (req, res) => {
    try {
        const userId = req.user.id;
        const { campaignId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(campaignId)) {
            return res.status(400).json({ success: false, message: 'Invalid campaign ID' });
        }

        const campaign = await Campaign.findById(campaignId);
        if (!campaign) {
            return res.status(404).json({ success: false, message: 'Campaign not found' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (!user.favorites) user.favorites = [];
        if (user.favorites.includes(campaignId)) {
            return res.status(409).json({ success: false, message: 'Already in favorites' });
        }

        user.favorites.push(new mongoose.Types.ObjectId(campaignId));
        await user.save();

        return res.status(201).json({
            success: true,
            message: 'Added to favorites',
            data: { campaignId, addedAt: new Date() }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error adding to favorites', error: error.message });
    }
};

/**
 * DELETE /api/favorites/campaigns/:campaignId
 * Remove campaign from favorites
 */
exports.removeCampaignFromFavorites = async (req, res) => {
    try {
        const userId = req.user.id;
        const { campaignId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(campaignId)) {
            return res.status(400).json({ success: false, message: 'Invalid campaign ID' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const index = user.favorites?.indexOf(campaignId);
        if (index === -1 || index === undefined) {
            return res.status(404).json({ success: false, message: 'Not in favorites' });
        }

        user.favorites.splice(index, 1);
        await user.save();

        return res.status(200).json({
            success: true,
            message: 'Removed from favorites'
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error removing from favorites', error: error.message });
    }
};

/**
 * GET /api/favorites/campaigns
 * Get all favorite campaigns
 */
exports.getFavoriteCampaigns = async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 20 } = req.query;
        const skip = (page - 1) * limit;

        const user = await User.findById(userId)
            .populate({
                path: 'favorites',
                model: 'Campaign',
                select: '_id title description budget category status'
            });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const favorites = user.favorites || [];
        const total = favorites.length;
        const paginated = favorites.slice(skip, skip + parseInt(limit));

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
        return res.status(500).json({ success: false, message: 'Error fetching favorites', error: error.message });
    }
};

/**
 * POST /api/saved-influencers/:influencerId
 * Save influencer
 */
exports.saveInfluencer = async (req, res) => {
    try {
        const userId = req.user.id;
        const { influencerId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(influencerId)) {
            return res.status(400).json({ success: false, message: 'Invalid influencer ID' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (!user.savedInfluencers) user.savedInfluencers = [];
        if (user.savedInfluencers.includes(influencerId)) {
            return res.status(409).json({ success: false, message: 'Already saved' });
        }

        user.savedInfluencers.push(new mongoose.Types.ObjectId(influencerId));
        await user.save();

        return res.status(201).json({
            success: true,
            message: 'Influencer saved',
            data: { influencerId, savedAt: new Date() }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error saving influencer', error: error.message });
    }
};

/**
 * DELETE /api/saved-influencers/:influencerId
 * Unsave influencer
 */
exports.unsaveInfluencer = async (req, res) => {
    try {
        const userId = req.user.id;
        const { influencerId } = req.params;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const index = user.savedInfluencers?.indexOf(influencerId);
        if (index === -1 || index === undefined) {
            return res.status(404).json({ success: false, message: 'Not saved' });
        }

        user.savedInfluencers.splice(index, 1);
        await user.save();

        return res.status(200).json({
            success: true,
            message: 'Influencer unsaved'
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error unsaving influencer', error: error.message });
    }
};

/**
 * GET /api/saved-influencers
 * Get all saved influencers
 */
exports.getSavedInfluencers = async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 20 } = req.query;
        const skip = (page - 1) * limit;

        const user = await User.findById(userId)
            .populate({
                path: 'savedInfluencers',
                select: '_id name username avatar followers engagement location'
            });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const saved = user.savedInfluencers || [];
        const total = saved.length;
        const paginated = saved.slice(skip, skip + parseInt(limit));

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
        return res.status(500).json({ success: false, message: 'Error fetching saved influencers', error: error.message });
    }
};

/**
 * GET /api/favorites/check/:type/:id
 * Check if item is favorited
 */
exports.checkIsFavorited = async (req, res) => {
    try {
        const userId = req.user.id;
        const { type, id } = req.params;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        let isFavorited = false;
        if (type === 'campaign' && user.favorites?.includes(id)) {
            isFavorited = true;
        } else if (type === 'influencer' && user.savedInfluencers?.includes(id)) {
            isFavorited = true;
        }

        return res.status(200).json({
            success: true,
            data: { type, id, isFavorited }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error checking favorite status', error: error.message });
    }
};
