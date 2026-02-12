import express, { Request, Response, NextFunction } from 'express';
import userRoutes from './routes/userRoutes.js';
import slimeRoutes from './routes/slimeroutes.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS - allow frontend to connect
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH');
  next();
});

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'MySlime API',
    timestamp: new Date().toISOString() 
  });
});

// Root route
app.get('/', (req, res) => {
  res.json({ 
    message: 'MySlime API 🎮',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      users: '/api/users',
      slime: '/api/slime'
    }
  });
});

// API Routes
app.use('/api/users', userRoutes);
app.use('/api/slime', slimeRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err.stack);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Start server
app.listen(port, () => {
  console.log("🚀 MySlime server running on http://localhost:${port}");
  console.log("📊 Environment: ${process.env.NODE_ENV || 'development'}");
  console.log("🗄️  Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}");
});