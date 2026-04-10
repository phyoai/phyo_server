import { NextFunction, Request, Response } from 'express';
import * as Sentry from '@sentry/node';
import { AppError, sendError } from '../utils/http';
import { logger } from '../utils/logger';

export const notFoundHandler = (req: Request, res: Response): void => {
  sendError(res, 404, `Route not found: ${req.method} ${req.originalUrl}`);
};

export const errorHandler = (error: unknown, req: Request, res: Response, _next: NextFunction): void => {
  if (error instanceof Error) {
    Sentry.captureException(error);
  }

  const appError = error instanceof AppError ? error : null;
  const statusCode = appError?.statusCode || 500;
  const message = appError?.message || 'Internal server error';
  const details = appError?.details || (error instanceof Error ? { name: error.name } : {});

  logger.error('Unhandled request error', {
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl,
    statusCode,
    message,
    details,
  });

  sendError(res, statusCode, message, details);
};
