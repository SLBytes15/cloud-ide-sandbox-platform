import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import { sendError } from '../utils/apiResponse.js';

export function errorHandler(
  err: Error & { statusCode?: number; code?: string; details?: unknown; status?: number; value?: unknown; errors?: unknown },
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
) {
  // 1. Handle JSON syntax / parse errors from body parser
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    logger.warn('Malformed JSON payload received', { message: err.message });
    return sendError(res, 'Malformed JSON payload in request body', 400, 'MALFORMED_JSON');
  }

  // 2. Handle Mongoose CastError (e.g. invalid ObjectId format)
  if (err.name === 'CastError') {
    logger.warn('Mongoose CastError encountered', { value: err.value });
    return sendError(res, `Invalid ID format: ${String(err.value)}`, 400, 'INVALID_ID_FORMAT');
  }

  // 3. Handle Mongoose schema validation errors
  if (err.name === 'ValidationError') {
    logger.warn('Mongoose ValidationError encountered', { errors: err.errors });
    return sendError(res, err.message, 400, 'VALIDATION_ERROR', err.errors);
  }

  // 4. Handle MongoDB duplicate key errors (code 11000)
  if (err.code === '11000' || (err as any).code === 11000) {
    logger.warn('MongoDB duplicate key error encountered');
    return sendError(res, 'Resource with duplicate key already exists in database', 409, 'CONFLICT');
  }

  // 5. Standard ApiError or generic internal server error
  const statusCode = err.statusCode || 500;
  const errorCode = err.code || 'INTERNAL_SERVER_ERROR';
  const message = statusCode >= 500 && process.env.NODE_ENV === 'production'
    ? 'An unexpected internal error occurred'
    : err.message || 'An unexpected error occurred';
  const details = 'details' in err ? err.details : undefined;

  logger.error('Unhandled request error', {
    message: err.message,
    statusCode,
    errorCode,
    details,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  return sendError(res, message, statusCode, errorCode, details);
}
