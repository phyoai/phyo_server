const Project = require('../models/project');

exports.createProject = async (req, res) => {
    try {
        const project = await Project.create({ ...req.body, serviceProviderId: req.user.id });
        res.status(201).json({ success: true, data: project });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getAllProjects = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const projects = await Project.find({ serviceProviderId: req.user.id })
            .skip((page - 1) * limit).limit(parseInt(limit));
        const total = await Project.countDocuments({ serviceProviderId: req.user.id });
        res.json({ success: true, total, page, limit, data: projects });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getProjectById = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
        res.json({ success: true, data: project });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateProject = async (req, res) => {
    try {
        const project = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ success: true, data: project });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteProject = async (req, res) => {
    try {
        await Project.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Project deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getProjectStats = async (req, res) => {
    try {
        const total = await Project.countDocuments({ serviceProviderId: req.user.id });
        const completed = await Project.countDocuments({ serviceProviderId: req.user.id, status: 'COMPLETED' });
        const inProgress = await Project.countDocuments({ serviceProviderId: req.user.id, status: 'IN_PROGRESS' });
        res.json({ success: true, data: { total, completed, inProgress } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
