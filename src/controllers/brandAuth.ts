import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { brand } from '../models/auth';

// Interface for authenticated request with user info
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    type: string;
  };
}

// Change password for brand users
export const changeBrandPassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user?.id;

    // Validate input
    if (!currentPassword || !newPassword) {
      res.status(400).json({ 
        message: 'Please provide both current password and new password.' 
      });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ 
        message: 'New password must be at least 6 characters long.' 
      });
      return;
    }

    // Find the brand user
    const brandUser = await brand.findById(userId);
    if (!brandUser) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    // Check if user is OAuth user (Google, LinkedIn, etc.)
    if (brandUser.isOAuthUser) {
      res.status(400).json({ 
        message: 'Cannot change password for OAuth accounts. Please use your OAuth provider to manage your credentials.' 
      });
      return;
    }

    // Check if password exists
    if (!brandUser.password) {
      res.status(400).json({ 
        message: 'No password set for this account. Please contact support.' 
      });
      return;
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, brandUser.password);
    if (!isPasswordValid) {
      res.status(400).json({ message: 'Current password is incorrect.' });
      return;
    }

    // Check if new password is different from current password
    const isSamePassword = await bcrypt.compare(newPassword, brandUser.password);
    if (isSamePassword) {
      res.status(400).json({ 
        message: 'New password must be different from your current password.' 
      });
      return;
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    brandUser.password = hashedPassword;
    await brandUser.save();

    res.status(200).json({ 
      message: 'Password changed successfully! Please use your new password for future logins.' 
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ 
      message: 'Internal server error. Please try again later.' 
    });
  }
};
