// middleware/validate.js
// Runs a zod schema against the request and replaces the validated parts.
// Schema shape: { body?, query?, params? } of zod schemas.
import { ApiError } from '../utils/ApiError.js';

export const validate = (schema) => (req, _res, next) => {
  const result = {};

  for (const part of ['body', 'query', 'params']) {
    if (!schema[part]) continue;
    const parsed = schema[part].safeParse(req[part]);
    if (!parsed.success) {
      const details = parsed.error.issues.map((i) => ({
        field: [part, ...i.path].join('.'),
        message: i.message,
      }));
      return next(ApiError.unprocessable('Validation failed', details));
    }
    result[part] = parsed.data;
  }

  // Express 4 allows overwriting these. We also expose req.validated so handlers
  // can read coerced query params without depending on which part was overwritten.
  if (result.body) req.body = result.body;
  if (result.params) req.params = result.params;
  if (result.query) req.query = result.query;
  req.validated = { ...req.validated, ...result };
  next();
};
