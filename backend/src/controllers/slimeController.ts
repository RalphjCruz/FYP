import { Request, Response } from 'express';
import { env } from '../config/env.js';
import pool from '../config/database.js';
import type { AuthenticatedRequest } from '../types/auth.js';
import {
  evaluateAndUnlockAchievements,
  getAchievementProgress,
  resetUserAchievements,
} from '../services/achievementService.js';
import { getStudyHealthSnapshot } from '../services/studyHealthService.js';
import { addXpToSlime, resetSlimeXp, syncSlimeLevelFromStoredExperience } from '../services/xpService.js';
import { clampNumber, parseInteger, parsePositiveInteger } from '../utils/inputSanitizer.js';

const parseUserId = (value: string | string[] | undefined): number | null => {
  if (!value) {
    return null;
  }

  const rawValue = Array.isArray(value) ? value[0] : value;
  return parsePositiveInteger(rawValue);
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

    const parsedSimulatedOffset = parseInteger(req.query.simulatedDayOffset, 0);
    const simulatedDayOffset = Number.isInteger(parsedSimulatedOffset) ? clampNumber(parsedSimulatedOffset, -365, 365) : 0;
    const simulatedNowUtc = env.nodeEnv !== 'production' && simulatedDayOffset !== 0
      ? new Date(Date.now() + simulatedDayOffset * 24 * 60 * 60 * 1000)
      : undefined;

    const studyHealth = await getStudyHealthSnapshot(userId, { nowUtc: simulatedNowUtc });

    const refreshedResult = await pool.query(
      `SELECT s.*, u.username, u.email 
       FROM slimes s 
       JOIN users u ON s.user_id = u.id 
       WHERE s.user_id = $1`,
      [userId]
    );

    if (refreshedResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Slime not found',
        message: 'No slime exists for this user. Create a user first!',
      });
    }

    const slime = refreshedResult.rows[0];
    const levelSnapshot = await syncSlimeLevelFromStoredExperience(pool, userId, Number(slime.experience ?? 0));
    await evaluateAndUnlockAchievements(userId);
    const achievementProgress = await getAchievementProgress(userId);
    const achievements = achievementProgress
      .filter((achievement) => achievement.isUnlocked && achievement.unlockedAt)
      .map((achievement) => ({
        key: achievement.key,
        name: achievement.name,
        description: achievement.description,
        badgeIcon: achievement.badgeIcon,
        unlockedAt: achievement.unlockedAt as string,
      }));

    res.json({
      success: true,
      data: {
        id: slime.id,
        name: slime.name,
        level: levelSnapshot.level,
        experience: levelSnapshot.experienceIntoLevel,
        totalExperience: levelSnapshot.totalExperience,
        experienceForNextLevel: levelSnapshot.experienceForNextLevel,
        experienceToNextLevel: levelSnapshot.experienceToNextLevel,
        levelProgressPercent: levelSnapshot.levelProgressPercent,
        color: slime.color,
        evolutionStage: levelSnapshot.evolutionStage,
        user: {
          id: slime.user_id,
          username: slime.username,
          email: slime.email
        },
        achievements,
        achievementProgress,
        studyHealth: {
          currentHp: studyHealth.currentHp,
          maxHp: studyHealth.maxHp,
          dayStreak: studyHealth.dayStreak,
          dailyGoalMinutes: studyHealth.dailyGoalMinutes,
          todayFocusedMinutes: studyHealth.todayFocusedMinutes,
          timezoneIana: studyHealth.timezoneIana,
          lastSettledOnLocal: studyHealth.lastSettledOnLocal,
          hpDeltaCarry: studyHealth.hpDeltaCarry,
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

export const addSlimeXpDev = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id ?? null;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Missing authenticated user' });
    }

    const xpAmount = parseInteger(req.body.amount, 50);
    const xpToAdd = Number.isInteger(xpAmount) && xpAmount > 0 ? xpAmount : 50;
    const levelSnapshot = await addXpToSlime(userId, xpToAdd, 'dev_manual_add');
    const achievementResult = await evaluateAndUnlockAchievements(userId);

    return res.json({
      success: true,
      message: `Added ${xpToAdd} XP`,
      data: {
        ...levelSnapshot,
        achievementsUnlocked: achievementResult.newlyUnlocked,
      },
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to add XP',
    });
  }
};

export const resetSlimeXpDev = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id ?? null;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Missing authenticated user' });
    }

    const levelSnapshot = await resetSlimeXp(userId);

    return res.json({
      success: true,
      message: 'Slime XP reset to zero',
      data: levelSnapshot,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to reset slime XP',
    });
  }
};

export const resetSlimeAchievementsDev = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id ?? null;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Missing authenticated user' });
    }

    const result = await resetUserAchievements(userId);

    return res.json({
      success: true,
      message: 'Achievements reset',
      data: result,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to reset achievements',
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
