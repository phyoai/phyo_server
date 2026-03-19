const User = require('../models/auth');
const Influencer = require('../models/influencer');
const mongoose = require('mongoose');

/**
 * GET /api/discover/influencers
 * Discover influencers with advanced filters (for brands)
 */
exports.discoverInfluencers = async (req, res) => {
    try {
        const {
            category,
            minFollowers,
            maxFollowers,
            minEngagement,
            platform = 'Instagram',
            city,
            country,
            page = 1,
            limit = 20,
            sortBy = 'followers'
        } = req.query;

        const skip = (page - 1) * limit;
        let query = { type: 'INFLUENCER', isApproved: true, isActive: true };

        if (category) query.categoryInstagram = category;
        if (minFollowers) query.instagramFollowers = { $gte: parseInt(minFollowers) };
        if (maxFollowers) {
            query.instagramFollowers = { ...(query.instagramFollowers || {}), $lte: parseInt(maxFollowers) };
        }
        if (minEngagement) query.averageEngagement = { $gte: parseFloat(minEngagement) };
        if (city) query['location.city'] = { $regex: city, $options: 'i' };
        if (country) query['location.country'] = { $regex: country, $options: 'i' };

        const sortOptions = {};
        switch (sortBy) {
            case 'followers': sortOptions.instagramFollowers = -1; break;
            case 'engagement': sortOptions.averageEngagement = -1; break;
            case 'recent': sortOptions.createdAt = -1; break;
            case 'trending': sortOptions.trendingScore = -1; break;
            default: sortOptions.instagramFollowers = -1;
        }

        const total = await User.countDocuments(query);
        const influencers = await User.find(query)
            .sort(sortOptions)
            .skip(skip)
            .limit(parseInt(limit))
            .select('_id name username email avatar categoryInstagram instagramFollowers youtubeFollowers averageEngagement bio location stats pricing memberSince');

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
        return res.status(500).json({ success: false, message: 'Error discovering influencers', error: error.message });
    }
};

/**
 * GET /api/discover/influencers/:id
 * Get influencer profile details
 */
