const Portfolio = require('../models/portfolio');

exports.createPortfolio = async (req, res) => {
    try {
        const portfolio = await Portfolio.create({ ...req.body, serviceProviderId: req.user.id });
        res.status(201).json({ success: true, data: portfolio });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getAllPortfolios = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const portfolios = await Portfolio.find({ serviceProviderId: req.user.id })
            .skip((page - 1) * limit).limit(parseInt(limit));
        const total = await Portfolio.countDocuments({ serviceProviderId: req.user.id });
        res.json({ success: true, total, page, limit, data: portfolios });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getPortfolioById = async (req, res) => {
    try {
        const portfolio = await Portfolio.findById(req.params.id);
        if (!portfolio) return res.status(404).json({ success: false, message: 'Portfolio not found' });
        res.json({ success: true, data: portfolio });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updatePortfolio = async (req, res) => {
    try {
        const portfolio = await Portfolio.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ success: true, data: portfolio });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deletePortfolio = async (req, res) => {
    try {
        await Portfolio.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Portfolio deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.addClient = async (req, res) => {
    try {
        const portfolio = await Portfolio.findByIdAndUpdate(
            req.params.id,
            { $push: { clients: req.body } },
            { new: true }
        );
        res.json({ success: true, data: portfolio });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateClient = async (req, res) => {
    try {
        const portfolio = await Portfolio.findByIdAndUpdate(
            req.params.id,
            { $set: { 'clients.$[elem]': req.body } },
            { arrayFilters: [{ 'elem._id': req.params.clientId }], new: true }
        );
        res.json({ success: true, data: portfolio });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.removeClient = async (req, res) => {
    try {
        const portfolio = await Portfolio.findByIdAndUpdate(
            req.params.id,
            { $pull: { clients: { _id: req.params.clientId } } },
            { new: true }
        );
        res.json({ success: true, data: portfolio });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getStats = async (req, res) => {
    try {
        const portfolio = await Portfolio.findById(req.params.id);
        if (!portfolio) return res.status(404).json({ success: false, message: 'Portfolio not found' });
        res.json({
            success: true,
            data: {
                averageRating: portfolio.averageRating,
                totalProjects: portfolio.totalProjects,
                totalClients: portfolio.totalClients,
                totalEarnings: portfolio.totalEarnings
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
