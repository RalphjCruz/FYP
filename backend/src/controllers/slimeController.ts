import { Request, Response } from 'express';
import pool from '../config/database.js';
import type { AuthenticatedRequest } from '../types/auth.js';

const parseUserId = (value: string | string[] | undefined): number | null => {
  if (!value) {
    return null;
  }

  const rawValue = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(rawValue, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

// Get slime stats for a user
export const getSlimeStats = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const authenticatedUserId = req.user?.id ?? null;
    const routeUserId = parseUserId(req.params.userId);
    const userId = authenticatedUserId ?? routeUserId;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid userId',
      });
    }

    if (authenticatedUserId !== null && routeUserId !== null && routeUserId !== authenticatedUserId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: user mismatch',
      });
    }

    const result = await pool.query(
      `SELECT s.*, u.username, u.email 
       FROM slimes s 
       JOIN users u ON s.user_id = u.id 
       WHERE s.user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
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
      success: false,
      error: 'Database error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Create a test user with slime
export const createTestUser = async (req: Request, res: Response) => {
  try {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const testEmail = 'test@myslime.com';
      let userCreated = false;
      let slimeCreated = false;

      const existingUserResult = await client.query(
        `SELECT id, email, username
         FROM users
         WHERE email = $1`,
        [testEmail],
      );

      let user = existingUserResult.rows[0];

      if (!user) {
        const createdUserResult = await client.query(
          `INSERT INTO users (email, password_hash, username)
           VALUES ($1, $2, $3)
           RETURNING id, email, username`,
          [testEmail, 'hashedpassword123', 'TestUser'],
        );

        user = createdUserResult.rows[0];
        userCreated = true;
      }

      const existingSlimeResult = await client.query(
        `SELECT *
         FROM slimes
         WHERE user_id = $1`,
        [user.id],
      );

      let slime = existingSlimeResult.rows[0];

      if (!slime) {
        const createdSlimeResult = await client.query(
          `INSERT INTO slimes (user_id, name, level, experience, color, evolution_stage)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *`,
          [user.id, 'Slimey', 1, 0, 'green', 1],
        );

        slime = createdSlimeResult.rows[0];
        slimeCreated = true;
      }

      await client.query('COMMIT');

      res.json({
        success: true,
        message:
          userCreated || slimeCreated
            ? 'Test user and slime created!'
            : 'Test user and slime already exist.',
        data: {
          user,
          slime,
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