exports.getInfluencerProfile = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid influencer ID' });
        }

        const influencer = await User.findById(id)
            .select('-password');

        if (!influencer || influencer.type !== 'INFLUENCER') {
            return res.status(404).json({ success: false, message: 'Influencer not found' });
        }

        return res.status(200).json({
            success: true,
            data: {
                _id: influencer._id,
                name: influencer.name,
                username: influencer.username,
                email: influencer.email,
                avatar: influencer.profileImage,
                bio: influencer.biography,
                category: influencer.categoryInstagram,

                followers: {
                    instagram: influencer.instagramFollowers || 0,
                    youtube: influencer.youtubeFollowers || 0,
                    tiktok: influencer.tiktokFollowers || 0
                },

                engagement: {
                    average: influencer.averageEngagement || 0,
                    trend: 'upward' // Can be calculated from historical data
                },

                location: {
                    city: influencer.city,
                    state: influencer.state,
                    country: influencer.country,
                    coordinates: influencer.location?.coordinates
                },

                stats: influencer.stats || {
                    avgEngagement: 0,
                    avgReach: 0,
                    totalCampaigns: 0
                },

                pricing: influencer.pricing || {
                    instagram_post: 0,
                    instagram_story: 0,
                    instagram_reel: 0,
                    youtube_video: 0
                },

                portfolio: influencer.portfolio || [],

                availability: {
                    isAvailable: influencer.availabilityStatus !== 'UNAVAILABLE',
                    status: influencer.availabilityStatus || 'AVAILABLE'
                },

                memberSince: influencer.memberSince || influencer.createdAt,
                lastActive: influencer.updatedAt,
                isVerified: influencer.isApproved
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error fetching influencer profile', error: error.message });
    }
};

/**
 * GET /api/discover/influencers/search
 * Search influencers by keyword, category, location
 */
exports.searchInfluencers = async (req, res) => {
    try {
        const { keyword, category, city, minFollowers, maxFollowers, page = 1, limit = 20 } = req.query;
        const skip = (page - 1) * limit;

        let query = { type: 'INFLUENCER', isApproved: true, isActive: true };

        if (keyword) {
            query.$or = [
                { name: { $regex: keyword, $options: 'i' } },
                { username: { $regex: keyword, $options: 'i' } },
                { biography: { $regex: keyword, $options: 'i' } }
            ];
        }

        if (category) query.categoryInstagram = category;
        if (city) query.city = { $regex: city, $options: 'i' };
        if (minFollowers) query.instagramFollowers = { $gte: parseInt(minFollowers) };
        if (maxFollowers) {
            query.instagramFollowers = { ...(query.instagramFollowers || {}), $lte: parseInt(maxFollowers) };
        }

        const total = await User.countDocuments(query);
        const influencers = await User.find(query)
            .sort({ instagramFollowers: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .select('_id name username avatar categoryInstagram instagramFollowers averageEngagement location');

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
        return res.status(500).json({ success: false, message: 'Error searching influencers', error: error.message });
    }
};

/**
 * GET /api/discover/influencers/category/:category
 * Get top influencers in a category
 */
exports.getInfluencersByCategory = async (req, res) => {
    try {
        const { category } = req.params;
        const { limit = 20, page = 1 } = req.query;
        const skip = (page - 1) * limit;

        const total = await User.countDocuments({
            type: 'INFLUENCER',
            categoryInstagram: category,
            isApproved: true,
            isActive: true
        });

        const influencers = await User.find({
            type: 'INFLUENCER',
            categoryInstagram: category,
            isApproved: true,
            isActive: true
        })
            .sort({ instagramFollowers: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .select('_id name username avatar categoryInstagram instagramFollowers averageEngagement location stats');

        return res.status(200).json({
            success: true,
            data: influencers,
            category: category,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error fetching influencers by category', error: error.message });
    }
};

/**
 * POST /api/discover/influencers/:id/contact
 * Contact an influencer (send message)
 */
exports.contactInfluencer = async (req, res) => {
    try {
        const { id } = req.params;
        const brandId = req.user.id;
        const { subject, message } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid influencer ID' });
        }

        if (!subject || !message) {
            return res.status(400).json({ success: false, message: 'subject and message are required' });
        }

        const influencer = await User.findById(id);
        if (!influencer) {
            return res.status(404).json({ success: false, message: 'Influencer not found' });
        }

        const brand = await User.findById(brandId);
        if (!brand) {
            return res.status(404).json({ success: false, message: 'Brand not found' });
        }

        // Create contact message
        const contactMessage = {
            _id: new mongoose.Types.ObjectId(),
            fromBrandId: new mongoose.Types.ObjectId(brandId),
            fromBrandName: brand.name,
            toInfluencerId: new mongoose.Types.ObjectId(id),
            subject,
            message,
            status: 'SENT',
            sentAt: new Date(),
            readAt: null
        };

        // Store in influencer's messages/contacts
        if (!influencer.brandContacts) influencer.brandContacts = [];
        influencer.brandContacts.push(contactMessage);
        await influencer.save();

        return res.status(201).json({
            success: true,
            message: 'Message sent to influencer',
            data: contactMessage
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error sending message', error: error.message });
    }
};

/**
 * GET /api/discover/categories
 * Get all influencer categories
 */
exports.getAllCategories = async (req, res) => {
    try {
        const categories = await User.distinct('categoryInstagram', {
            type: 'INFLUENCER',
            isApproved: true,
            isActive: true
        });

        // Get count for each category
        const categoriesWithCount = await Promise.all(
            categories.map(async (category) => {
                const count = await User.countDocuments({
                    categoryInstagram: category,
                    type: 'INFLUENCER',
                    isApproved: true,
                    isActive: true
                });
                return {
                    category,
                    count,
                    slug: category.toLowerCase().replace(/\s+/g, '-')
                };
            })
        );

        return res.status(200).json({
            success: true,
            data: categoriesWithCount.sort((a, b) => b.count - a.count)
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error fetching categories', error: error.message });
    }
};

/**
 * GET /api/discover/recommendations
 * Get recommended influencers based on brand preferences
 */
exports.getRecommendedInfluencers = async (req, res) => {
    try {
        const { category, budget, minFollowers = 10000, page = 1, limit = 10 } = req.query;
        const skip = (page - 1) * limit;

        let query = {
            type: 'INFLUENCER',
            isApproved: true,
            isActive: true,
            instagramFollowers: { $gte: parseInt(minFollowers) }
        };

        if (category) query.categoryInstagram = category;

        // Calculate recommendation score
        const influencers = await User.find(query)
            .sort({
                averageEngagement: -1,
                instagramFollowers: -1
            })
            .skip(skip)
            .limit(parseInt(limit))
            .select('_id name username avatar categoryInstagram instagramFollowers averageEngagement location stats pricing');

        // Add recommendation score
        const withScores = influencers.map(inf => ({
            ...inf.toObject(),
            recommendationScore: Math.round((inf.averageEngagement * 10) + (inf.instagramFollowers / 10000))
        }));

        const total = await User.countDocuments(query);

        return res.status(200).json({
            success: true,
            data: withScores,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error fetching recommendations', error: error.message });
    }
};
