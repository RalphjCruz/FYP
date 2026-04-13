import pool from '../config/database.js';
import { env } from '../config/env.js';

type DbClient = Pick<typeof pool, 'query'>;

type DeletionRequestStatus = 'pending' | 'cancelled' | 'purged';

type UserDeletionRequestRow = {
  user_id: number;
  status: DeletionRequestStatus;
  requested_at: string;
  scheduled_purge_at: string;
  cancelled_at: string | null;
};

export type AccountDeletionStatus = {
  status: 'none' | DeletionRequestStatus;
  requestedAt: string | null;
  scheduledPurgeAt: string | null;
  cancelledAt: string | null;
};

export type AccountDeletionActionResult = {
  status: 'pending' | 'cancelled' | 'none';
  requestedAt: string | null;
  scheduledPurgeAt: string | null;
  cancelledAt: string | null;
  idempotent: boolean;
};

let isDeletionSchemaReady = false;

const toIso = (value: unknown) => {
  if (typeof value !== 'string') {
    return new Date(value as string | number | Date).toISOString();
  }

  return new Date(value).toISOString();
};

const buildScheduledPurgeAt = (now: Date) => {
  const scheduled = new Date(now.getTime());
  scheduled.setUTCDate(scheduled.getUTCDate() + env.accountDeletionGraceDays);
  return scheduled;
};

