import { Request, Response } from 'express';

// In-memory users array for testing
let users: { id: number; name: string; email: string }[] = [];

// Get all users
export const getUsers = (req: Request, res: Response) => {
  try {
    res.status(200).json(users);  // Return the users array
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users' });
  }
};

// Create a new user
export const createUser = (req: Request, res: Response) => {
  const { name, email } = req.body;  // Get user data from request body

  // Simple validation
  if (!name || !email) {
    return res.status(400).json({ message: 'Name and email are required' });
  }

  // Simulate creating a user (using an in-memory array)
  const newUser = {
    id: users.length + 1,  // Simple ID increment
    name,
    email,
  };

  users.push(newUser);  // Add the new user to the array

  res.status(201).json(newUser);  // Return the created user
};
