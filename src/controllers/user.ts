import { Request, Response } from 'express';
import { user } from '../models/auth';
import { AuthenticatedRequest } from '../types';

interface UpdateProfileBody {
  name?: string;
  username?: string;
  bio?: string;
  profilePicture?: string;
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

    res.json({
      message: 'User profile retrieved successfully',
      data: foundUser
    });
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