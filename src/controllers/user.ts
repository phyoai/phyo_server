import { Request, Response } from 'express';
import { user } from '../models/auth';
import { AuthenticatedRequest } from '../types';
import { sendSuccess } from '../utils/http';
import bcrypt from 'bcryptjs';

interface UpdateProfileBody {
  name?: string;
  username?: string;
  bio?: string;
  profilePicture?: string;
  about?: string;
  [key: string]: any;
}

export const getUserProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const foundUser = await user.findById(userId, { password: 0 });
    if (!foundUser) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    sendSuccess(res, 'User profile retrieved successfully', foundUser);
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const updateUserProfile = async (req: AuthenticatedRequest<{}, {}, UpdateProfileBody>, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const updateData = req.body;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // Remove sensitive fields that shouldn't be updated this way
    delete updateData.password;
    delete updateData.email;
    delete updateData.type;
    delete updateData.resetPasswordToken;
    delete updateData.resetPasswordExpires;
    delete updateData.isCodeVerified;

    const updatedUser = await user.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json({
      message: 'User profile updated successfully',
      data: updatedUser
    });
  } catch (error) {
    console.error('Update user profile error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getUserById = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const foundUser = await user.findById(id, { password: 0, resetPasswordToken: 0, resetPasswordExpires: 0 });
    if (!foundUser) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json({
      message: 'User retrieved successfully',
      data: foundUser
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const searchUsers = async (req: Request<{}, {}, {}, { q?: string; type?: string; page?: string; limit?: string }>, res: Response): Promise<void> => {
  try {
    const { q = '', type, page = '1', limit = '20' } = req.query;

    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 50); // Max 50 results per page
    const skip = (pageNum - 1) * limitNum;

    const query: any = {};

    // Search by name, username, or email
    if (q) {
      query.$or = [
        { name: { $regex: q, $options: 'i' } },
        { username: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } }
      ];
    }

    // Filter by user type
    if (type && ['BRAND', 'INFLUENCER', 'SERVICE_PROVIDER'].includes(type.toUpperCase())) {
      query.type = type.toUpperCase();
    }

    const users = await user.find(query, { 
      password: 0, 
      resetPasswordToken: 0, 
      resetPasswordExpires: 0,
      isCodeVerified: 0
    })
      .skip(skip)
      .limit(limitNum)
      .sort({ createdAt: -1 })
      .lean();

    const totalUsers = await user.countDocuments(query);

    res.json({
      message: 'Users retrieved successfully',
      data: {
        users,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalUsers / limitNum),
          totalUsers,
          hasMore: skip + users.length < totalUsers
        }
      }
    });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const deleteUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const deletedUser = await user.findByIdAndDelete(userId);
    if (!deletedUser) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json({
      message: 'User account deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const changePassword = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({ success: false, message: 'currentPassword and newPassword are required' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
      return;
    }

    const foundUser = await user.findById(userId);
    if (!foundUser) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    if (!foundUser.password) {
      res.status(400).json({ success: false, message: 'Password login is not configured for this user' });
      return;
    }

    const isMatch = await bcrypt.compare(currentPassword, foundUser.password);
    if (!isMatch) {
      res.status(400).json({ success: false, message: 'Current password is incorrect' });
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await user.findByIdAndUpdate(userId, { password: hashedPassword });

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

export const uploadAvatar = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    // If using multer/S3, the file URL would be in req.file or req.body.avatarUrl
    const avatarUrl = (req as any).file?.location || req.body.avatarUrl;

    if (!avatarUrl) {
      res.status(400).json({ success: false, message: 'No avatar file provided' });
      return;
    }

    await user.findByIdAndUpdate(userId, { $set: { profilePicture: avatarUrl } });

    res.json({
      success: true,
      message: 'Avatar uploaded successfully',
      data: { avatarUrl }
    });
  } catch (error) {
    console.error('Upload avatar error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

export const listUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const type = req.query.type as string;

    const filter: any = {};
    if (type) filter.type = type.toUpperCase();

    const [users, total] = await Promise.all([
      user.find(filter, {
        password: 0,
        resetPasswordToken: 0,
        resetPasswordExpires: 0,
        emailVerificationOTP: 0
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      user.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

export const updateUserLocation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { location, country } = req.body;

    const updateData: any = {};
    if (location !== undefined) updateData.location = location;
    if (country !== undefined) updateData.country = country;

    await user.findByIdAndUpdate(userId, { $set: updateData });

    res.json({
      success: true,
      message: 'Location updated successfully',
      data: updateData
    });
  } catch (error) {
    console.error('Update user location error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
}; 
