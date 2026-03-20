const { logger } = require('./logger');

/**
 * Centralized error handler middleware
 * Should be registered at the bottom of all route handlers
 */
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  // Log the error with full context
  logger.error(`Error in ${req.method} ${req.path}`, {
    statusCode,
    message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userId: req.user?.id || 'anonymous',
    body: req.body,
    query: req.query,
  });

  // Send sanitized error response (don't expose stack traces in production)
  const errorResponse = {
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'An error occurred' : message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  };

  res.status(statusCode).json(errorResponse);
};

/**
 * Async error wrapper for route handlers
 * Usage: router.get('/path', asyncHandler(async (req, res) => { ... }))
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * 404 error handler
 * Should be registered after all other routes
 */
const notFoundHandler = (req, res, next) => {
  const error = new Error(`Not Found: ${req.originalUrl}`);
  res.status(404);
  next(error);
};

module.exports = {
  errorHandler,
  asyncHandler,
  notFoundHandler,
};
