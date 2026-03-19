const Influencer = require('../models/influencer');
const Campaign = require('../models/campaign');
const User = require('../models/auth');
const mongoose = require('mongoose');

/**
 * GET /api/trending/influencers
 * Get trending influencers with engagement metrics
 */
exports.getTrendingInfluencers = async (req, res) => {
    try {
        const {
            limit = 10,
            timeRange = 'week',
            category,
            minEngagement = 0,
            minFollowers = 0,
            sortBy = 'engagement',
            page = 1
        } = req.query;

        const skip = (page - 1) * limit;

        let filter = {
            isApproved: true,
            instagramFollowers: { $gte: parseInt(minFollowers) },
            averageEngagement: { $gte: parseFloat(minEngagement) }
        };

        if (category) {
            filter.categoryInstagram = category;
        }

        let sortOption = {};
        switch (sortBy) {
            case 'followers':
                sortOption = { instagramFollowers: -1 };
                break;
            case 'growth':
                sortOption = { monthlyGrowth: -1 };
                break;
            case 'engagement':
            default:
                sortOption = { averageEngagement: -1 };
        }

        const influencers = await Influencer.find(filter)
            .sort(sortOption)
            .skip(skip)
            .limit(parseInt(limit))
            .select('_id id name username avatar instagramFollowers averageEngagement categoryInstagram platforms monthlyGrowth youtubeFollowers twitterFollowers')
            .lean();

        const total = await Influencer.countDocuments(filter);

        const enrichedInfluencers = influencers.map((inf, index) => ({
            ...inf,
            engagement: inf.averageEngagement || 0,
            engagementTrend: (inf.monthlyGrowth || 0) - ((inf.monthlyGrowth || 0) * 0.1),
            trendingScore: Math.max(0, 100 - (index * (100 / parseInt(limit)))),
            growth: {
                weekly: (inf.monthlyGrowth || 0) / 4,
                monthly: inf.monthlyGrowth || 0,
                quarterly: (inf.monthlyGrowth || 0) * 3
            },
            platforms: {
                instagram: inf.instagramFollowers || 0,
                youtube: inf.youtubeFollowers || 0,
                twitter: inf.twitterFollowers || 0,
                tiktok: 0
            },
            lastActive: new Date()
        }));

        return res.status(200).json({
            success: true,
            data: enrichedInfluencers,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            },
            metadata: {
                timeRange,
                generatedAt: new Date().toISOString()
            }
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error fetching trending influencers',
            error: error.message
        });
    }
};

/**
 * GET /api/trending/campaigns
 * Get trending campaigns
 */
exports.getTrendingCampaigns = async (req, res) => {
    try {
        const {
            limit = 6,
            timeRange = 'week',
            category,
            minBudget = 0,
            sortBy = 'engagement',
            page = 1
        } = req.query;

        const skip = (page - 1) * limit;

        let filter = {
            status: { $in: ['ACTIVE', 'LIVE'] },
            budget: { $gte: parseInt(minBudget) }
        };

        if (category) {
            filter.category = category;
        }

        let sortOption = {};
        switch (sortBy) {
            case 'budget':
                sortOption = { budget: -1 };
                break;
            case 'applications':
                sortOption = { applicationCount: -1 };
                break;
            case 'engagement':
            default:
                sortOption = { engagement: -1 };
        }

        const campaigns = await Campaign.find(filter)
            .sort(sortOption)
            .skip(skip)
            .limit(parseInt(limit))
            .populate('brandId', 'id name companyName avatar email')
            .select('_id title description budget status createdAt endDate productImages category engagement applicationCount selectedInfluencersCount')
            .lean();

        const total = await Campaign.countDocuments(filter);

        const enrichedCampaigns = campaigns.map((camp, index) => ({
            _id: camp._id,
            title: camp.title,
            description: camp.description,
            brand: {
                id: camp.brandId?._id,
                name: camp.brandId?.name,
                companyName: camp.brandId?.companyName,
                avatar: camp.brandId?.avatar
            },
            budget: camp.budget,
            applications: camp.applicationCount || 0,
            acceptedInfluencers: camp.selectedInfluencersCount || 0,
            engagement: camp.engagement || 0,
            category: camp.category || [],
            trendingRank: index + 1,
            status: camp.status === 'ACTIVE' ? 'active' : (camp.status === 'ENDING_SOON' ? 'ending_soon' : 'completed'),
            daysLeft: camp.endDate ? Math.ceil((new Date(camp.endDate) - new Date()) / (1000 * 60 * 60 * 24)) : 0,
            productImages: camp.productImages || [],
            createdAt: camp.createdAt
        }));

        return res.status(200).json({
            success: true,
            data: enrichedCampaigns,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error fetching trending campaigns',
            error: error.message
        });
    }
};