export const ensureUserDeletionRequestSchema = async (db: DbClient = pool) => {
  if (isDeletionSchemaReady) {
    return;
  }

  await db.query(`
    CREATE TABLE IF NOT EXISTS user_deletion_requests (
      id BIGSERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      status VARCHAR(32) NOT NULL DEFAULT 'pending',
      requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      scheduled_purge_at TIMESTAMP NOT NULL,
      cancelled_at TIMESTAMP NULL,
      last_requested_ip VARCHAR(128) NULL,
      purge_attempts INTEGER NOT NULL DEFAULT 0,
      last_purge_error TEXT NULL,
      last_purge_attempt_at TIMESTAMP NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`ALTER TABLE user_deletion_requests ADD COLUMN IF NOT EXISTS purge_attempts INTEGER NOT NULL DEFAULT 0`);
  await db.query(`ALTER TABLE user_deletion_requests ADD COLUMN IF NOT EXISTS last_purge_error TEXT NULL`);
  await db.query(`ALTER TABLE user_deletion_requests ADD COLUMN IF NOT EXISTS last_purge_attempt_at TIMESTAMP NULL`);

  await db.query(
    `CREATE INDEX IF NOT EXISTS idx_user_deletion_requests_status_scheduled
     ON user_deletion_requests(status, scheduled_purge_at)`,
  );
  await db.query(
    `CREATE INDEX IF NOT EXISTS idx_user_deletion_requests_user_status
     ON user_deletion_requests(user_id, status)`,
  );
  isDeletionSchemaReady = true;
};

const getUserDeletionRequest = async (userId: number, db: DbClient = pool): Promise<UserDeletionRequestRow | null> => {
  const result = await db.query<UserDeletionRequestRow>(
    `SELECT user_id, status, requested_at, scheduled_purge_at, cancelled_at
     FROM user_deletion_requests
     WHERE user_id = $1`,
    [userId],
  );

  return result.rows[0] ?? null;
};

export const getAccountDeletionStatus = async (userId: number, db: DbClient = pool): Promise<AccountDeletionStatus> => {
  await ensureUserDeletionRequestSchema(db);
  const row = await getUserDeletionRequest(userId, db);

  if (!row) {
    return {
      status: 'none',
      requestedAt: null,
      scheduledPurgeAt: null,
      cancelledAt: null,
    };
  }

  return {
    status: row.status,
    requestedAt: toIso(row.requested_at),
    scheduledPurgeAt: toIso(row.scheduled_purge_at),
    cancelledAt: row.cancelled_at ? toIso(row.cancelled_at) : null,
  };
};

export const requestAccountDeletion = async (
  userId: number,
  requestedIpAddress: string,
  db: DbClient = pool,
  now: Date = new Date(),
): Promise<AccountDeletionActionResult> => {
  await ensureUserDeletionRequestSchema(db);
  const existing = await getUserDeletionRequest(userId, db);
  const scheduledPurgeAt = buildScheduledPurgeAt(now);

  if (existing?.status === 'pending') {
    return {
      status: 'pending',
      requestedAt: toIso(existing.requested_at),
      scheduledPurgeAt: toIso(existing.scheduled_purge_at),
      cancelledAt: existing.cancelled_at ? toIso(existing.cancelled_at) : null,
      idempotent: true,
    };
  }

  if (!existing) {
    const inserted = await db.query<UserDeletionRequestRow>(
      `INSERT INTO user_deletion_requests (
          user_id,
          status,
          requested_at,
          scheduled_purge_at,
          cancelled_at,
          last_requested_ip,
          updated_at
       )
       VALUES ($1, 'pending', $2, $3, NULL, $4, CURRENT_TIMESTAMP)
       RETURNING user_id, status, requested_at, scheduled_purge_at, cancelled_at`,
      [userId, now.toISOString(), scheduledPurgeAt.toISOString(), requestedIpAddress],
    );
    const row = inserted.rows[0];

    return {
      status: 'pending',
      requestedAt: toIso(row.requested_at),
      scheduledPurgeAt: toIso(row.scheduled_purge_at),
      cancelledAt: row.cancelled_at ? toIso(row.cancelled_at) : null,
      idempotent: false,
    };
  }

  const updated = await db.query<UserDeletionRequestRow>(
    `UPDATE user_deletion_requests
     SET status = 'pending',
         requested_at = $2,
         scheduled_purge_at = $3,
         cancelled_at = NULL,
         last_requested_ip = $4,
         updated_at = CURRENT_TIMESTAMP
     WHERE user_id = $1
     RETURNING user_id, status, requested_at, scheduled_purge_at, cancelled_at`,
    [userId, now.toISOString(), scheduledPurgeAt.toISOString(), requestedIpAddress],
  );
  const row = updated.rows[0];

  return {
    status: 'pending',
    requestedAt: toIso(row.requested_at),
    scheduledPurgeAt: toIso(row.scheduled_purge_at),
    cancelledAt: row.cancelled_at ? toIso(row.cancelled_at) : null,
    idempotent: false,
  };
};

export const cancelAccountDeletion = async (
  userId: number,
  db: DbClient = pool,
  now: Date = new Date(),
): Promise<AccountDeletionActionResult> => {
  await ensureUserDeletionRequestSchema(db);
  const existing = await getUserDeletionRequest(userId, db);

  if (!existing) {
    return {
      status: 'none',
      requestedAt: null,
      scheduledPurgeAt: null,
      cancelledAt: null,
      idempotent: true,
    };
  }

  if (existing.status !== 'pending') {
    return {
      status: existing.status === 'cancelled' ? 'cancelled' : 'none',
      requestedAt: toIso(existing.requested_at),
      scheduledPurgeAt: toIso(existing.scheduled_purge_at),
      cancelledAt: existing.cancelled_at ? toIso(existing.cancelled_at) : null,
      idempotent: true,
    };
  }

  const updated = await db.query<UserDeletionRequestRow>(
    `UPDATE user_deletion_requests
     SET status = 'cancelled',
         cancelled_at = $2,
         updated_at = CURRENT_TIMESTAMP
     WHERE user_id = $1
     RETURNING user_id, status, requested_at, scheduled_purge_at, cancelled_at`,
    [userId, now.toISOString()],
  );
  const row = updated.rows[0];

  return {
    status: 'cancelled',
    requestedAt: toIso(row.requested_at),
    scheduledPurgeAt: toIso(row.scheduled_purge_at),
    cancelledAt: row.cancelled_at ? toIso(row.cancelled_at) : null,
    idempotent: false,
  };
};
