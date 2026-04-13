import express, { NextFunction, Request, Response } from 'express';
import accountRoutes from './routes/accountRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import authRoutes from './routes/authRoutes.js';
import customizationRoutes from './routes/customizationRoutes.js';
import focusRoutes from './routes/focusRoutes.js';
import leaderboardRoutes from './routes/leaderboardRoutes.js';
import { createSlimeRouter } from './routes/slimeroutes.js';
import taskRoutes from './routes/taskRoutes.js';

type AppConfig = {
  nodeEnv: string;
  corsOrigins: string[];
};

export const createApp = (config: AppConfig) => {
  const app = express();
  const allowedOrigins = new Set(config.corsOrigins);

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use((req, res, next) => {
    const requestOrigin = req.header('Origin');
    const hasOrigin = Boolean(requestOrigin);
    const isAllowedOrigin = requestOrigin ? allowedOrigins.has(requestOrigin) : true;

    if (hasOrigin && isAllowedOrigin && requestOrigin) {
      res.header('Access-Control-Allow-Origin', requestOrigin);
      res.header('Vary', 'Origin');
    }

    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');

    if (req.method === 'OPTIONS') {
      if (hasOrigin && !isAllowedOrigin) {
        return res.status(403).json({ success: false, message: 'CORS origin is not allowed' });
      }

      return res.sendStatus(204);
    }

    if (hasOrigin && !isAllowedOrigin) {
      return res.status(403).json({ success: false, message: 'CORS origin is not allowed' });
    }

    next();
  });

  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });

  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'MySlime API',
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/', (req, res) => {
    res.json({
      message: 'MySlime API',
      version: '1.0.0',
      endpoints: {
        health: '/health',
        auth: '/api/auth',
        account: '/api/account',
        slime: '/api/slime',
        tasks: '/api/tasks',
        customization: '/api/customization',
        analytics: '/api/analytics',
        leaderboard: '/api/leaderboard',
        focus: '/api/focus',
      },
    });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/account', accountRoutes);
  app.use('/api/slime', createSlimeRouter(config));
  app.use('/api/tasks', taskRoutes);
  app.use('/api/customization', customizationRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/leaderboard', leaderboardRoutes);
  app.use('/api/focus', focusRoutes);

  app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
  });

  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('Error:', err.stack);
    res.status(500).json({
      error: 'Internal server error',
      message: config.nodeEnv === 'development' ? err.message : 'Something went wrong',
    });
  });

  return app;
};
