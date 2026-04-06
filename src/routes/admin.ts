import express from 'express';
import {
  adminLogin,
  getAdminProfile,
  createAdmin,
  getAllAdmins,
  toggleAdminStatus,
  changeAdminPassword,
  getApprovals,
  approveBrand,
  rejectBrand,
  approveInfluencer,
  rejectInfluencer,
  getUsers,
  blockUser,
  unblockUser,
  getSystemStats
} from '../controllers/admin';
import { authenticateAdmin } from '../middleware/admin';

const router = express.Router();

// Public routes
router.post('/login', adminLogin);

// Protected admin routes
router.get('/profile', authenticateAdmin, getAdminProfile);
router.put('/change-password', authenticateAdmin, changeAdminPassword);

// Admin management routes (Super Admin only)
router.post('/create', authenticateAdmin, createAdmin);
router.get('/list', authenticateAdmin, getAllAdmins);
router.put('/:id/toggle-status', authenticateAdmin, toggleAdminStatus);

// ===== APPROVAL MANAGEMENT ROUTES =====
router.get('/approvals', authenticateAdmin, getApprovals);
router.get('/approvals/:status', authenticateAdmin, getApprovals);
router.post('/approvals/brand/:id/approve', authenticateAdmin, approveBrand);
router.post('/approvals/brand/:id/reject', authenticateAdmin, rejectBrand);
router.post('/approvals/influencer/:id/approve', authenticateAdmin, approveInfluencer);
router.post('/approvals/influencer/:id/reject', authenticateAdmin, rejectInfluencer);

// ===== USER MANAGEMENT ROUTES =====
router.get('/users', authenticateAdmin, getUsers);
router.post('/users/:id/block', authenticateAdmin, blockUser);
router.post('/users/:id/unblock', authenticateAdmin, unblockUser);

// ===== SYSTEM STATS ROUTE =====
router.get('/stats', authenticateAdmin, getSystemStats);

export default router;
