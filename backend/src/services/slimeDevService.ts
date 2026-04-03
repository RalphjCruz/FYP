import pool from '../config/database.js';
import {
  evaluateAndUnlockAchievements,
  resetUserAchievements,
  type UserAchievement,
} from './achievementService.js';
import { addXpToSlime, resetSlimeXp } from './xpService.js';

type TestUser = {
  id: number;
  email: string;
  username: string;
};

type TestSlime = {
  id: number;
  user_id: number;
  name: string;
  level: number;
  experience: number;
  color: string;
  evolution_stage: number;
  created_at: string;
  updated_at: string;
};

export type AddSlimeXpDevPayload = {
  level: number;
  totalExperience: number;
  experienceIntoLevel: number;
  experienceForNextLevel: number;
  experienceToNextLevel: number;
  levelProgressPercent: number;
  evolutionStage: number;
  achievementsUnlocked: UserAchievement[];
};

export type CreateTestUserWithSlimeResult = {
  user: TestUser;
  slime: TestSlime;
  userCreated: boolean;
  slimeCreated: boolean;
};

const TEST_USER_EMAIL = 'test@myslime.com';
const TEST_USER_NAME = 'TestUser';
const TEST_USER_PASSWORD_HASH = 'hashedpassword123';
const TEST_SLIME_NAME = 'Slimey';

export const addSlimeXpDevForUser = async (userId: number, xpToAdd: number): Promise<AddSlimeXpDevPayload> => {
  const levelSnapshot = await addXpToSlime(userId, xpToAdd, 'dev_manual_add');
  const achievementResult = await evaluateAndUnlockAchievements(userId);

  return {
    ...levelSnapshot,
    achievementsUnlocked: achievementResult.newlyUnlocked,
  };
};

export const resetSlimeXpDevForUser = async (userId: number) => {
  return resetSlimeXp(userId);
};

export const resetSlimeAchievementsDevForUser = async (userId: number) => {
  return resetUserAchievements(userId);
};

export const createOrGetTestUserWithSlime = async (): Promise<CreateTestUserWithSlimeResult> => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    let userCreated = false;
    let slimeCreated = false;

    const existingUserResult = await client.query<TestUser>(
      `SELECT id, email, username
       FROM users
       WHERE email = $1`,
      [TEST_USER_EMAIL],
    );

    let user = existingUserResult.rows[0];

    if (!user) {
      const createdUserResult = await client.query<TestUser>(
        `INSERT INTO users (email, password_hash, username)
         VALUES ($1, $2, $3)
         RETURNING id, email, username`,
        [TEST_USER_EMAIL, TEST_USER_PASSWORD_HASH, TEST_USER_NAME],
      );

      user = createdUserResult.rows[0];
      userCreated = true;
    }

    const existingSlimeResult = await client.query<TestSlime>(
      `SELECT *
       FROM slimes
       WHERE user_id = $1`,
      [user.id],
    );

    let slime = existingSlimeResult.rows[0];

    if (!slime) {
      const createdSlimeResult = await client.query<TestSlime>(
        `INSERT INTO slimes (user_id, name, level, experience, color, evolution_stage)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [user.id, TEST_SLIME_NAME, 1, 0, 'green', 1],
      );

      slime = createdSlimeResult.rows[0];
      slimeCreated = true;
    }

    await client.query('COMMIT');

    return {
      user,
      slime,
      userCreated,
      slimeCreated,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
