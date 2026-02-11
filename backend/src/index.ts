import express from 'express';
import userRoutes from './routes/userRoutes.ts';  // Import userRoutes

const app = express();
const port = 5000;

// Root route to test the server
app.get('/', (req, res) => {
  res.send('Hello from the backend!');  // Simple test response
});

// Middleware to parse incoming JSON requests
app.use(express.json());

// Use userRoutes for '/api/users' endpoint
app.use('/api/users', userRoutes);

// Start the server
app.listen(port, () => {
  console.log("Server is running at http://localhost:5000");
});
