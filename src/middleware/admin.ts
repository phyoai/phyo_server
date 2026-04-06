import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest } from '../types';
import Admin from '../models/admin';
import { env } from '../config/env';
import { sendError } from '../utils/http';

const JWT_SECRET = env.jwtSecret;

export interface AdminRequest extends AuthenticatedRequest {
  admin?: {
    id: string;
    email: string;
    role?: string;
  };
}

// JWT-based admin authentication
export const authenticateAdmin = async (req: AdminRequest, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    sendError(res, 401, 'Admin access token required');
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // Check if this is an admin token
    if (!decoded.isAdmin || decoded.type !== 'ADMIN') {
      sendError(res, 403, 'Admin access required');
      return;
    }

    // Verify admin still exists and is active
    const admin = await Admin.findById(decoded.id);
    if (!admin || !admin.isActive) {
      sendError(res, 403, 'Admin account not found or deactivated');
      return;
    }

    req.admin = {
      id: decoded.id,
      email: decoded.email,
      role: admin.role
    };
    
    next();
  } catch (error) {
    sendError(res, 403, 'Invalid or expired admin token');
    return;
  }
};

// Alternative simple admin key authentication for development/emergency access
export const authenticateAdminKey = (req: AdminRequest, res: Response, next: NextFunction): void => {
  const adminKey = req.headers['x-admin-key'] as string;
  const validAdminKey = process.env.ADMIN_KEY || 'phyo-admin-key-2024'; // Set in environment

  if (!adminKey || adminKey !== validAdminKey) {
    sendError(res, 403, 'Invalid admin key');
    return;
  }

  req.admin = {
    id: 'admin-key-user',
    email: 'admin@phyo.ai',
    role: 'SUPER_ADMIN'
  };

  next();
};
