import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest, JWTPayload } from '../types';
import { user } from '../models/auth';
import { env } from '../config/env';
import { sendError } from '../utils/http';
import { logger } from '../utils/logger';

const JWT_SECRET = env.jwtSecret;

export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    sendError(res, 401, 'Access token required');
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
    sendError(res, 403, 'Invalid or expired token');
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
      logger.warn('Invalid token in optional auth', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  next();
};

export const requireServiceProvider = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user?.id) {
      sendError(res, 401, 'Authentication required');
      return;
    }

    const foundUser = await user.findById(req.user.id);
    if (!foundUser) {
      sendError(res, 404, 'User not found');
      return;
    }

    if (foundUser.type !== 'SERVICE_PROVIDER') {
      sendError(res, 403, 'Access denied. Service provider role required.');
      return;
    }

    // Add user type to request for use in controllers
    req.user.type = foundUser.type;
    req.user.email = foundUser.email;
    
    next();
  } catch (error) {
    logger.error('Service provider auth error', {
      requestId: req.requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    sendError(res, 500, 'Server error', error instanceof Error ? error.message : 'Unknown error');
  }
}; 
