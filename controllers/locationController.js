const Influencer = require('../models/influencer');
const Campaign = require('../models/campaign');
const User = require('../models/auth');
const mongoose = require('mongoose');

/**
 * GET /api/influencers/nearby
 * Find influencers by geographic proximity
 */
exports.getNearbyInfluencers = async (req, res) => {
    try {
        const {
            latitude,
            longitude,
            radius = 50,
            limit = 20,
            category,
            minFollowers = 0,
            minEngagement = 0,
            page = 1
        } = req.query;

        if (!latitude || !longitude) {
            return res.status(400).json({
                success: false,
                message: 'latitude and longitude are required'
            });
        }

        const skip = (page - 1) * limit;
        const lat = parseFloat(latitude);
        const lon = parseFloat(longitude);

        let filter = {
            isApproved: true,
            instagramFollowers: { $gte: parseInt(minFollowers) },
            averageEngagement: { $gte: parseFloat(minEngagement) }
        };

        if (category) {
            filter.categoryInstagram = category;
        }

        // GEOSPATIAL QUERY
        const influencers = await Influencer.find({
            ...filter,
            'location.coordinates': {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [lon, lat]
                    },
                    $maxDistance: parseInt(radius) * 1000 // Convert km to meters
                }
            }
        })
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

        // CALCULATE DISTANCE FOR EACH
        const enrichedInfluencers = influencers.map(inf => {
            const dLat = (inf.location?.coordinates?.[1] || 0) - lat;
            const dLon = (inf.location?.coordinates?.[0] || 0) - lon;
            const distance = Math.sqrt(dLat * dLat + dLon * dLon) * 111;

            return {
                _id: inf._id,
                id: inf._id,
                name: inf.name,
                username: inf.username,
                avatar: inf.avatar,
                followers: inf.instagramFollowers || 0,
                engagement: inf.averageEngagement || 0,
                category: inf.categoryInstagram,
                location: {
                    city: inf.location?.city,
                    state: inf.location?.state,
                    country: inf.location?.country,
                    coordinates: {
                        latitude: inf.location?.coordinates?.[1],
                        longitude: inf.location?.coordinates?.[0]
                    }
                },
                distance: Math.round(distance * 10) / 10,
                platforms: {
                    instagram: inf.instagramFollowers || 0,
                    youtube: inf.youtubeFollowers || 0,
                    twitter: inf.twitterFollowers || 0
                }
            };
        });

        const total = await Influencer.countDocuments({
            ...filter,
            'location.coordinates': {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [lon, lat]
                    },
                    $maxDistance: parseInt(radius) * 1000
                }
            }
        });

        return res.status(200).json({
            success: true,
            data: enrichedInfluencers,
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
            message: 'Error fetching nearby influencers',
            error: error.message
        });
    }
};

/**
 * GET /api/influencers/location/search
 * Search influencers by location
 */
exports.searchInfluencersByLocation = async (req, res) => {
    try {
        const { city, state, country, zipCode, limit = 20, page = 1, category } = req.query;

        const skip = (page - 1) * limit;
        let filter = { isApproved: true };

        if (city) filter['location.city'] = { $regex: city, $options: 'i' };
        if (state) filter['location.state'] = { $regex: state, $options: 'i' };
        if (country) filter['location.country'] = { $regex: country, $options: 'i' };
        if (category) filter.categoryInstagram = category;

        const influencers = await Influencer.find(filter)
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        const total = await Influencer.countDocuments(filter);

        const enriched = influencers.map(inf => ({
            _id: inf._id,
            id: inf._id,
            name: inf.name,
            username: inf.username,
            avatar: inf.avatar,
            followers: inf.instagramFollowers || 0,
            engagement: inf.averageEngagement || 0,
            category: inf.categoryInstagram,
            location: {
                city: inf.location?.city,
                state: inf.location?.state,
                country: inf.location?.country,
                coordinates: {
                    latitude: inf.location?.coordinates?.[1],
                    longitude: inf.location?.coordinates?.[0]
                }
            },
            platforms: {
                instagram: inf.instagramFollowers || 0,
                youtube: inf.youtubeFollowers || 0,
                twitter: inf.twitterFollowers || 0
            }
        }));

        return res.status(200).json({
            success: true,
            data: enriched,
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
            message: 'Error searching influencers by location',
            error: error.message
        });
    }
};

/**
 * GET /api/brands/nearby
 * Find brands by geographic proximity
 */
