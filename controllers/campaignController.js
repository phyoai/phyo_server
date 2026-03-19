const Campaign = require('../models/campaign');

exports.createCampaign = async (req, res) => {
    try {
        const { title, description, budget, type, startDate, endDate, ...rest } = req.body;
        const campaign = await Campaign.create({
            title, description, budget, type, startDate, endDate,
            brandId: req.user.id, ...rest
        });
        res.status(201).json({ success: true, data: campaign });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getAllCampaigns = async (req, res) => {
    try {
        const { page = 1, limit = 10, status, type } = req.query;
        let filter = {};
        if (status) filter.status = status;
        if (type) filter.type = type;
        const campaigns = await Campaign.find(filter).skip((page - 1) * limit).limit(parseInt(limit));
        const total = await Campaign.countDocuments(filter);
        res.json({ success: true, total, page, limit, data: campaigns });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getMyCampaigns = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const campaigns = await Campaign.find({ brandId: req.user.id })
            .skip((page - 1) * limit).limit(parseInt(limit));
        const total = await Campaign.countDocuments({ brandId: req.user.id });
        res.json({ success: true, total, page, limit, data: campaigns });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getCampaignById = async (req, res) => {
    try {
        const campaign = await Campaign.findById(req.params.id);
        if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });
        res.json({ success: true, data: campaign });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateCampaign = async (req, res) => {
    try {
        const campaign = await Campaign.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ success: true, data: campaign });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteCampaign = async (req, res) => {
    try {
        await Campaign.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Campaign deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.applyToCampaign = async (req, res) => {
    try {
        const campaign = await Campaign.findById(req.params.id);
        if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });

        campaign.applications.push({ influencerId: req.user.id, status: 'PENDING' });
        await campaign.save();
        res.json({ success: true, message: 'Applied to campaign', data: campaign });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.selectInfluencer = async (req, res) => {
    try {
        const { influencerId } = req.body;
        const campaign = await Campaign.findById(req.params.id);
        if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });

        campaign.selectedInfluencers.push({ influencerId, status: 'PENDING' });
        await campaign.save();
        res.json({ success: true, message: 'Influencer selected', data: campaign });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
