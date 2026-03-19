const adminMiddleware = (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }

        if (req.user.role !== 'admin' && !req.user.isAdmin) {
            return res.status(403).json({ success: false, message: 'Admin access required' });
        }

        next();
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = adminMiddleware;
