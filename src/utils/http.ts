import { Response } from 'express';

export class AppError extends Error {
  statusCode: number;
  details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

export const sendSuccess = (
  res: Response,
  message: string,
  data: unknown = {},
  statusCode = 200
): Response => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

export const sendError = (
  res: Response,
  statusCode: number,
  message: string,
  error: unknown = {}
): Response => {
  return res.status(statusCode).json({
    success: false,
    message,
    error,
  });
};
