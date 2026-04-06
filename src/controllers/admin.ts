import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import Admin from '../models/admin';
import { AdminRequest } from '../middleware/admin';
import BrandRequest from '../models/brandRequest';
import InfluencerRequest from '../models/influencerRequest';
import { user } from '../models/auth';
import { sendError, sendSuccess } from '../utils/http';
import { logger } from '../utils/logger';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const ADMIN_USER_SAFE_FIELDS = [
  '_id',
  'email',
  'type',
  'name',
  'username',
  'phoneNumber',
  'isEmailVerified',
  'isBlocked',
  'currentPlan',
  'creditsRemaining',
  'subscriptionStatus',
  'brandRegistrationStatus',
  'createdAt',
  'updatedAt'
].join(' ');

interface AdminLoginRequest {
  email: string;
  password: string;
}

interface AdminCreateRequest {
  email: string;
  password: string;
  name: string;
  role?: 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR';
}

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MODERATOR'] as const;

// Create JWT token for admin
const createAdminToken = (adminId: string, email: string): string => {
  return jwt.sign(
    { 
      id: adminId, 
      email: email, 
      isAdmin: true,
      type: 'ADMIN'
    }, 
    JWT_SECRET, 
    { expiresIn: '24h' }
  );
};

// Admin Login
export const adminLogin = async (req: Request<{}, {}, AdminLoginRequest>, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      sendError(res, 400, 'Email and password are required');
      return;
    }

    // Find admin by email
    const admin = await Admin.findOne({ email: email.toLowerCase() });
    if (!admin) {
      sendError(res, 401, 'Invalid email or password');
      return;
    }

    // Check if admin is active
    if (!admin.isActive) {
      sendError(res, 401, 'Admin account is deactivated');
      return;
    }

    // Check password
    const isPasswordValid = await admin.comparePassword(password);
    if (!isPasswordValid) {
      sendError(res, 401, 'Invalid email or password');
      return;
    }

    // Update last login
    admin.lastLogin = new Date();
    await admin.save();

    // Generate JWT token
    const token = createAdminToken((admin._id as any).toString(), admin.email);

    sendSuccess(res, 'Login successful', {
      token,
      admin: {
        id: admin._id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        lastLogin: admin.lastLogin
      }
    });

  } catch (error) {
    logger.error('Admin login error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    sendError(res, 500, 'Internal server error');
  }
};

// Get current admin profile
export const getAdminProfile = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    if (!req.admin) {
      sendError(res, 401, 'Admin authentication required');
      return;
    }

    const admin = await Admin.findById(req.admin.id);
    if (!admin) {
      sendError(res, 404, 'Admin not found');
      return;
    }

    sendSuccess(res, 'Admin profile retrieved successfully', {
      admin: {
        id: admin._id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        lastLogin: admin.lastLogin,
        createdAt: admin.createdAt,
        updatedAt: admin.updatedAt
      }
    });

  } catch (error) {
    logger.error('Get admin profile error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    sendError(res, 500, 'Internal server error');
  }
};

// Create new admin (Super Admin only)
export const createAdmin = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    // Check if current admin is Super Admin
    const currentAdmin = await Admin.findById(req.admin?.id);
    if (!currentAdmin || currentAdmin.role !== 'SUPER_ADMIN') {
      sendError(res, 403, 'Only Super Admin can create new admins');
      return;
    }

    const { email, password, name, role = 'ADMIN' } = req.body as AdminCreateRequest;

    // Validate input
    if (!email || !password || !name) {
      sendError(res, 400, 'Email, password, and name are required');
      return;
    }

    if (password.length < 8) {
      sendError(res, 400, 'Password must be at least 8 characters long');
      return;
    }

    if (role && !ADMIN_ROLES.includes(role)) {
      sendError(res, 400, 'Role must be SUPER_ADMIN, ADMIN, or MODERATOR');
      return;
    }

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: email.toLowerCase() });
    if (existingAdmin) {
      sendError(res, 400, 'Admin with this email already exists');
      return;
    }

    // Create new admin
    const newAdmin = new Admin({
      email: email.toLowerCase(),
      password,
      name,
      role
    });

    await newAdmin.save();

    sendSuccess(res, 'Admin created successfully', {
      admin: {
        id: newAdmin._id,
        email: newAdmin.email,
        name: newAdmin.name,
        role: newAdmin.role,
        createdAt: newAdmin.createdAt
      }
    }, 201);

  } catch (error) {
    logger.error('Create admin error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    sendError(res, 500, 'Internal server error');
  }
};

