import express, { NextFunction, Request, Response } from 'express';
import { env } from './config/env.js';
import authRoutes from './routes/authRoutes.js';
import slimeRoutes from './routes/slimeroutes.js';
import taskRoutes from './routes/taskRoutes.js';
import userRoutes from './routes/userRoutes.js';

const app = express();
const port = env.port;
const allowedOrigins = new Set(env.corsOrigins);

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
      users: '/api/users',
      slime: '/api/slime',
      tasks: '/api/tasks',
    },
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/slime', slimeRoutes);
app.use('/api/tasks', taskRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err.stack);
  res.status(500).json({
    error: 'Internal server error',
    message: env.nodeEnv === 'development' ? err.message : 'Something went wrong',
  });
});

app.listen(port, () => {
  console.log(`MySlime server running on http://localhost:${port}`);
  console.log(`Environment: ${env.nodeEnv}`);
  console.log(`Database URL configured: ${Boolean(env.databaseUrl)}`);
  console.log(`Allowed CORS origins: ${env.corsOrigins.join(', ') || '(none configured)'}`);
});
