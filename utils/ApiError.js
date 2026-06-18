// utils/ApiError.js
// Operational error carrying an HTTP status code. Thrown by controllers/services
// and translated to a JSON response by the error middleware.
export class ApiError extends Error {
  /**
   * @param {number} statusCode - HTTP status (e.g. 404).
   * @param {string} message - human-readable message.
   * @param {object} [options]
   * @param {Array} [options.details] - structured field-level details.
   */
  constructor(statusCode, message, { details } = {}) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace?.(this, ApiError);
  }

  static badRequest(msg = 'Bad request', details) {
    return new ApiError(400, msg, { details });
  }
  static unauthorized(msg = 'Unauthorized') {
    return new ApiError(401, msg);
  }
  static forbidden(msg = 'Forbidden') {
    return new ApiError(403, msg);
  }
  static notFound(msg = 'Resource not found') {
    return new ApiError(404, msg);
  }
  static conflict(msg = 'Conflict') {
    return new ApiError(409, msg);
  }
  static unprocessable(msg = 'Validation failed', details) {
    return new ApiError(422, msg, { details });
  }
}