// Get all admins (Super Admin only)
export const getAllAdmins = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    // Check if current admin is Super Admin
    const currentAdmin = await Admin.findById(req.admin?.id);
    if (!currentAdmin || currentAdmin.role !== 'SUPER_ADMIN') {
      sendError(res, 403, 'Only Super Admin can view all admins');
      return;
    }

    const admins = await Admin.find({}).sort({ createdAt: -1 });

    sendSuccess(res, 'Admins retrieved successfully', {
      admins: admins.map(admin => ({
        id: admin._id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        isActive: admin.isActive,
        lastLogin: admin.lastLogin,
        createdAt: admin.createdAt
      }))
    });

  } catch (error) {
    logger.error('Get all admins error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    sendError(res, 500, 'Internal server error');
  }
};

// Toggle admin active status (Super Admin only)
export const toggleAdminStatus = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Check if current admin is Super Admin
    const currentAdmin = await Admin.findById(req.admin?.id);
    if (!currentAdmin || currentAdmin.role !== 'SUPER_ADMIN') {
      sendError(res, 403, 'Only Super Admin can modify admin status');
      return;
    }

    const admin = await Admin.findById(id);
    if (!admin) {
      sendError(res, 404, 'Admin not found');
      return;
    }

    // Prevent deactivating yourself
    if ((admin._id as any).toString() === req.admin?.id) {
      sendError(res, 400, 'Cannot deactivate your own account');
      return;
    }

    admin.isActive = !admin.isActive;
    await admin.save();

    sendSuccess(res, `Admin ${admin.isActive ? 'activated' : 'deactivated'} successfully`, {
      admin: {
        id: admin._id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        isActive: admin.isActive
      }
    });

  } catch (error) {
    logger.error('Toggle admin status error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    sendError(res, 500, 'Internal server error');
  }
};

// Change admin password
export const changeAdminPassword = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      sendError(res, 400, 'Current password and new password are required');
      return;
    }

    if (newPassword.length < 8) {
      sendError(res, 400, 'New password must be at least 8 characters long');
      return;
    }

    const admin = await Admin.findById(req.admin?.id);
    if (!admin) {
      sendError(res, 404, 'Admin not found');
      return;
    }

    // Verify current password
    const isCurrentPasswordValid = await admin.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      sendError(res, 400, 'Current password is incorrect');
      return;
    }

    // Update password
    admin.password = newPassword;
    await admin.save();

    sendSuccess(res, 'Password changed successfully');

  } catch (error) {
    logger.error('Change admin password error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    sendError(res, 500, 'Internal server error');
  }
};

// Initialize first super admin (for setup)
export const initializeSuperAdmin = async (): Promise<void> => {
  try {
    const superAdminCount = await Admin.countDocuments({ role: 'SUPER_ADMIN' });

    if (superAdminCount === 0) {
      const defaultSuperAdmin = new Admin({
        email: process.env.SUPER_ADMIN_EMAIL || 'superadmin@phyo.ai',
        password: process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin@123',
        name: 'Super Administrator',
        role: 'SUPER_ADMIN'
      });

      await defaultSuperAdmin.save();
      console.log('✅ Super Admin initialized:', defaultSuperAdmin.email);
      console.log('⚠️  Please change the default password after first login!');
    }
  } catch (error) {
    console.error('Error initializing super admin:', error);
  }
};

// ===== APPROVAL MANAGEMENT ENDPOINTS =====

// Get all pending approvals (brands + influencers)
export const getApprovals = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const status = req.query.status as string || 'PENDING';

    const brandApprovals = await BrandRequest.find({ status }).sort({ createdAt: -1 }).limit(100);
    const influencerApprovals = await InfluencerRequest.find({ status }).sort({ createdAt: -1 }).limit(100);

    sendSuccess(res, 'Approvals retrieved successfully', {
      brands: brandApprovals,
      influencers: influencerApprovals,
      total: brandApprovals.length + influencerApprovals.length
    });
  } catch (error) {
    logger.error('Get approvals error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    sendError(res, 500, 'Failed to retrieve approvals');
  }
};

// Approve brand request
export const approveBrand = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { admin_notes } = req.body || {};

    const brandRequest = await BrandRequest.findById(id);
    if (!brandRequest) {
      sendError(res, 404, 'Brand request not found');
      return;
    }

    // Update status
    brandRequest.status = 'APPROVED';
    brandRequest.admin_notes = admin_notes || '';
    brandRequest.reviewed_by = req.admin?.email || 'Admin';
    brandRequest.reviewed_at = new Date();
    await brandRequest.save();

    sendSuccess(res, 'Brand request approved successfully', brandRequest);
  } catch (error) {
    logger.error('Approve brand error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    sendError(res, 500, 'Failed to approve brand request');
  }
};

