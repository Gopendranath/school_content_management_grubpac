import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError.js';
import { ZodError } from 'zod';
import jwt from 'jsonwebtoken';
import { logger } from '../config/logger.js';
import { env } from '../config/env.js';

interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  requestId?: string;
  details?: unknown;
  stack?: string;
}

/**
 * Global error handler middleware
 * Catches all errors and returns appropriate responses based on error type
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const requestId = (req as Request & { id?: string }).id || 'unknown';
  const isDevelopment = env.NODE_ENV === 'development';

  // Log error with context
  logger.error({
    requestId,
    method: req.method,
    path: req.path,
    error: err.message,
    stack: isDevelopment ? err.stack : undefined,
  }, 'Error occurred');

  let statusCode = 500;
  let message = 'Internal server error';
  let code: string | undefined;
  let details: unknown;

  // AppError instances
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    code = err.code;
  }
  // Multer errors
  else if ('name' in err && err.name === 'MulterError') {
    const multerError = err as Error & { code?: string };
    if (multerError.code === 'LIMIT_FILE_SIZE') {
      statusCode = 400;
      message = 'File too large';
    } else if (multerError.code === 'LIMIT_UNEXPECTED_FILE') {
      statusCode = 400;
      message = 'Unexpected file field';
    } else {
      statusCode = 400;
      message = 'File upload error';
    }
  }
  // JWT errors
  else if (err instanceof jwt.JsonWebTokenError) {
    statusCode = 401;
    message = 'Unauthorized';
  } else if (err instanceof jwt.TokenExpiredError) {
    statusCode = 401;
    message = 'Unauthorized';
  }
  // Zod validation errors
  else if (err instanceof ZodError) {
    statusCode = 400;
    message = 'Validation failed';
    details = err.errors;
  }
  // Database errors (PostgreSQL error codes)
  else if ('code' in err) {
    const dbError = err as Error & { code?: string };
    if (dbError.code === '23505') { // unique_violation
      statusCode = 409;
      message = 'Resource already exists';
    } else if (dbError.code === '23503') { // foreign_key_violation
      statusCode = 400;
      message = 'Invalid reference';
    } else if (dbError.code === '23502') { // not_null_violation
      statusCode = 400;
      message = 'Missing required field';
    }
  }

  const errorResponse: ErrorResponse = {
    success: false,
    error: message,
    requestId,
  };

  if (code) {
    errorResponse.code = code;
  }

  if (details && isDevelopment) {
    errorResponse.details = details;
  }

  // In development, include stack trace
  if (isDevelopment && err.stack) {
    errorResponse.stack = err.stack;
  }

  res.status(statusCode).json(errorResponse);
};