/**
 * GET /api/trending/brands
 * Get trending brands
 */
exports.getTrendingBrands = async (req, res) => {
    try {
        const {
            limit = 8,
            timeRange = 'week',
            sortBy = 'campaigns',
            page = 1
        } = req.query;

        const skip = (page - 1) * limit;

        let sortOption = {};
        switch (sortBy) {
            case 'budget':
                sortOption = { totalSpent: -1 };
                break;
            case 'applications':
                sortOption = { totalApplications: -1 };
                break;
            case 'campaigns':
            default:
                sortOption = { activeCampaigns: -1 };
        }

        const brands = await User.find({ type: 'BRAND', isApproved: true })
            .sort(sortOption)
            .skip(skip)
            .limit(parseInt(limit))
            .select('_id id name companyName avatar email')
            .lean();

        const total = await User.countDocuments({ type: 'BRAND', isApproved: true });

        const enrichedBrands = await Promise.all(brands.map(async (brand, index) => {
            const campaigns = await Campaign.find({ brandId: brand._id }).lean();

            return {
                _id: brand._id,
                id: brand._id,
                name: brand.name,
                companyName: brand.companyName,
                avatar: brand.avatar,
                trendingRank: index + 1,
                activeCampaigns: campaigns.filter(c => c.status === 'ACTIVE').length,
                totalBudget: campaigns.reduce((sum, c) => sum + (c.budget || 0), 0),
                influencersWorkedWith: new Set(campaigns.flatMap(c => c.selectedInfluencers || [])).size,
                recentCampaigns: campaigns.slice(0, 3),
                category: [...new Set(campaigns.flatMap(c => c.category || []))]
            };
        }));

        return res.status(200).json({
            success: true,
            data: enrichedBrands,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error fetching trending brands',
            error: error.message
        });
    }
};

/**
 * GET /api/trending/categories
 * Get trending categories/niches
 */
exports.getTrendingCategories = async (req, res) => {
    try {
        const { timeRange = 'week' } = req.query;

        const campaignCategories = await Campaign.aggregate([
            { $match: { status: { $in: ['ACTIVE', 'LIVE'] } } },
            { $unwind: '$category' },
            { $group: {
                _id: '$category',
                campaignCount: { $sum: 1 },
                totalBudget: { $sum: '$budget' }
            }},
            { $sort: { campaignCount: -1 } },
            { $limit: 20 }
        ]);

        const influencerCategories = await Influencer.aggregate([
            { $match: { isApproved: true } },
            { $group: {
                _id: '$categoryInstagram',
                influencerCount: { $sum: 1 },
                avgEngagement: { $avg: '$averageEngagement' }
            }},
            { $sort: { influencerCount: -1 } },
            { $limit: 20 }
        ]);

        const categories = campaignCategories.map((cat, index) => {
            const influencerData = influencerCategories.find(i => i._id === cat._id) || {};
            return {
                name: cat._id,
                displayName: cat._id.charAt(0).toUpperCase() + cat._id.slice(1),
                influencerCount: influencerData.influencerCount || 0,
                campaignCount: cat.campaignCount,
                trendScore: Math.max(0, 100 - (index * 5)),
                growth: Math.random() * 30,
                icon: '📌'
            };
        });

        return res.status(200).json({
            success: true,
            data: categories
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error fetching trending categories',
            error: error.message
        });
    }
};
