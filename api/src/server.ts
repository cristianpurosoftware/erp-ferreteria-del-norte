import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import cors from 'cors';
import helmet from 'helmet';
import express from 'express';

import 'express-async-errors';

import { env } from './config/env';
import { errorHandler } from './middlewares/error-handler';
import { AppDataSource } from './config/data-source';
import apiRouter from './router';

const app = express();

// Trust the first proxy (Railway / Vercel) so req.ip resolves to the real client IP.
app.set('trust proxy', 1);

// Security headers in every env (helmet)
app.use(helmet());

// CORS by whitelist; FRONTEND_URL accepts a comma-separated list.
const allowedOrigins = env.FRONTEND_URL.split(',').map((u) => u.trim()).filter(Boolean);
app.use(
  cors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : false,
    credentials: true,
  }),
);

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Logging
if (env.isDev) {
  app.use(morgan('dev'));
}

// Health checks
app.get('/', (_req, res) => {
  res.json({ status: 'ok', name: env.CLIENT_NAME });
});

app.get('/health', async (_req, res) => {
  let dbStatus: 'connected' | 'disconnected' = 'disconnected';
  try {
    await AppDataSource.query('SELECT 1');
    dbStatus = 'connected';
  } catch {
    dbStatus = 'disconnected';
  }
  const ok = dbStatus === 'connected';
  res.status(ok ? 200 : 503).json({ status: ok ? 'ok' : 'degraded', db: dbStatus });
});

// API routes
app.use('/api', apiRouter);

// Error handler (must be last)
app.use(errorHandler);

export default app;
