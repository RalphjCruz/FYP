import pool from '../config/database.js';
import { ensureUserAccountSchema } from './authAccountService.js';

type UserExportRow = {
  id: number;
  email: string;
  username: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type SlimeExportRow = Record<string, unknown>;
type GenericRow = Record<string, unknown>;

export class AccountServiceError extends Error {
  constructor(
    public readonly code: 'ACCOUNT_NOT_FOUND',
    message: string,
  ) {
    super(message);
    this.name = 'AccountServiceError';
  }
}

const tableExists = async (tableName: string) => {
  const result = await pool.query<{ regclass: string | null }>(
    `SELECT to_regclass($1) AS regclass`,
    [`public.${tableName}`],
  );

  return Boolean(result.rows[0]?.regclass);
};

const queryIfTableExists = async <T extends GenericRow = GenericRow>(tableName: string, sql: string, params: unknown[]) => {
  if (!(await tableExists(tableName))) {
    return [] as T[];
  }

  const result = await pool.query<T>(sql, params);
  return result.rows;
};

const queryOneIfTableExists = async <T extends GenericRow = GenericRow>(tableName: string, sql: string, params: unknown[]) => {
  if (!(await tableExists(tableName))) {
    return null as T | null;
  }

  const result = await pool.query<T>(sql, params);
  return result.rows[0] ?? null;
};

export const buildAccountDataExport = async (userId: number) => {
  await ensureUserAccountSchema();

  const userResult = await pool.query<UserExportRow>(
    `SELECT id, email, username, is_active, created_at, updated_at
     FROM users
     WHERE id = $1`,
    [userId],
  );

  const user = userResult.rows[0];
  if (!user) {
    throw new AccountServiceError('ACCOUNT_NOT_FOUND', 'Account not found');
  }

  const slime = await queryOneIfTableExists<SlimeExportRow>(
    'slimes',
    `SELECT id, user_id, name, level, experience, color, evolution_stage, created_at, updated_at
     FROM slimes
     WHERE user_id = $1`,
    [userId],
  );
  const tasks = await queryIfTableExists(
    'tasks',
    `SELECT id, user_id, title, description, priority, status, deadline, completed_at, experience_reward, created_at, updated_at
     FROM tasks
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId],
  );
  const focusSessions = await queryIfTableExists(
    'focus_sessions',
    `SELECT id, user_id, duration_minutes, completed_at_utc, timezone_iana, local_day_key, created_at
     FROM focus_sessions
     WHERE user_id = $1
     ORDER BY completed_at_utc DESC`,
    [userId],
  );
  const studyDaily = await queryIfTableExists(
    'user_study_daily',
    `SELECT user_id, local_day, focused_minutes, goal_minutes, session_count, updated_at
     FROM user_study_daily
     WHERE user_id = $1
     ORDER BY local_day DESC`,
    [userId],
  );
  const studyStats = await queryOneIfTableExists(
    'user_study_stats',
    `SELECT *
     FROM user_study_stats
     WHERE user_id = $1`,
    [userId],
  );
  const achievements = await queryIfTableExists(
    'user_achievements',
    `SELECT ua.id, ua.user_id, ua.achievement_id, ua.unlocked_at, a.name, a.description, a.badge_icon, a.experience_reward
     FROM user_achievements ua
     JOIN achievements a ON a.id = ua.achievement_id
     WHERE ua.user_id = $1
     ORDER BY ua.unlocked_at DESC`,
    [userId],
  );
  const wallet = await queryOneIfTableExists(
    'customization_wallets',
    `SELECT user_id, coins, last_daily_claim_at, updated_at
     FROM customization_wallets
     WHERE user_id = $1`,
    [userId],
  );
  const inventory = await queryIfTableExists(
    'user_customization_inventory',
    `SELECT user_id, item_id, unlocked_at
     FROM user_customization_inventory
     WHERE user_id = $1
     ORDER BY unlocked_at DESC`,
    [userId],
  );
  const loadout = await queryIfTableExists(
    'user_customization_loadout',
    `SELECT user_id, slot_key, item_id, equipped_at
     FROM user_customization_loadout
     WHERE user_id = $1`,
    [userId],
  );
  const xpEvents = await queryIfTableExists(
    'slime_xp_events',
    `SELECT id, user_id, xp_amount, reason, created_at
     FROM slime_xp_events
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId],
  );
  const authAuditLogs = await queryIfTableExists(
    'auth_audit_logs',
    `SELECT id, user_id, email, ip_address, event_type, details, created_at
     FROM auth_audit_logs
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId],
  );

  return {
    format: 'json' as const,
    exportedAt: new Date().toISOString(),
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      isActive: user.is_active,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    },
    domains: {
      slime: slime ?? null,
      tasks,
      focus: {
        sessions: focusSessions,
        dailyAggregates: studyDaily,
        studyStats: studyStats ?? null,
      },
      achievements: {
        unlocked: achievements,
      },
      customization: {
        wallet: wallet ?? null,
        inventory,
        loadout,
      },
      xpEvents,
      security: {
        authAuditLogs,
      },
    },
  };
};

