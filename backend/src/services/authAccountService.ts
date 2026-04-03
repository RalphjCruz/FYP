import bcrypt from 'bcrypt';
import type { PoolClient } from 'pg';
import pool from '../config/database.js';

type UserRow = {
  id: number;
  email: string;
  username: string;
  password_hash: string;
  created_at: string;
};

type PublicUser = {
  id: number;
  email: string;
  username: string;
  createdAt: string;
};

export type AuthUserCredentials = {
  id: number;
  email: string;
  username: string;
  passwordHash: string;
  createdAt: string;
};

export class AuthAccountServiceError extends Error {
  constructor(
    public readonly code: 'EMAIL_IN_USE' | 'USERNAME_IN_USE' | 'USER_EXISTS',
    message: string,
  ) {
    super(message);
    this.name = 'AuthAccountServiceError';
  }
}

const toPublicUser = (row: UserRow): PublicUser => ({
  id: row.id,
  email: row.email,
  username: row.username,
  createdAt: row.created_at,
});

const toAuthUserCredentials = (row: UserRow): AuthUserCredentials => ({
  id: row.id,
  email: row.email,
  username: row.username,
  passwordHash: row.password_hash,
  createdAt: row.created_at,
});

const NEW_USER_DEFAULT_COINS = 250;

const USER_SCOPED_PROGRESS_TABLES = [
  'tasks',
  'focus_sessions',
  'user_study_daily',
  'user_study_stats',
  'user_achievements',
  'user_customization_inventory',
  'user_customization_loadout',
  'customization_wallets',
  'slime_xp_events',
] as const;

const tableExists = async (client: PoolClient, tableName: (typeof USER_SCOPED_PROGRESS_TABLES)[number]) => {
  const result = await client.query<{ regclass: string | null }>(
    `SELECT to_regclass($1) AS regclass`,
    [`public.${tableName}`],
  );

  return Boolean(result.rows[0]?.regclass);
};

const deleteUserProgressIfTableExists = async (
  client: PoolClient,
  userId: number,
  tableName: (typeof USER_SCOPED_PROGRESS_TABLES)[number],
) => {
  if (!(await tableExists(client, tableName))) {
    return;
  }

  await client.query(
    `DELETE FROM ${tableName}
     WHERE user_id = $1`,
    [userId],
  );
};

const resetNewUserProgressState = async (client: PoolClient, userId: number) => {
  for (const tableName of USER_SCOPED_PROGRESS_TABLES) {
    await deleteUserProgressIfTableExists(client, userId, tableName);
  }

  if (await tableExists(client, 'customization_wallets')) {
    await client.query(
      `INSERT INTO customization_wallets (user_id, coins, last_daily_claim_at, updated_at)
       VALUES ($1, $2, NULL, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id)
       DO UPDATE SET
         coins = EXCLUDED.coins,
         last_daily_claim_at = NULL,
         updated_at = CURRENT_TIMESTAMP`,
      [userId, NEW_USER_DEFAULT_COINS],
    );
  }
};

export const registerUserWithSlime = async (input: {
  username: string;
  email: string;
  password: string;
  passwordHashRounds: number;
}) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const passwordHash = await bcrypt.hash(input.password, input.passwordHashRounds);

    const userResult = await client.query<UserRow>(
      `INSERT INTO users (email, password_hash, username)
       VALUES ($1, $2, $3)
       RETURNING id, email, username, password_hash, created_at`,
      [input.email, passwordHash, input.username],
    );

    const user = userResult.rows[0];

    await client.query(
      `INSERT INTO slimes (user_id, name, level, experience, color, evolution_stage)
       VALUES ($1, $2, 1, 0, 'green', 1)`,
      [user.id, `${input.username}'s Slime`],
    );
    await resetNewUserProgressState(client, user.id);

    await client.query('COMMIT');

    return {
      user: toPublicUser(user),
    };
  } catch (error) {
    await client.query('ROLLBACK');

    const pgError = error as { code?: string; detail?: string };
    if (pgError.code === '23505') {
      if (pgError.detail?.includes('(email)')) {
        throw new AuthAccountServiceError('EMAIL_IN_USE', 'Email already in use');
      }

      if (pgError.detail?.includes('(username)')) {
        throw new AuthAccountServiceError('USERNAME_IN_USE', 'Username already in use');
      }

      throw new AuthAccountServiceError('USER_EXISTS', 'User already exists');
    }

    throw error;
  } finally {
    client.release();
  }
};

export const findUserCredentialsByEmail = async (email: string): Promise<AuthUserCredentials | null> => {
  const result = await pool.query<UserRow>(
    `SELECT id, email, username, password_hash, created_at
     FROM users
     WHERE email = $1`,
    [email],
  );

  const user = result.rows[0];
  if (!user) {
    return null;
  }

  return toAuthUserCredentials(user);
};

export const isPasswordMatch = async (password: string, passwordHash: string) => {
  return bcrypt.compare(password, passwordHash);
};

export const getUserProfileById = async (userId: number): Promise<PublicUser | null> => {
  const result = await pool.query<{ id: number; email: string; username: string; created_at: string }>(
    `SELECT id, email, username, created_at
     FROM users
     WHERE id = $1`,
    [userId],
  );

  const user = result.rows[0];
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    username: user.username,
    createdAt: user.created_at,
  };
};
