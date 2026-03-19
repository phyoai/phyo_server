const InfluencerRequest = require('../models/influencerRequest');
const { user } = require('../models/auth');

// CREATE - Influencer Request
exports.createInfluencerRequest = async (req, res) => {
    try {
        const { full_name, stage_name, email, ...rest } = req.body;

        const influencerRequest = await InfluencerRequest.create({
            full_name,
            stage_name,
            contact: { email },
            status: 'PENDING',
            isUserConversion: !!req.user?.id,
            userId: req.user?.id,
            ...rest
        });

        res.status(201).json({ success: true, data: influencerRequest });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// READ - Get All Influencer Requests
exports.getAllInfluencerRequests = async (req, res) => {
    try {
        const { page = 1, limit = 10, status = 'PENDING' } = req.query;

        const requests = await InfluencerRequest.find({ status })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .sort({ created_at: -1 });

        const total = await InfluencerRequest.countDocuments({ status });

        res.json({ success: true, total, page, limit, data: requests });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// READ - Get Single Influencer Request
exports.getInfluencerRequestById = async (req, res) => {
    try {
        const influencerRequest = await InfluencerRequest.findById(req.params.id);

        if (!influencerRequest) {
            return res.status(404).json({ success: false, message: 'Influencer request not found' });
        }

        res.json({ success: true, data: influencerRequest });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// READ - Get Influencer Request by Email
exports.getInfluencerRequestByEmail = async (req, res) => {
    try {
        const { email } = req.query;

        const influencerRequest = await InfluencerRequest.findOne({ 'contact.email': email });

        if (!influencerRequest) {
            return res.status(404).json({ success: false, message: 'Influencer request not found' });
        }

        res.json({ success: true, data: influencerRequest });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// READ - Get Influencer Request by Username
exports.getInfluencerRequestByUsername = async (req, res) => {
    try {
        const { username } = req.query;

        const influencerRequest = await InfluencerRequest.findOne({ 'social_media.instagram.username': username });

        if (!influencerRequest) {
            return res.status(404).json({ success: false, message: 'Influencer request not found' });
        }

        res.json({ success: true, data: influencerRequest });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// UPDATE - Update Influencer Request
exports.updateInfluencerRequest = async (req, res) => {
    try {
        const influencerRequest = await InfluencerRequest.findByIdAndUpdate(req.params.id, req.body, { new: true });

        if (!influencerRequest) {
            return res.status(404).json({ success: false, message: 'Influencer request not found' });
        }

        res.json({ success: true, data: influencerRequest });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// UPDATE - Approve Influencer Request
exports.approveInfluencerRequest = async (req, res) => {
    try {
        const { admin_notes } = req.body;
        const influencerRequest = await InfluencerRequest.findByIdAndUpdate(
            req.params.id,
            {
                status: 'APPROVED',
                admin_notes,
                reviewed_at: new Date(),
                reviewed_by: req.user?.id || 'admin'
            },
            { new: true }
        );

        if (!influencerRequest) {
            return res.status(404).json({ success: false, message: 'Influencer request not found' });
        }

        // Update user approval status
        if (influencerRequest.userId) {
            await user.findByIdAndUpdate(influencerRequest.userId, { isApproved: true });
        }

        res.json({ success: true, message: 'Influencer request approved', data: influencerRequest });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// UPDATE - Reject Influencer Request
exports.rejectInfluencerRequest = async (req, res) => {
    try {
        const { admin_notes } = req.body;
        const influencerRequest = await InfluencerRequest.findByIdAndUpdate(
            req.params.id,
            {
                status: 'REJECTED',
                admin_notes,
                reviewed_at: new Date(),
                reviewed_by: req.user?.id || 'admin'
            },
            { new: true }
        );

        if (!influencerRequest) {
            return res.status(404).json({ success: false, message: 'Influencer request not found' });
        }

        res.json({ success: true, message: 'Influencer request rejected', data: influencerRequest });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// DELETE - Delete Influencer Request
exports.deleteInfluencerRequest = async (req, res) => {
    try {
        const influencerRequest = await InfluencerRequest.findByIdAndDelete(req.params.id);

        if (!influencerRequest) {
            return res.status(404).json({ success: false, message: 'Influencer request not found' });
        }

        res.json({ success: true, message: 'Influencer request deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// SEARCH - Search Influencer Requests
exports.searchInfluencerRequests = async (req, res) => {
    try {
        const { q, page = 1, limit = 10 } = req.query;

        let filter = {};
        if (q) {
            filter.$or = [
                { full_name: { $regex: q, $options: 'i' } },
                { stage_name: { $regex: q, $options: 'i' } },
                { 'contact.email': { $regex: q, $options: 'i' } },
                { 'social_media.instagram.username': { $regex: q, $options: 'i' } }
            ];
        }

        const requests = await InfluencerRequest.find(filter)
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await InfluencerRequest.countDocuments(filter);

        res.json({ success: true, total, page, limit, data: requests });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ADVANCED SEARCH - Filter by Criteria
exports.advancedSearchInfluencers = async (req, res) => {
    try {
        const { niches, minFollowers, maxFollowers, countries, page = 1, limit = 10 } = req.query;

        let filter = {};

        if (niches) {
            filter.niches = { $in: Array.isArray(niches) ? niches : [niches] };
        }

        if (minFollowers || maxFollowers) {
            filter['auto_fetched_data.follower_counts.instagram'] = {};
            if (minFollowers) filter['auto_fetched_data.follower_counts.instagram'].$gte = parseInt(minFollowers);
            if (maxFollowers) filter['auto_fetched_data.follower_counts.instagram'].$lte = parseInt(maxFollowers);
        }

        if (countries) {
            filter['location.country'] = { $in: Array.isArray(countries) ? countries : [countries] };
        }

        const requests = await InfluencerRequest.find(filter)
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await InfluencerRequest.countDocuments(filter);

        res.json({ success: true, total, page, limit, data: requests });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// STATS - Get Statistics
exports.getInfluencerRequestStats = async (req, res) => {
    try {
        const total = await InfluencerRequest.countDocuments();
        const pending = await InfluencerRequest.countDocuments({ status: 'PENDING' });
        const approved = await InfluencerRequest.countDocuments({ status: 'APPROVED' });
        const rejected = await InfluencerRequest.countDocuments({ status: 'REJECTED' });

        const byNiche = await InfluencerRequest.aggregate([
            { $unwind: '$niches' },
            { $group: { _id: '$niches', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        const avgFollowers = await InfluencerRequest.aggregate([
            { $group: { _id: null, avg: { $avg: '$auto_fetched_data.follower_counts.instagram' } } }
        ]);

        res.json({
            success: true,
            data: {
                total,
                pending,
                approved,
                rejected,
                byNiche,
                avgFollowers: avgFollowers[0]?.avg || 0
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
