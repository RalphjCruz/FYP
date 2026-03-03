import type { PoolClient } from 'pg';
import pool from '../config/database.js';

const XP_BASE = 100;
const XP_GROWTH = 1.28;

type DbClient = Pick<PoolClient, 'query'>;

export type SlimeLevelSnapshot = {
  totalExperience: number;
  level: number;
  evolutionStage: number;
  experienceIntoLevel: number;
  experienceForNextLevel: number;
  experienceToNextLevel: number;
  levelProgressPercent: number;
};

const experienceToAdvanceLevel = (level: number): number => {
  if (level <= 0) {
    return XP_BASE;
  }

  return Math.round(XP_BASE * XP_GROWTH ** (level - 1));
};

const totalExperienceForLevel = (targetLevel: number): number => {
  if (targetLevel <= 1) {
    return 0;
  }

  let total = 0;
  for (let level = 1; level < targetLevel; level += 1) {
    total += experienceToAdvanceLevel(level);
  }

  return total;
};

const levelFromExperience = (totalExperience: number): number => {
  let level = 1;

  while (totalExperience >= totalExperienceForLevel(level + 1)) {
    level += 1;
  }

  return level;
};

const evolutionStageFromLevel = (level: number): number => {
  return Math.max(1, Math.min(5, Math.floor((level - 1) / 5) + 1));
};

export const buildSlimeLevelSnapshot = (rawExperience: number): SlimeLevelSnapshot => {
  const totalExperience = Math.max(0, rawExperience);
  const level = levelFromExperience(totalExperience);
  const currentLevelFloor = totalExperienceForLevel(level);
  const nextLevelFloor = totalExperienceForLevel(level + 1);
  const experienceForNextLevel = nextLevelFloor - currentLevelFloor;
  const experienceIntoLevel = totalExperience - currentLevelFloor;
  const experienceToNextLevel = Math.max(0, experienceForNextLevel - experienceIntoLevel);
  const levelProgressPercent =
    experienceForNextLevel > 0 ? Math.min(100, (experienceIntoLevel / experienceForNextLevel) * 100) : 100;

  return {
    totalExperience,
    level,
    evolutionStage: evolutionStageFromLevel(level),
    experienceIntoLevel,
    experienceForNextLevel,
    experienceToNextLevel,
    levelProgressPercent,
  };
};

const updateSlimeFromTotalExperience = async (db: DbClient, userId: number, totalExperience: number) => {
  const snapshot = buildSlimeLevelSnapshot(totalExperience);

  await db.query(
    `UPDATE slimes
     SET experience = $2,
         level = $3,
         evolution_stage = $4,
         updated_at = CURRENT_TIMESTAMP
     WHERE user_id = $1`,
    [userId, snapshot.totalExperience, snapshot.level, snapshot.evolutionStage],
  );

  return snapshot;
};

export const syncSlimeLevelFromStoredExperience = async (db: DbClient, userId: number, rawExperience: number) => {
  return updateSlimeFromTotalExperience(db, userId, rawExperience);
};

export const addXpToSlimeWithClient = async (
  db: DbClient,
  userId: number,
  xpAmount: number,
  reason: string,
): Promise<SlimeLevelSnapshot & { xpAdded: number; reason: string }> => {
  if (!Number.isInteger(xpAmount) || xpAmount <= 0) {
    throw new Error('XP amount must be a positive integer');
  }

  const slimeResult = await db.query(
    `SELECT experience
     FROM slimes
     WHERE user_id = $1
     FOR UPDATE`,
    [userId],
  );

  if (slimeResult.rows.length === 0) {
    throw new Error('Slime not found for user');
  }

  const currentExperience = Number(slimeResult.rows[0].experience ?? 0);
  const totalExperience = currentExperience + xpAmount;
  const snapshot = await updateSlimeFromTotalExperience(db, userId, totalExperience);

  await db.query(
    `CREATE TABLE IF NOT EXISTS slime_xp_events (
      id BIGSERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      xp_amount INTEGER NOT NULL,
      reason VARCHAR(80) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  );

  await db.query(
    `INSERT INTO slime_xp_events (user_id, xp_amount, reason)
     VALUES ($1, $2, $3)`,
    [userId, xpAmount, reason],
  );

  return {
    ...snapshot,
    xpAdded: xpAmount,
    reason,
  };
};

export const addXpToSlime = async (userId: number, xpAmount: number, reason: string) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await addXpToSlimeWithClient(client, userId, xpAmount, reason);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
