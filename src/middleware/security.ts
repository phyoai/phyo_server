import { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { sendError } from '../utils/http';

type RateBucket = {
  count: number;
  resetAt: number;
};

const rateBuckets = new Map<string, RateBucket>();

const getRequestKey = (req: Request): string => {
  return req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown';
};

export const basicSecurityHeaders = (_req: Request, res: Response, next: NextFunction): void => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-XSS-Protection', '0');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
};

export const apiRateLimiter = (req: Request, res: Response, next: NextFunction): void => {
  const key = getRequestKey(req);
  const now = Date.now();
  const current = rateBuckets.get(key);

  if (!current || current.resetAt <= now) {
    rateBuckets.set(key, {
      count: 1,
      resetAt: now + env.rateLimitWindowMs,
    });
    next();
    return;
  }

  current.count += 1;

  if (current.count > env.rateLimitMax) {
    sendError(res, 429, 'Too many requests', {
      retryAfterMs: current.resetAt - now,
    });
    return;
  }

  next();
};
