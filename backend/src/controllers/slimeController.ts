import { Request, Response } from 'express';
import pool from '../config/database.js';

// Get slime stats for a user
export const getSlimeStats = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId || '1'; // Default to user 1 for testing
    
    const result = await pool.query(
      `SELECT s.*, u.username, u.email 
       FROM slimes s 
       JOIN users u ON s.user_id = u.id 
       WHERE s.user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Slime not found',
        message: 'No slime exists for this user. Create a user first!' 
      });
    }

    const slime = result.rows[0];
    res.json({
      success: true,
      data: {
        id: slime.id,
        name: slime.name,
        level: slime.level,
        experience: slime.experience,
        color: slime.color,
        evolutionStage: slime.evolution_stage,
        user: {
          id: slime.user_id,
          username: slime.username,
          email: slime.email
        },
        createdAt: slime.created_at
      }
    });
  } catch (error) {
    console.error('Error fetching slime:', error);
    res.status(500).json({ 
      error: 'Database error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Create a test user with slime
export const createTestUser = async (req: Request, res: Response) => {
  try {
    // Start transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Create user
      const userResult = await client.query(
        `INSERT INTO users (email, password_hash, username) 
         VALUES ($1, $2, $3) 
         RETURNING id, email, username`,
        ['test@myslime.com', 'hashedpassword123', 'TestUser']
      );

      const user = userResult.rows[0];

      // Create slime for user
      const slimeResult = await client.query(
        `INSERT INTO slimes (user_id, name, level, experience, color, evolution_stage) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         RETURNING *`,
        [user.id, 'Slimey', 1, 0, 'green', 1]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'Test user and slime created!',
        data: {
          user: user,
          slime: slimeResult.rows[0]
        }
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating test user:', error);
    res.status(500).json({ 
      error: 'Database error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Health check endpoint
export const healthCheck = async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({
      status: 'healthy',
      database: 'connected',
      timestamp: result.rows[0].now
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};