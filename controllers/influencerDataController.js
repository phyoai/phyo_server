const influencer = require('../models/influencer');

exports.createInfluencer = async (req, res) => {
    try {
        const newInfluencer = await influencer.create(req.body);
        res.status(201).json({ success: true, data: newInfluencer });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getAllInfluencers = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const influencers = await influencer.find()
            .skip((page - 1) * limit).limit(parseInt(limit));
        const total = await influencer.countDocuments();
        res.json({ success: true, total, page, limit, data: influencers });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.searchInfluencers = async (req, res) => {
    try {
        const { q, page = 1, limit = 10 } = req.query;
        let filter = {};
        if (q) filter.$or = [{ user_name: { $regex: q, $options: 'i' } }, { profile_name: { $regex: q, $options: 'i' } }];

        const influencers = await influencer.find(filter)
            .skip((page - 1) * limit).limit(parseInt(limit));
        const total = await influencer.countDocuments(filter);
        res.json({ success: true, total, page, limit, data: influencers });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.searchByName = async (req, res) => {
    try {
        const { name, page = 1, limit = 10 } = req.query;
        const influencers = await influencer.find({ profile_name: { $regex: name, $options: 'i' } })
            .skip((page - 1) * limit).limit(parseInt(limit));
        const total = await influencer.countDocuments({ profile_name: { $regex: name, $options: 'i' } });
        res.json({ success: true, total, page, limit, data: influencers });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.searchByUsername = async (req, res) => {
    try {
        const { username, page = 1, limit = 10 } = req.query;
        const influencers = await influencer.find({ user_name: { $regex: username, $options: 'i' } })
            .skip((page - 1) * limit).limit(parseInt(limit));
        const total = await influencer.countDocuments({ user_name: { $regex: username, $options: 'i' } });
        res.json({ success: true, total, page, limit, data: influencers });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.advancedSearch = async (req, res) => {
    try {
        const { categoryInstagram, city, minFollowers, maxFollowers, page = 1, limit = 10 } = req.query;
        let filter = {};
        if (categoryInstagram) filter.categoryInstagram = categoryInstagram;
        if (city) filter.city = city;
        if (minFollowers || maxFollowers) {
            filter['instagramData.followers'] = {};
            if (minFollowers) filter['instagramData.followers'].$gte = parseInt(minFollowers);
            if (maxFollowers) filter['instagramData.followers'].$lte = parseInt(maxFollowers);
        }

        const influencers = await influencer.find(filter)
            .skip((page - 1) * limit).limit(parseInt(limit));
        const total = await influencer.countDocuments(filter);
        res.json({ success: true, total, page, limit, data: influencers });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getInfluencerById = async (req, res) => {
    try {
        const inf = await influencer.findById(req.params.id);
        if (!inf) return res.status(404).json({ success: false, message: 'Influencer not found' });
        res.json({ success: true, data: inf });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getInfluencerByUsername = async (req, res) => {
    try {
        const inf = await influencer.findOne({ user_name: req.params.username });
        if (!inf) return res.status(404).json({ success: false, message: 'Influencer not found' });
        res.json({ success: true, data: inf });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateInfluencerById = async (req, res) => {
    try {
        const inf = await influencer.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ success: true, data: inf });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateInfluencerByUsername = async (req, res) => {
    try {
        const inf = await influencer.findOneAndUpdate({ user_name: req.params.username }, req.body, { new: true });
        res.json({ success: true, data: inf });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteInfluencerById = async (req, res) => {
    try {
        await influencer.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Influencer deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteInfluencerByUsername = async (req, res) => {
    try {
        await influencer.findOneAndDelete({ user_name: req.params.username });
        res.json({ success: true, message: 'Influencer deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getStatistics = async (req, res) => {
    try {
        const total = await influencer.countDocuments();
        const avgFollowers = await influencer.aggregate([
            { $group: { _id: null, avg: { $avg: '$instagramData.followers' } } }
        ]);
        const byCategory = await influencer.aggregate([
            { $group: { _id: '$categoryInstagram', count: { $sum: 1 } } }
        ]);
        res.json({
            success: true,
            data: {
                totalInfluencers: total,
                avgFollowers: avgFollowers[0]?.avg || 0,
                byCategory
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
