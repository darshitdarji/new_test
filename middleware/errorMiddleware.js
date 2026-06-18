// middleware/errorMiddleware.js
// Centralized error handler. Must be registered LAST (after routes & notFound).
import { ZodError } from 'zod';
import { ApiError } from '../utils/ApiError.js';
import { isProd } from '../config/env.js';

// Map common PostgreSQL error codes to friendly HTTP responses.
const PG_ERRORS = {
  '23505': { status: 409, message: 'Resource already exists' }, // unique_violation
  '23503': { status: 409, message: 'Related resource not found' }, // foreign_key_violation
  '23514': { status: 400, message: 'A value violates a constraint' }, // check_violation
  '22P02': { status: 400, message: 'Invalid input syntax' }, // invalid_text_representation
};

// eslint-disable-next-line no-unused-vars -- Express identifies error handlers by arity (4 args).
export const errorMiddleware = (err, req, res, _next) => {
  let statusCode = 500;
  let message = 'Internal server error';
  let details;

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    details = err.details;
  } else if (err instanceof ZodError) {
    statusCode = 422;
    message = 'Validation failed';
    details = err.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    }));
  } else if (err && PG_ERRORS[err.code]) {
    statusCode = PG_ERRORS[err.code].status;
    message = PG_ERRORS[err.code].message;
  } else if (err?.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'Malformed JSON body';
  }

  // Log unexpected (non-operational) errors with stack for debugging.
  if (statusCode >= 500) {
    console.error('Unhandled error:', err);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(details ? { details } : {}),
      ...(isProd ? {} : { stack: err?.stack }),
    },
  });
};
