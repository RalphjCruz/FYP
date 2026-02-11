import { Router } from 'express';

const router = Router();

// Define a GET route for '/api/users'
router.get('/', (req, res) => {
  console.log('Users route accessed');
  res.json([{ id: 1, name: 'John Doe' }]); // Dummy user data for testing
});

export default router;  // Export the router
