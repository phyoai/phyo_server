const jwt = require('jsonwebtoken');
const { user } = require('../models/auth');

const authMiddleware = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1] || req.cookies?.authtoken;

        if (!token) {
            return res.status(401).json({ success: false, message: 'No token provided' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

        // Validate tokenVersion to ensure token hasn't been invalidated by logout
        const dbUser = await user.findById(decoded.id).select('tokenVersion');
        if (!dbUser) {
            return res.status(401).json({ success: false, message: 'User not found' });
        }

        if (decoded.tokenVersion !== dbUser.tokenVersion) {
            return res.status(401).json({ success: false, message: 'Token has been invalidated. Please login again.' });
        }

        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
};

module.exports = authMiddleware;
