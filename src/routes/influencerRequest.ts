import express from 'express';
import {
  submitInfluencerRegistration,
  getAllInfluencerRequests,
  getInfluencerRequest,
  approveInfluencerRequest,
  rejectInfluencerRequest,
  getInfluencerRequestStats,
  updateInfluencerProfile,
  getInfluencerProfile
} from '../controllers/influencerRequest';
import { authenticateAdmin, authenticateAdminKey } from '../middleware/admin';
import { authenticateToken, optionalAuth } from '../middleware/auth';
import { uploadInfluencerFiles } from '../middleware/fileUpload';

const router = express.Router();

// Public/Authenticated route for influencer registration submission
// Supports both authenticated users (USER to INFLUENCER conversion) and non-authenticated users (new influencer)
router.post('/submit', optionalAuth, uploadInfluencerFiles, submitInfluencerRegistration);

// Influencer user routes (protected with JWT authentication)
router.get('/profile', authenticateToken, getInfluencerProfile);
router.put('/profile', authenticateToken, uploadInfluencerFiles, updateInfluencerProfile);

// Admin routes (protected with JWT admin authentication)
router.get('/admin/requests', authenticateAdmin, getAllInfluencerRequests);
router.get('/admin/requests/stats', authenticateAdmin, getInfluencerRequestStats);
router.get('/admin/requests/:id', authenticateAdmin, getInfluencerRequest);
router.put('/admin/requests/:id/approve', authenticateAdmin, approveInfluencerRequest);
router.put('/admin/requests/:id/reject', authenticateAdmin, rejectInfluencerRequest);

// Emergency access routes (using admin key - for development/backup)
router.get('/emergency/requests', authenticateAdminKey, getAllInfluencerRequests);
router.get('/emergency/requests/stats', authenticateAdminKey, getInfluencerRequestStats);
router.get('/emergency/requests/:id', authenticateAdminKey, getInfluencerRequest);
router.put('/emergency/requests/:id/approve', authenticateAdminKey, approveInfluencerRequest);
router.put('/emergency/requests/:id/reject', authenticateAdminKey, rejectInfluencerRequest);

export default router;
