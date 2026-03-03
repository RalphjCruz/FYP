import type { PoolClient } from 'pg';
import pool from '../config/database.js';

type DbClient = Pick<PoolClient, 'query'>;

export type AchievementKey =
  | 'first_task'
  | 'task_10'
  | 'task_25'
  | 'level_3'
  | 'level_5'
  | 'xp_500'
  | 'xp_1000'
  | 'first_unlock';

export type UserAchievement = {
  key: AchievementKey;
  name: string;
  description: string;
  badgeIcon: string;
  unlockedAt: string;
};

export type AchievementProgressItem = {
  key: AchievementKey;
  name: string;
  description: string;
  badgeIcon: string;
  isUnlocked: boolean;
  unlockedAt: string | null;
};

type AchievementDefinition = {
  key: AchievementKey;
  name: string;
  description: string;
  badgeIcon: string;
  isUnlocked: (stats: AchievementEvaluationStats) => boolean;
};

type AchievementEvaluationStats = {
  completedTaskCount: number;
  level: number;
  totalExperience: number;
  unlockedItemCount: number;
};

type EvaluateAchievementsResult = {
  newlyUnlocked: UserAchievement[];
};

const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  {
    key: 'first_task',
    name: 'First Task',
    description: 'Complete your first task.',
    badgeIcon: '\u{1F3AF}',
    isUnlocked: (stats) => stats.completedTaskCount >= 1,
  },
  {
    key: 'task_10',
    name: 'Task Apprentice',
    description: 'Complete 10 tasks.',
    badgeIcon: '\u{2705}',
    isUnlocked: (stats) => stats.completedTaskCount >= 10,
  },
  {
    key: 'task_25',
    name: 'Task Expert',
    description: 'Complete 25 tasks.',
    badgeIcon: '\u{1F4DD}',
    isUnlocked: (stats) => stats.completedTaskCount >= 25,
  },
  {
    key: 'level_3',
    name: 'Level 3 Reached',
    description: 'Reach slime level 3.',
    badgeIcon: '\u{1F31F}',
    isUnlocked: (stats) => stats.level >= 3,
  },
  {
    key: 'level_5',
    name: 'Level 5 Reached',
    description: 'Reach slime level 5.',
    badgeIcon: '\u{1F680}',
    isUnlocked: (stats) => stats.level >= 5,
  },
  {
    key: 'xp_500',
    name: '500 XP',
    description: 'Reach 500 total XP.',
    badgeIcon: '\u{2B50}',
    isUnlocked: (stats) => stats.totalExperience >= 500,
  },
  {
    key: 'xp_1000',
    name: '1000 XP',
    description: 'Reach 1000 total XP.',
    badgeIcon: '\u{1F48E}',
    isUnlocked: (stats) => stats.totalExperience >= 1000,
  },
  {
    key: 'first_unlock',
    name: 'First Unlock',
    description: 'Unlock your first cosmetic item.',
    badgeIcon: '\u{1F511}',
    isUnlocked: (stats) => stats.unlockedItemCount >= 1,
  },
];

const ACHIEVEMENT_KEYS = ACHIEVEMENT_DEFINITIONS.map((definition) => definition.key);

const isAchievementKey = (value: unknown): value is AchievementKey => {
  return typeof value === 'string' && ACHIEVEMENT_KEYS.includes(value as AchievementKey);
};

let schemaInitializationPromise: Promise<void> | null = null;

