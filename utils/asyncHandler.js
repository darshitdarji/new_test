// utils/asyncHandler.js
// Wraps an async route handler so rejected promises are forwarded to Express'
// error pipeline instead of crashing the process.
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
