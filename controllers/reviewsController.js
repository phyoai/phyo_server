const User = require('../models/auth');
const Campaign = require('../models/campaign');
const mongoose = require('mongoose');

/**
 * POST /api/reviews/influencers/:influencerId
 * Review an influencer (by brand)
 */
exports.reviewInfluencer = async (req, res) => {
    try {
        const brandId = req.user.id;
        const { influencerId } = req.params;
        const { rating, comment, campaignId } = req.body;

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
        }

        if (!mongoose.Types.ObjectId.isValid(influencerId)) {
            return res.status(400).json({ success: false, message: 'Invalid influencer ID' });
        }

        const influencer = await User.findById(influencerId);
        if (!influencer) {
            return res.status(404).json({ success: false, message: 'Influencer not found' });
        }

        const review = {
            _id: new mongoose.Types.ObjectId(),
            brandId: new mongoose.Types.ObjectId(brandId),
            rating: parseInt(rating),
            comment: comment || '',
            campaignId: campaignId ? new mongoose.Types.ObjectId(campaignId) : null,
            createdAt: new Date(),
            verified: true
        };

        if (!influencer.reviews) influencer.reviews = [];
        influencer.reviews.push(review);

        // Calculate average rating
        const avgRating = influencer.reviews.reduce((sum, r) => sum + r.rating, 0) / influencer.reviews.length;
        influencer.averageRating = avgRating;

        await influencer.save();

        return res.status(201).json({
            success: true,
            message: 'Review submitted successfully',
            data: review
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error submitting review', error: error.message });
    }
};

/**
 * GET /api/reviews/influencers/:influencerId
 * Get influencer reviews
 */
exports.getInfluencerReviews = async (req, res) => {
    try {
        const { influencerId } = req.params;
        const { page = 1, limit = 10, sortBy = 'recent' } = req.query;
        const skip = (page - 1) * limit;

        if (!mongoose.Types.ObjectId.isValid(influencerId)) {
            return res.status(400).json({ success: false, message: 'Invalid influencer ID' });
        }

        const influencer = await User.findById(influencerId);
        if (!influencer) {
            return res.status(404).json({ success: false, message: 'Influencer not found' });
        }

        let reviews = influencer.reviews || [];

        // Sort reviews
        if (sortBy === 'rating') {
            reviews = reviews.sort((a, b) => b.rating - a.rating);
        } else {
            reviews = reviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }

        const total = reviews.length;
        const paginated = reviews.slice(skip, skip + parseInt(limit));

        return res.status(200).json({
            success: true,
            data: paginated,
            stats: {
                averageRating: influencer.averageRating || 0,
                totalReviews: total,
                ratingDistribution: {
                    '5': reviews.filter(r => r.rating === 5).length,
                    '4': reviews.filter(r => r.rating === 4).length,
                    '3': reviews.filter(r => r.rating === 3).length,
                    '2': reviews.filter(r => r.rating === 2).length,
                    '1': reviews.filter(r => r.rating === 1).length
                }
            },
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error fetching reviews', error: error.message });
    }
};

/**
 * DELETE /api/reviews/:reviewId
 * Delete a review
 */
exports.deleteReview = async (req, res) => {
    try {
        const userId = req.user.id;
        const { reviewId } = req.params;

        // Find and update user with review
        const result = await User.findOneAndUpdate(
            { 'reviews._id': reviewId, 'reviews.brandId': userId },
            { $pull: { reviews: { _id: reviewId } } },
            { new: true }
        );

        if (!result) {
            return res.status(404).json({ success: false, message: 'Review not found or unauthorized' });
        }

        return res.status(200).json({
            success: true,
            message: 'Review deleted successfully'
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error deleting review', error: error.message });
    }
};

/**
 * POST /api/reviews/brands/:brandId
 * Review a brand (by influencer)
 */
exports.reviewBrand = async (req, res) => {
    try {
        const influencerId = req.user.id;
        const { brandId } = req.params;
        const { rating, comment, campaignId } = req.body;

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
        }

        if (!mongoose.Types.ObjectId.isValid(brandId)) {
            return res.status(400).json({ success: false, message: 'Invalid brand ID' });
        }

        const brand = await User.findById(brandId);
        if (!brand || brand.type !== 'BRAND') {
            return res.status(404).json({ success: false, message: 'Brand not found' });
        }

        const review = {
            _id: new mongoose.Types.ObjectId(),
            influencerId: new mongoose.Types.ObjectId(influencerId),
            rating: parseInt(rating),
            comment: comment || '',
            campaignId: campaignId ? new mongoose.Types.ObjectId(campaignId) : null,
            createdAt: new Date(),
            verified: true
        };

        if (!brand.brandReviews) brand.brandReviews = [];
        brand.brandReviews.push(review);

        const avgRating = brand.brandReviews.reduce((sum, r) => sum + r.rating, 0) / brand.brandReviews.length;
        brand.brandAverageRating = avgRating;

        await brand.save();

        return res.status(201).json({
            success: true,
            message: 'Review submitted successfully',
            data: review
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error submitting review', error: error.message });
    }
};

/**
 * GET /api/reviews/brands/:brandId
 * Get brand reviews
 */
exports.getBrandReviews = async (req, res) => {
    try {
        const { brandId } = req.params;
        const { page = 1, limit = 10 } = req.query;
        const skip = (page - 1) * limit;

        if (!mongoose.Types.ObjectId.isValid(brandId)) {
            return res.status(400).json({ success: false, message: 'Invalid brand ID' });
        }

        const brand = await User.findById(brandId);
        if (!brand) {
            return res.status(404).json({ success: false, message: 'Brand not found' });
        }

        const reviews = brand.brandReviews || [];
        const total = reviews.length;
        const paginated = reviews.slice(skip, skip + parseInt(limit));

        return res.status(200).json({
            success: true,
            data: paginated,
            stats: {
                averageRating: brand.brandAverageRating || 0,
                totalReviews: total
            },
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error fetching reviews', error: error.message });
    }
};

/**
 * GET /api/reviews/my-reviews
 * Get my reviews (as a reviewer)
 */
exports.getMyReviews = async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 20 } = req.query;
        const skip = (page - 1) * limit;

        // Get all influencer reviews by this user
        const influencerReviews = await User.find(
            { 'reviews.brandId': userId, type: 'INFLUENCER' },
            { 'reviews.$': 1, _id: 1, name: 1 }
        ).skip(skip).limit(parseInt(limit));

        return res.status(200).json({
            success: true,
            data: influencerReviews,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: influencerReviews.length
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error fetching my reviews', error: error.message });
    }
};