const ensureAchievementsSchema = async () => {
  if (schemaInitializationPromise) {
    return schemaInitializationPromise;
  }

  schemaInitializationPromise = (async () => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS achievements (
        id SERIAL PRIMARY KEY,
        achievement_key VARCHAR(64) UNIQUE,
        name VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        badge_icon VARCHAR(32) NOT NULL DEFAULT '',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      ALTER TABLE achievements
      ADD COLUMN IF NOT EXISTS achievement_key VARCHAR(64);
    `);

    await pool.query(`
      ALTER TABLE achievements
      ADD COLUMN IF NOT EXISTS name VARCHAR(100);
    `);

    await pool.query(`
      ALTER TABLE achievements
      ADD COLUMN IF NOT EXISTS description TEXT;
    `);

    await pool.query(`
      ALTER TABLE achievements
      ADD COLUMN IF NOT EXISTS badge_icon VARCHAR(32);
    `);

    await pool.query(`
      ALTER TABLE achievements
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
    `);

    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_achievements_achievement_key
      ON achievements (achievement_key);
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_achievements (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        achievement_id INTEGER NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
        unlocked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (user_id, achievement_id)
      );
    `);

    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_user_achievements_user_achievement
      ON user_achievements (user_id, achievement_id);
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_customization_inventory (
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        item_id VARCHAR(80) NOT NULL,
        unlocked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, item_id)
      );
    `);

    for (const definition of ACHIEVEMENT_DEFINITIONS) {
      await pool.query(
        `INSERT INTO achievements (achievement_key, name, description, badge_icon)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (achievement_key)
         DO UPDATE SET
           name = EXCLUDED.name,
           description = EXCLUDED.description,
           badge_icon = EXCLUDED.badge_icon`,
        [definition.key, definition.name, definition.description, definition.badgeIcon],
      );
    }
  })();

  try {
    await schemaInitializationPromise;
  } catch (error) {
    schemaInitializationPromise = null;
    throw error;
  }
};

const toUserAchievement = (row: Record<string, unknown>): UserAchievement | null => {
  const key = row.achievement_key;
  if (!isAchievementKey(key)) {
    return null;
  }

  return {
    key,
    name: String(row.name),
    description: String(row.description),
    badgeIcon: String(row.badge_icon ?? ''),
    unlockedAt: String(row.unlocked_at),
  };
};

const getEvaluationStats = async (db: DbClient, userId: number): Promise<AchievementEvaluationStats> => {
  const [tasksResult, slimeResult, unlockedResult] = await Promise.all([
    db.query(
      `SELECT COUNT(*)::int AS completed_count
       FROM tasks
       WHERE user_id = $1
         AND status = 'completed'`,
      [userId],
    ),
    db.query(
      `SELECT level, experience
       FROM slimes
       WHERE user_id = $1`,
      [userId],
    ),
    db.query(
      `SELECT COUNT(*)::int AS unlocked_count
       FROM user_customization_inventory
       WHERE user_id = $1`,
      [userId],
    ),
  ]);

  const slimeRow = slimeResult.rows[0] as { level?: number; experience?: number } | undefined;

  return {
    completedTaskCount: Number(tasksResult.rows[0]?.completed_count ?? 0),
    level: Number(slimeRow?.level ?? 1),
    totalExperience: Number(slimeRow?.experience ?? 0),
    unlockedItemCount: Number(unlockedResult.rows[0]?.unlocked_count ?? 0),
  };
};

const getUnlockedAchievementKeys = async (db: DbClient, userId: number): Promise<Set<AchievementKey>> => {
  const result = await db.query(
    `SELECT a.achievement_key
     FROM user_achievements ua
     JOIN achievements a ON a.id = ua.achievement_id
     WHERE ua.user_id = $1
       AND a.achievement_key IS NOT NULL`,
    [userId],
  );

  const unlockedKeys = new Set<AchievementKey>();
  for (const row of result.rows as Array<{ achievement_key: string | null }>) {
    if (isAchievementKey(row.achievement_key)) {
      unlockedKeys.add(row.achievement_key);
    }
  }

  return unlockedKeys;
};

const insertUnlockedAchievements = async (
  db: DbClient,
  userId: number,
  achievementKeys: AchievementKey[],
): Promise<UserAchievement[]> => {
  if (achievementKeys.length === 0) {
    return [];
  }

  const result = await db.query(
    `WITH inserted AS (
      INSERT INTO user_achievements (user_id, achievement_id)
      SELECT $1, a.id
      FROM achievements a
      WHERE a.achievement_key = ANY($2::text[])
      ON CONFLICT (user_id, achievement_id) DO NOTHING
      RETURNING achievement_id, unlocked_at
    )
    SELECT
      a.achievement_key,
      a.name,
      a.description,
      a.badge_icon,
      inserted.unlocked_at
    FROM inserted
    JOIN achievements a ON a.id = inserted.achievement_id
    ORDER BY inserted.unlocked_at DESC`,
    [userId, achievementKeys],
  );

  return result.rows
    .map((row) => toUserAchievement(row as Record<string, unknown>))
    .filter((achievement): achievement is UserAchievement => achievement !== null);
};

export const getUserAchievementsWithClient = async (db: DbClient, userId: number): Promise<UserAchievement[]> => {
  await ensureAchievementsSchema();

  const result = await db.query(
    `SELECT
      a.achievement_key,
      a.name,
      a.description,
      a.badge_icon,
      ua.unlocked_at
     FROM user_achievements ua
     JOIN achievements a ON a.id = ua.achievement_id
     WHERE ua.user_id = $1
       AND a.achievement_key IS NOT NULL
     ORDER BY ua.unlocked_at DESC, a.id DESC`,
    [userId],
  );

  return result.rows
    .map((row) => toUserAchievement(row as Record<string, unknown>))
    .filter((achievement): achievement is UserAchievement => achievement !== null);
};

export const getUserAchievements = async (userId: number) => {
  return getUserAchievementsWithClient(pool, userId);
};

export const getAchievementProgressWithClient = async (db: DbClient, userId: number): Promise<AchievementProgressItem[]> => {
  await ensureAchievementsSchema();

  const unlockedAchievements = await getUserAchievementsWithClient(db, userId);
  const unlockedByKey = new Map<AchievementKey, UserAchievement>();
  for (const achievement of unlockedAchievements) {
    unlockedByKey.set(achievement.key, achievement);
  }

  return ACHIEVEMENT_DEFINITIONS.map((definition) => {
    const unlocked = unlockedByKey.get(definition.key);
    return {
      key: definition.key,
      name: definition.name,
      description: definition.description,
      badgeIcon: definition.badgeIcon,
      isUnlocked: Boolean(unlocked),
      unlockedAt: unlocked?.unlockedAt ?? null,
    };
  });
};

export const getAchievementProgress = async (userId: number) => {
  return getAchievementProgressWithClient(pool, userId);
};

export const evaluateAndUnlockAchievementsWithClient = async (
  db: DbClient,
  userId: number,
): Promise<EvaluateAchievementsResult> => {
  await ensureAchievementsSchema();

  const [stats, unlockedKeys] = await Promise.all([getEvaluationStats(db, userId), getUnlockedAchievementKeys(db, userId)]);

  const achievementKeysToUnlock = ACHIEVEMENT_DEFINITIONS.filter(
    (definition) => !unlockedKeys.has(definition.key) && definition.isUnlocked(stats),
  ).map((definition) => definition.key);

  const newlyUnlocked = await insertUnlockedAchievements(db, userId, achievementKeysToUnlock);
  return { newlyUnlocked };
};

export const evaluateAndUnlockAchievements = async (userId: number) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await evaluateAndUnlockAchievementsWithClient(client, userId);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const resetUserAchievementsWithClient = async (db: DbClient, userId: number) => {
  await ensureAchievementsSchema();
  const result = await db.query(
    `DELETE FROM user_achievements
     WHERE user_id = $1`,
    [userId],
  );

  return {
    deletedCount: result.rowCount ?? 0,
  };
};

export const resetUserAchievements = async (userId: number) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await resetUserAchievementsWithClient(client, userId);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