// Reject brand request
export const rejectBrand = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { admin_notes, reason } = req.body || {};

    const brandRequest = await BrandRequest.findById(id);
    if (!brandRequest) {
      sendError(res, 404, 'Brand request not found');
      return;
    }

    // Update status
    brandRequest.status = 'REJECTED';
    brandRequest.admin_notes = admin_notes || reason || 'No reason provided';
    brandRequest.reviewed_by = req.admin?.email || 'Admin';
    brandRequest.reviewed_at = new Date();
    await brandRequest.save();

    sendSuccess(res, 'Brand request rejected successfully', brandRequest);
  } catch (error) {
    logger.error('Reject brand error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    sendError(res, 500, 'Failed to reject brand request');
  }
};

// Approve influencer request
export const approveInfluencer = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { admin_notes } = req.body || {};

    const influencerRequest = await InfluencerRequest.findById(id);
    if (!influencerRequest) {
      sendError(res, 404, 'Influencer request not found');
      return;
    }

    // Update status
    influencerRequest.status = 'APPROVED';
    influencerRequest.admin_notes = admin_notes || '';
    influencerRequest.reviewed_by = req.admin?.email || 'Admin';
    influencerRequest.reviewed_at = new Date();
    await influencerRequest.save();

    sendSuccess(res, 'Influencer request approved successfully', influencerRequest);
  } catch (error) {
    logger.error('Approve influencer error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    sendError(res, 500, 'Failed to approve influencer request');
  }
};

// Reject influencer request
export const rejectInfluencer = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { admin_notes, reason } = req.body || {};

    const influencerRequest = await InfluencerRequest.findById(id);
    if (!influencerRequest) {
      sendError(res, 404, 'Influencer request not found');
      return;
    }

    // Update status
    influencerRequest.status = 'REJECTED';
    influencerRequest.admin_notes = admin_notes || reason || 'No reason provided';
    influencerRequest.reviewed_by = req.admin?.email || 'Admin';
    influencerRequest.reviewed_at = new Date();
    await influencerRequest.save();

    sendSuccess(res, 'Influencer request rejected successfully', influencerRequest);
  } catch (error) {
    logger.error('Reject influencer error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    sendError(res, 500, 'Failed to reject influencer request');
  }
};

// ===== USER MANAGEMENT ENDPOINTS =====

// Get all users with optional filtering
export const getUsers = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const role = req.query.role as string;
    let query: any = {};

    if (role) {
      query.type = role.toUpperCase();
    }

    const users = await user.find(query).select(ADMIN_USER_SAFE_FIELDS).sort({ createdAt: -1 }).limit(100);

    sendSuccess(res, 'Users retrieved successfully', {
      users,
      total: users.length
    });
  } catch (error) {
    logger.error('Get users error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    sendError(res, 500, 'Failed to retrieve users');
  }
};

// Block a user
export const blockUser = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const targetUser = await user.findById(id);
    if (!targetUser) {
      sendError(res, 404, 'User not found');
      return;
    }

    // Mark user as blocked/inactive
    (targetUser as any).isBlocked = true;
    await targetUser.save();

    sendSuccess(res, 'User blocked successfully', { userId: id, isBlocked: true });
  } catch (error) {
    logger.error('Block user error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    sendError(res, 500, 'Failed to block user');
  }
};

// Unblock a user
export const unblockUser = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const targetUser = await user.findById(id);
    if (!targetUser) {
      sendError(res, 404, 'User not found');
      return;
    }

    // Mark user as unblocked/active
    (targetUser as any).isBlocked = false;
    await targetUser.save();

    sendSuccess(res, 'User unblocked successfully', { userId: id, isBlocked: false });
  } catch (error) {
    logger.error('Unblock user error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    sendError(res, 500, 'Failed to unblock user');
  }
};

// Get system statistics
export const getSystemStats = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const totalUsers = await user.countDocuments();
    const totalBrands = await user.countDocuments({ type: 'BRAND' });
    const totalInfluencers = await user.countDocuments({ type: 'INFLUENCER' });
    const pendingBrandApprovals = await BrandRequest.countDocuments({ status: 'PENDING' });
    const pendingInfluencerApprovals = await InfluencerRequest.countDocuments({ status: 'PENDING' });
    const approvedBrands = await BrandRequest.countDocuments({ status: 'APPROVED' });
    const approvedInfluencers = await InfluencerRequest.countDocuments({ status: 'APPROVED' });

    sendSuccess(res, 'System statistics retrieved successfully', {
      users: {
        total: totalUsers,
        brands: totalBrands,
        influencers: totalInfluencers
      },
      approvals: {
        pending_brands: pendingBrandApprovals,
        pending_influencers: pendingInfluencerApprovals,
        approved_brands: approvedBrands,
        approved_influencers: approvedInfluencers
      }
    });
  } catch (error) {
    logger.error('Get stats error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    sendError(res, 500, 'Failed to retrieve system statistics');
  }
};