exports.getNearbyBrands = async (req, res) => {
    try {
        const { latitude, longitude, radius = 100, limit = 15, industry, page = 1 } = req.query;

        if (!latitude || !longitude) {
            return res.status(400).json({
                success: false,
                message: 'latitude and longitude are required'
            });
        }

        const skip = (page - 1) * limit;
        const lat = parseFloat(latitude);
        const lon = parseFloat(longitude);

        let filter = { type: 'BRAND', isApproved: true };
        if (industry) filter.industry = industry;

        const brands = await User.find({
            ...filter,
            'location.coordinates': {
                $near: {
                    $geometry: { type: 'Point', coordinates: [lon, lat] },
                    $maxDistance: parseInt(radius) * 1000
                }
            }
        })
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

        const enrichedBrands = await Promise.all(brands.map(async (brand) => {
            const campaigns = await Campaign.find({ brandId: brand._id }).lean();
            const dLat = (brand.location?.coordinates?.[1] || 0) - lat;
            const dLon = (brand.location?.coordinates?.[0] || 0) - lon;
            const distance = Math.sqrt(dLat * dLat + dLon * dLon) * 111;

            return {
                _id: brand._id,
                id: brand._id,
                name: brand.name,
                companyName: brand.companyName,
                avatar: brand.avatar,
                location: {
                    city: brand.location?.city,
                    state: brand.location?.state,
                    country: brand.location?.country,
                    address: brand.location?.address,
                    coordinates: {
                        latitude: brand.location?.coordinates?.[1],
                        longitude: brand.location?.coordinates?.[0]
                    }
                },
                distance: Math.round(distance * 10) / 10,
                industry: brand.industry,
                activeCampaigns: campaigns.filter(c => c.status === 'ACTIVE').length,
                totalBudget: campaigns.reduce((sum, c) => sum + (c.budget || 0), 0)
            };
        }));

        const total = await User.countDocuments({
            ...filter,
            'location.coordinates': {
                $near: {
                    $geometry: { type: 'Point', coordinates: [lon, lat] },
                    $maxDistance: parseInt(radius) * 1000
                }
            }
        });

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
            message: 'Error fetching nearby brands',
            error: error.message
        });
    }
};

/**
 * GET /api/brands/location/search
 * Search brands by location
 */
exports.searchBrandsByLocation = async (req, res) => {
    try {
        const { city, state, country, industry, limit = 15, page = 1 } = req.query;

        const skip = (page - 1) * limit;
        let filter = { type: 'BRAND', isApproved: true };

        if (city) filter['location.city'] = { $regex: city, $options: 'i' };
        if (state) filter['location.state'] = { $regex: state, $options: 'i' };
        if (country) filter['location.country'] = { $regex: country, $options: 'i' };
        if (industry) filter.industry = industry;

        const brands = await User.find(filter).skip(skip).limit(parseInt(limit)).lean();
        const total = await User.countDocuments(filter);

        const enriched = await Promise.all(brands.map(async (brand) => {
            const campaigns = await Campaign.find({ brandId: brand._id }).lean();
            return {
                _id: brand._id,
                id: brand._id,
                name: brand.name,
                companyName: brand.companyName,
                avatar: brand.avatar,
                location: {
                    city: brand.location?.city,
                    state: brand.location?.state,
                    country: brand.location?.country,
                    address: brand.location?.address,
                    coordinates: {
                        latitude: brand.location?.coordinates?.[1],
                        longitude: brand.location?.coordinates?.[0]
                    }
                },
                industry: brand.industry,
                activeCampaigns: campaigns.filter(c => c.status === 'ACTIVE').length,
                totalBudget: campaigns.reduce((sum, c) => sum + (c.budget || 0), 0)
            };
        }));

        return res.status(200).json({
            success: true,
            data: enriched,
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
            message: 'Error searching brands by location',
            error: error.message
        });
    }
};

/**
 * GET /api/campaigns/nearby
 * Find active campaigns by brand location proximity
 */
