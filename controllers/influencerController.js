const Influencer = require('../models/influencer');
const User = require('../models/auth');
const mongoose = require('mongoose');

/**
 * GET /api/influencers
 * Get all influencers with filters
 */
exports.getAllInfluencers = async (req, res) => {
    try {
        const { page = 1, limit = 20, category, minFollowers, maxFollowers, minEngagement, sortBy = 'followers' } = req.query;
        const skip = (page - 1) * limit;

        let query = {};

        if (category) query.categoryInstagram = category;
        if (minFollowers) query.instagramFollowers = { $gte: parseInt(minFollowers) };
        if (maxFollowers) {
            query.instagramFollowers = { ...(query.instagramFollowers || {}), $lte: parseInt(maxFollowers) };
        }
        if (minEngagement) query.averageEngagement = { $gte: parseFloat(minEngagement) };

        const sortOptions = {};
        switch (sortBy) {
            case 'followers': sortOptions.instagramFollowers = -1; break;
            case 'engagement': sortOptions.averageEngagement = -1; break;
            case 'recent': sortOptions.createdAt = -1; break;
            default: sortOptions.instagramFollowers = -1;
        }

        const total = await Influencer.countDocuments(query);
        const influencers = await Influencer.find(query)
            .sort(sortOptions)
            .skip(skip)
            .limit(parseInt(limit))
            .select('_id user_name name avatar categoryInstagram instagramFollowers youtubeFollowers averageEngagement stats');

        return res.status(200).json({
            success: true,
            data: influencers,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error fetching influencers', error: error.message });
    }
};

/**
 * POST /api/influencers
 * Create new influencer profile
 */
exports.createInfluencer = async (req, res) => {
    try {
        const { user_name, name, email, categoryInstagram, bio, instagramFollowers, youtubeFollowers, pricing, avatar } = req.body;

        if (!user_name || !categoryInstagram) {
            return res.status(400).json({ success: false, message: 'user_name and categoryInstagram are required' });
        }

        const existingInfluencer = await Influencer.findOne({ user_name });
        if (existingInfluencer) {
            return res.status(409).json({ success: false, message: 'Influencer with this username already exists' });
        }

        const influencer = new Influencer({
            user_name,
            name: name || user_name,
            email,
            categoryInstagram,
            bio: bio || '',
            instagramFollowers: instagramFollowers || 0,
            youtubeFollowers: youtubeFollowers || 0,
            avatar: avatar || null,
            pricing: pricing || {},
            stats: {
                avgEngagement: 0,
                avgReach: 0,
                totalCampaigns: 0
            },
            isApproved: false,
            memberSince: new Date()
        });

        await influencer.save();

        return res.status(201).json({
            success: true,
            message: 'Influencer profile created',
            data: influencer
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error creating influencer', error: error.message });
    }
};

/**
 * GET /api/influencers/:id
 * Get influencer profile by ID
 */
exports.getInfluencerById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid influencer ID' });
        }

        const influencer = await Influencer.findById(id);
        if (!influencer) {
            return res.status(404).json({ success: false, message: 'Influencer not found' });
        }

        return res.status(200).json({ success: true, data: influencer });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error fetching influencer', error: error.message });
    }
};

/**
 * PATCH /api/influencers/:id
 * Update influencer profile
 */
exports.updateInfluencer = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, bio, avatar, pricing, categoryInstagram, instagramFollowers, youtubeFollowers, isApproved } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid influencer ID' });
        }

        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (bio !== undefined) updateData.bio = bio;
        if (avatar !== undefined) updateData.avatar = avatar;
        if (pricing !== undefined) updateData.pricing = pricing;
        if (categoryInstagram !== undefined) updateData.categoryInstagram = categoryInstagram;
        if (instagramFollowers !== undefined) updateData.instagramFollowers = instagramFollowers;
        if (youtubeFollowers !== undefined) updateData.youtubeFollowers = youtubeFollowers;
        if (isApproved !== undefined) updateData.isApproved = isApproved;

        const influencer = await Influencer.findByIdAndUpdate(
            id,
            { ...updateData, updatedAt: new Date() },
            { new: true }
        );

        if (!influencer) {
            return res.status(404).json({ success: false, message: 'Influencer not found' });
        }

        return res.status(200).json({
            success: true,
            message: 'Influencer updated',
            data: influencer
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error updating influencer', error: error.message });
    }
};

/**
 * DELETE /api/influencers/:id
 * Delete influencer profile
 */
