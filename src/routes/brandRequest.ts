import express from 'express';
import {
  submitBrandRegistration,
  getAllBrandRequests,
  getBrandRequest,
  approveBrandRequest,
  rejectBrandRequest,
  getBrandRequestStats,
  updateBrandProfile,
  getBrandProfile
} from '../controllers/brandRequest';
import { changeBrandPassword } from '../controllers/brandAuth';
import { handleResendOTP, handleVerifyOTP } from '../controllers/auth';
import { authenticateAdmin, authenticateAdminKey } from '../middleware/admin';
import { authenticateToken, optionalAuth } from '../middleware/auth';
import { uploadBrandFiles } from '../middleware/fileUpload';

const router = express.Router();

// Public/Authenticated route for brand registration submission
// Supports both authenticated users (USER to BRAND conversion) and non-authenticated users (new brand)
// Now supports file uploads too
router.post('/submit', optionalAuth, uploadBrandFiles, submitBrandRegistration);

// Brand user routes (protected with JWT authentication)
router.get('/profile', authenticateToken, getBrandProfile);
router.put('/profile', authenticateToken, uploadBrandFiles, updateBrandProfile);
router.put('/change-password', authenticateToken, changeBrandPassword);
router.post('/send-otp', handleResendOTP);
router.post('/verify-otp', handleVerifyOTP);

// Admin routes (protected with JWT admin authentication)
router.get('/admin/requests', authenticateAdmin, getAllBrandRequests);
router.get('/admin/requests/stats', authenticateAdmin, getBrandRequestStats);
router.get('/admin/requests/:id', authenticateAdmin, getBrandRequest);
router.put('/admin/requests/:id/approve', authenticateAdmin, approveBrandRequest);
router.put('/admin/requests/:id/reject', authenticateAdmin, rejectBrandRequest);

// Emergency access routes (using admin key - for development/backup)
router.get('/emergency/requests', authenticateAdminKey, getAllBrandRequests);
router.get('/emergency/requests/stats', authenticateAdminKey, getBrandRequestStats);
router.get('/emergency/requests/:id', authenticateAdminKey, getBrandRequest);
router.put('/emergency/requests/:id/approve', authenticateAdminKey, approveBrandRequest);
router.put('/emergency/requests/:id/reject', authenticateAdminKey, rejectBrandRequest);

export default router;
