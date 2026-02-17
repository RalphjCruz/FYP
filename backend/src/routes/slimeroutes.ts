import { Router } from 'express';
import { getSlimeStats, createTestUser, healthCheck } from '../controllers/slimeController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const router = Router();

// Health check
router.get('/health', healthCheck);

// Create test user (for development only)
router.post('/test-user', createTestUser);

// Current authenticated user slime
router.get('/me', requireAuth, getSlimeStats);

// Get slime by user ID
router.get('/:userId', requireAuth, getSlimeStats);

export default router;
