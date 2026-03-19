const BrandRequest = require('../models/brandRequest');
const { user } = require('../models/auth');

// CREATE - Brand Request
exports.createBrandRequest = async (req, res) => {
    try {
        const { company_name, website_url, industry, company_type, location, country, ...rest } = req.body;

        const brandRequest = await BrandRequest.create({
            company_name,
            website_url,
            industry,
            company_type,
            location,
            country,
            account: {
                status: 'PENDING',
                userId: req.user?.id,
                signup_method: req.body.signup_method || 'email',
                isUserConversion: !!req.user?.id
            },
            ...rest
        });

        res.status(201).json({ success: true, data: brandRequest });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// READ - Get All Brand Requests
exports.getAllBrandRequests = async (req, res) => {
    try {
        const { page = 1, limit = 10, status = 'PENDING' } = req.query;

        const requests = await BrandRequest.find({ 'account.status': status })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .sort({ createdAt: -1 });

        const total = await BrandRequest.countDocuments({ 'account.status': status });

        res.json({ success: true, total, page, limit, data: requests });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// READ - Get Single Brand Request
exports.getBrandRequestById = async (req, res) => {
    try {
        const brandRequest = await BrandRequest.findById(req.params.id);

        if (!brandRequest) {
            return res.status(404).json({ success: false, message: 'Brand request not found' });
        }

        res.json({ success: true, data: brandRequest });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// READ - Get Brand Request by Email
exports.getBrandRequestByEmail = async (req, res) => {
    try {
        const { email } = req.query;

        const brandRequest = await BrandRequest.findOne({ 'contact.email': email });

        if (!brandRequest) {
            return res.status(404).json({ success: false, message: 'Brand request not found' });
        }

        res.json({ success: true, data: brandRequest });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// UPDATE - Update Brand Request
exports.updateBrandRequest = async (req, res) => {
    try {
        const brandRequest = await BrandRequest.findByIdAndUpdate(req.params.id, req.body, { new: true });

        if (!brandRequest) {
            return res.status(404).json({ success: false, message: 'Brand request not found' });
        }

        res.json({ success: true, data: brandRequest });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// UPDATE - Approve Brand Request
exports.approveBrandRequest = async (req, res) => {
    try {
        const { admin_notes } = req.body;
        const brandRequest = await BrandRequest.findByIdAndUpdate(
            req.params.id,
            {
                'account.status': 'APPROVED',
                admin_notes,
                reviewed_at: new Date(),
                reviewed_by: req.user?.email || 'admin'
            },
            { new: true }
        );

        if (!brandRequest) {
            return res.status(404).json({ success: false, message: 'Brand request not found' });
        }

        // Create user account if not already converted
        if (brandRequest.account.userId) {
            await user.findByIdAndUpdate(brandRequest.account.userId, { isApproved: true });
        }

        res.json({ success: true, message: 'Brand request approved', data: brandRequest });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// UPDATE - Reject Brand Request
exports.rejectBrandRequest = async (req, res) => {
    try {
        const { admin_notes } = req.body;
        const brandRequest = await BrandRequest.findByIdAndUpdate(
            req.params.id,
            {
                'account.status': 'REJECTED',
                admin_notes,
                reviewed_at: new Date(),
                reviewed_by: req.user?.email || 'admin'
            },
            { new: true }
        );

        if (!brandRequest) {
            return res.status(404).json({ success: false, message: 'Brand request not found' });
        }

        res.json({ success: true, message: 'Brand request rejected', data: brandRequest });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// DELETE - Delete Brand Request
exports.deleteBrandRequest = async (req, res) => {
    try {
        const brandRequest = await BrandRequest.findByIdAndDelete(req.params.id);

        if (!brandRequest) {
            return res.status(404).json({ success: false, message: 'Brand request not found' });
        }

        res.json({ success: true, message: 'Brand request deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// SEARCH - Search Brand Requests
exports.searchBrandRequests = async (req, res) => {
    try {
        const { q, page = 1, limit = 10 } = req.query;

        let filter = {};
        if (q) {
            filter.$or = [
                { company_name: { $regex: q, $options: 'i' } },
                { 'contact.email': { $regex: q, $options: 'i' } },
                { industry: { $regex: q, $options: 'i' } }
            ];
        }

        const requests = await BrandRequest.find(filter)
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await BrandRequest.countDocuments(filter);

        res.json({ success: true, total, page, limit, data: requests });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// STATS - Get Statistics
exports.getBrandRequestStats = async (req, res) => {
    try {
        const total = await BrandRequest.countDocuments();
        const pending = await BrandRequest.countDocuments({ 'account.status': 'PENDING' });
        const approved = await BrandRequest.countDocuments({ 'account.status': 'APPROVED' });
        const rejected = await BrandRequest.countDocuments({ 'account.status': 'REJECTED' });

        const byIndustry = await BrandRequest.aggregate([
            { $group: { _id: '$industry', count: { $sum: 1 } } }
        ]);

        res.json({
            success: true,
            data: {
                total,
                pending,
                approved,
                rejected,
                byIndustry
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
