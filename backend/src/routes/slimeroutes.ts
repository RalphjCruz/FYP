import { Router } from 'express';
import { getSlimeStats, createTestUser, healthCheck } from '../controllers/slimeController';

const router = Router();

// Health check
router.get('/health', healthCheck);

// Get slime by user ID
router.get('/:userId', getSlimeStats);

// Create test user (for development only)
router.post('/test-user', createTestUser);

export default router;