exports.getNearbyActiveCampaigns = async (req, res) => {
    try {
        const { latitude, longitude, radius = 100, limit = 12, category, minBudget = 0, maxBudget = Number.MAX_SAFE_INTEGER, page = 1 } = req.query;

        if (!latitude || !longitude) {
            return res.status(400).json({
                success: false,
                message: 'latitude and longitude are required'
            });
        }

        const skip = (page - 1) * limit;
        const lat = parseFloat(latitude);
        const lon = parseFloat(longitude);

        let filter = {
            status: { $in: ['ACTIVE', 'LIVE'] },
            budget: { $gte: parseInt(minBudget), $lte: parseInt(maxBudget) }
        };
        if (category) filter.category = category;

        const campaigns = await Campaign.find(filter)
            .populate('brandId', 'location name companyName avatar')
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        const enrichedCampaigns = campaigns.map(camp => {
            const brandLat = camp.brandId?.location?.coordinates?.[1] || 0;
            const brandLon = camp.brandId?.location?.coordinates?.[0] || 0;
            const dLat = brandLat - lat;
            const dLon = brandLon - lon;
            const distance = Math.sqrt(dLat * dLat + dLon * dLon) * 111;

            return {
                _id: camp._id,
                title: camp.title,
                description: camp.description,
                brand: {
                    id: camp.brandId?._id,
                    name: camp.brandId?.name,
                    location: {
                        city: camp.brandId?.location?.city,
                        state: camp.brandId?.location?.state,
                        coordinates: {
                            latitude: brandLat,
                            longitude: brandLon
                        }
                    }
                },
                budget: camp.budget,
                category: camp.category || [],
                daysLeft: camp.endDate ? Math.ceil((new Date(camp.endDate) - new Date()) / (1000 * 60 * 60 * 24)) : 0,
                distance: Math.round(distance * 10) / 10,
                applications: camp.applicationCount || 0,
                acceptedInfluencers: camp.selectedInfluencersCount || 0,
                productImages: camp.productImages || [],
                status: camp.status === 'ACTIVE' ? 'active' : 'ending_soon'
            };
        });

        const total = await Campaign.countDocuments(filter);

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
            message: 'Error fetching nearby campaigns',
            error: error.message
        });
    }
};

/**
 * POST /api/users/location
 * Update user's location
 */
exports.updateUserLocation = async (req, res) => {
    try {
        const userId = req.user.id;
        const { latitude, longitude, city, state, country, zipCode, isPublic } = req.body;

        if (!latitude || !longitude || !city || !country) {
            return res.status(400).json({
                success: false,
                message: 'latitude, longitude, city, and country are required'
            });
        }

        const user = await User.findByIdAndUpdate(
            userId,
            {
                location: {
                    coordinates: [parseFloat(longitude), parseFloat(latitude)],
                    city,
                    state: state || '',
                    country,
                    zipCode: zipCode || '',
                    isPublic: isPublic !== undefined ? isPublic : false
                }
            },
            { new: true }
        ).select('location');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Location updated successfully',
            location: {
                city: user.location?.city,
                state: user.location?.state,
                country: user.location?.country,
                coordinates: {
                    latitude: user.location?.coordinates?.[1],
                    longitude: user.location?.coordinates?.[0]
                }
            }
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error updating location',
            error: error.message
        });
    }
};

/**
 * GET /api/locations/supported
 * Get list of supported cities/locations
 */
exports.getSupportedLocations = async (req, res) => {
    try {
        const { country, state, search, limit = 50 } = req.query;

        let pipeline = [
            { $match: { 'location.city': { $exists: true, $ne: null } } },
            { $group: {
                _id: {
                    city: '$location.city',
                    state: '$location.state',
                    country: '$location.country'
                },
                count: { $sum: 1 },
                userType: { $push: '$type' }
            }},
            { $sort: { count: -1 } },
            { $limit: parseInt(limit) }
        ];

        if (country) {
            pipeline.unshift({ $match: { 'location.country': { $regex: country, $options: 'i' } } });
        }

        if (state) {
            const matchStage = pipeline[0] || { $match: {} };
            matchStage.$match['location.state'] = { $regex: state, $options: 'i' };
            pipeline[0] = matchStage;
        }

        const locations = await User.aggregate(pipeline);

        const formatted = locations.map((loc, index) => ({
            id: `${loc._id.city}-${loc._id.state || 'N/A'}`,
            city: loc._id.city,
            state: loc._id.state || '',
            country: loc._id.country,
            influencerCount: loc.userType.filter(t => t === 'INFLUENCER').length,
            campaignCount: loc.count,
            coordinates: {
                latitude: 0,
                longitude: 0
            }
        }));

        return res.status(200).json({
            success: true,
            data: formatted
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error fetching supported locations',
            error: error.message
        });
    }
};