exports.deleteInfluencer = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid influencer ID' });
        }

        const influencer = await Influencer.findByIdAndDelete(id);
        if (!influencer) {
            return res.status(404).json({ success: false, message: 'Influencer not found' });
        }

        return res.status(200).json({
            success: true,
            message: 'Influencer deleted',
            data: influencer
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error deleting influencer', error: error.message });
    }
};

/**
 * GET /api/influencers/:id/stats
 * Get influencer statistics
 */
exports.getInfluencerStats = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid influencer ID' });
        }

        const influencer = await Influencer.findById(id).select('stats user_name instagramFollowers averageEngagement');
        if (!influencer) {
            return res.status(404).json({ success: false, message: 'Influencer not found' });
        }

        return res.status(200).json({
            success: true,
            data: {
                influencerId: influencer._id,
                username: influencer.user_name,
                followers: influencer.instagramFollowers,
                engagement: influencer.averageEngagement,
                stats: influencer.stats || {
                    avgEngagement: 0,
                    avgReach: 0,
                    totalCampaigns: 0
                }
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error fetching stats', error: error.message });
    }
};

/**
 * GET /api/influencers/:id/pricing
 * Get influencer pricing information
 */
exports.getInfluencerPricing = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid influencer ID' });
        }

        const influencer = await Influencer.findById(id).select('pricing user_name');
        if (!influencer) {
            return res.status(404).json({ success: false, message: 'Influencer not found' });
        }

        return res.status(200).json({
            success: true,
            data: {
                influencerId: influencer._id,
                username: influencer.user_name,
                pricing: influencer.pricing || {}
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error fetching pricing', error: error.message });
    }
};

/**
 * POST /api/influencers/:id/portfolio
 * Add portfolio item
 */
exports.addPortfolioItem = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, image, link, category } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid influencer ID' });
        }

        if (!title || !image) {
            return res.status(400).json({ success: false, message: 'title and image are required' });
        }

        const influencer = await Influencer.findById(id);
        if (!influencer) {
            return res.status(404).json({ success: false, message: 'Influencer not found' });
        }

        const portfolioItem = {
            _id: new mongoose.Types.ObjectId(),
            title,
            description: description || '',
            image,
            link: link || '',
            category: category || 'work',
            addedAt: new Date()
        };

        if (!influencer.portfolio) influencer.portfolio = [];
        influencer.portfolio.push(portfolioItem);
        await influencer.save();

        return res.status(201).json({
            success: true,
            message: 'Portfolio item added',
            data: portfolioItem
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error adding portfolio item', error: error.message });
    }
};

/**
 * GET /api/influencers/:id/campaigns
 * Get campaigns influencer applied to
 */
exports.getInfluencerCampaigns = async (req, res) => {
    try {
        const { id } = req.params;
        const { page = 1, limit = 10 } = req.query;
        const skip = (page - 1) * limit;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid influencer ID' });
        }

        const influencer = await Influencer.findById(id);
        if (!influencer) {
            return res.status(404).json({ success: false, message: 'Influencer not found' });
        }

        // This would typically join with Campaign model
        // For now, return empty array with proper pagination
        const campaigns = [];
        const total = 0;

        return res.status(200).json({
            success: true,
            data: campaigns,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit) || 1
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error fetching campaigns', error: error.message });
    }
};

/**
 * GET /api/influencers/:id/reviews
 * Get influencer reviews/ratings
 */
exports.getInfluencerReviews = async (req, res) => {
    try {
        const { id } = req.params;
        const { page = 1, limit = 10 } = req.query;
        const skip = (page - 1) * limit;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid influencer ID' });
        }

        const influencer = await Influencer.findById(id);
        if (!influencer) {
            return res.status(404).json({ success: false, message: 'Influencer not found' });
        }

        // Return empty reviews array with proper pagination
        const reviews = [];
        const total = 0;

        return res.status(200).json({
            success: true,
            data: reviews,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit) || 1
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error fetching reviews', error: error.message });
    }
};

/**
 * GET /api/influencers/:username
 * Get influencer by username
 */
exports.getInfluencerByUsername = async (req, res) => {
    try {
        const { username } = req.params;

        const influencer = await Influencer.findOne({ user_name: username });
        if (!influencer) {
            return res.status(404).json({ success: false, message: 'Influencer not found' });
        }

        return res.status(200).json({ success: true, data: influencer });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error fetching influencer', error: error.message });
    }
};
