import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest, JWTPayload } from '../types';
import { user } from '../models/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({ message: 'Access token required' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    req.user = {
      id: decoded.id,
      email: '', // Will be filled when needed
      type: ''   // Will be filled when needed
    };
    next();
  } catch (error) {
    res.status(403).json({ message: 'Invalid or expired token' });
    return;
  }
};

export const optionalAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
      req.user = {
        id: decoded.id,
        email: '',
        type: ''
      };
    } catch (error) {
      // Invalid token, but don't block the request
      console.warn('Invalid token in optional auth:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  next();
};

export const requireServiceProvider = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const foundUser = await user.findById(req.user.id);
    if (!foundUser) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    if (foundUser.type !== 'SERVICE_PROVIDER') {
      res.status(403).json({ message: 'Access denied. Service provider role required.' });
      return;
    }

    // Add user type to request for use in controllers
    req.user.type = foundUser.type;
    req.user.email = foundUser.email;
    
    next();
  } catch (error) {
    console.error('Service provider auth error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}; 