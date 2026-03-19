const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const {
    createBrandRequest,
    getAllBrandRequests,
    getBrandRequestById,
    getBrandRequestByEmail,
    updateBrandRequest,
    approveBrandRequest,
    rejectBrandRequest,
    deleteBrandRequest,
    searchBrandRequests,
    getBrandRequestStats
} = require('../controllers/brandRequestController');

// Public routes
router.post('/', createBrandRequest);
router.get('/search/email', getBrandRequestByEmail);

// Admin routes
router.get('/', authMiddleware, adminMiddleware, getAllBrandRequests);
router.get('/stats', authMiddleware, adminMiddleware, getBrandRequestStats);
router.get('/search', authMiddleware, adminMiddleware, searchBrandRequests);
router.get('/:id', authMiddleware, adminMiddleware, getBrandRequestById);
router.patch('/:id', authMiddleware, adminMiddleware, updateBrandRequest);
router.patch('/:id/approve', authMiddleware, adminMiddleware, approveBrandRequest);
router.patch('/:id/reject', authMiddleware, adminMiddleware, rejectBrandRequest);
router.delete('/:id', authMiddleware, adminMiddleware, deleteBrandRequest);

module.exports = router;
