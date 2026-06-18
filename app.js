// app.js
// Express application assembly. Exports the app WITHOUT listening so it can be
// imported by tests (Supertest) and by server.js alike.
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { env, isTest } from './config/env.js';
import apiRoutes from './routes/index.js';
import { notFound } from './middleware/notFound.js';
import { errorMiddleware } from './middleware/errorMiddleware.js';

const app = express();

// Security & infrastructure middleware.
app.set('trust proxy', 1); // correct client IPs behind a proxy (rate limiting)
app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(','),
    credentials: true,
  }),
);
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true }));

if (!isTest) app.use(morgan('dev'));

// Global rate limiter (auth routes add a stricter one of their own).
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

// Health check.
app.get('/health', (_req, res) =>
  res.json({ success: true, status: 'ok', uptime: process.uptime() }),
);

// API.
app.use('/api/v1', apiRoutes);

// 404 + centralized error handling (must be last).
app.use(notFound);
app.use(errorMiddleware);

export default app;
