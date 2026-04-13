import pool from '../config/database.js';
import { env } from '../config/env.js';
import { ensureUserDeletionRequestSchema } from './accountDeletionService.js';
import { logOperationalAuditEvent } from './operationalAuditLogService.js';

type DbPool = Pick<typeof pool, 'query' | 'connect'>;
type DbClient = {
  query: typeof pool.query;
  release: () => void;
};

type DueDeletionRequestRow = {
  id: number;
  user_id: number;
  scheduled_purge_at: string;
};

type PurgeLockRow = {
  id: number;
  user_id: number;
  status: string;
  scheduled_purge_at: string;
  email: string | null;
};

type PurgeFailure = {
  requestId: number;
  userId: number;
  reason: string;
};

export type AccountPurgeJobResult = {
  scannedCount: number;
  purgedCount: number;
  failedCount: number;
  failures: PurgeFailure[];
};

const MAX_ERROR_LENGTH = 512;

const toErrorMessage = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error ?? 'Unknown purge error');
  return message.slice(0, MAX_ERROR_LENGTH);
};

const tableExists = async (client: DbClient, tableName: string) => {
  const result = await client.query<{ regclass: string | null }>(
    `SELECT to_regclass($1) AS regclass`,
    [`public.${tableName}`],
  );

  return Boolean(result.rows[0]?.regclass);
};

const cleanupNonCascadeArtifacts = async (client: DbClient, userId: number, email: string) => {
  if (await tableExists(client, 'auth_login_guards')) {
    await client.query(
      `DELETE FROM auth_login_guards
       WHERE email = $1`,
      [email],
    );
  }

  if (await tableExists(client, 'auth_audit_logs')) {
    await client.query(
      `DELETE FROM auth_audit_logs
       WHERE user_id = $1
          OR email = $2`,
      [userId, email],
    );
  }
};

export const purgeSingleAccountDeletionRequest = async (
  requestId: number,
  now: Date = new Date(),
  db: DbPool = pool,
): Promise<boolean> => {
  const client = (await db.connect()) as unknown as DbClient;

  try {
    await client.query('BEGIN');

    const lockResult = await client.query<PurgeLockRow>(
      `SELECT dr.id, dr.user_id, dr.status, dr.scheduled_purge_at, u.email
       FROM user_deletion_requests dr
       LEFT JOIN users u ON u.id = dr.user_id
       WHERE dr.id = $1
       FOR UPDATE`,
      [requestId],
    );
    const row = lockResult.rows[0];
    if (!row) {
      await client.query('COMMIT');
      return false;
    }

    if (row.status !== 'pending') {
      await client.query('COMMIT');
      return false;
    }

    const scheduledAt = new Date(row.scheduled_purge_at);
    if (scheduledAt.getTime() > now.getTime() || !row.email) {
      await client.query('COMMIT');
      return false;
    }

    await cleanupNonCascadeArtifacts(client, row.user_id, row.email);

    const deleteUserResult = await client.query<{ id: number }>(
      `DELETE FROM users
       WHERE id = $1
       RETURNING id`,
      [row.user_id],
    );
    if (deleteUserResult.rows.length === 0) {
      await client.query('COMMIT');
      return false;
    }

    await logOperationalAuditEvent(
      {
        eventType: 'account_purge_executed',
        actorUserId: row.user_id,
        metadata: {
          deletionRequestId: row.id,
          scheduledPurgeAt: scheduledAt.toISOString(),
          executedAt: now.toISOString(),
        },
      },
      client,
    );

    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const markPurgeFailure = async (requestId: number, reason: string, db: Pick<typeof pool, 'query'> = pool) => {
  await db.query(
    `UPDATE user_deletion_requests
     SET purge_attempts = COALESCE(purge_attempts, 0) + 1,
         last_purge_error = $2,
         last_purge_attempt_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [requestId, reason],
  );
};

export const purgeDueAccountDeletionRequests = async (
  input: { now?: Date; batchSize?: number } = {},
  db: DbPool = pool,
): Promise<AccountPurgeJobResult> => {
  await ensureUserDeletionRequestSchema(db);
  const now = input.now ?? new Date();
  const batchSize = Number.isInteger(input.batchSize) && Number(input.batchSize) > 0
    ? Number(input.batchSize)
    : env.accountPurgeBatchSize;

  const dueResult = await db.query<DueDeletionRequestRow>(
    `SELECT id, user_id, scheduled_purge_at
     FROM user_deletion_requests
     WHERE status = 'pending'
       AND scheduled_purge_at <= $1
     ORDER BY scheduled_purge_at ASC
     LIMIT $2`,
    [now.toISOString(), batchSize],
  );

  const failures: PurgeFailure[] = [];
  let purgedCount = 0;

  for (const row of dueResult.rows) {
    try {
      const purged = await purgeSingleAccountDeletionRequest(row.id, now, db);
      if (purged) {
        purgedCount += 1;
      }
    } catch (error) {
      const reason = toErrorMessage(error);
      failures.push({ requestId: row.id, userId: row.user_id, reason });

      await markPurgeFailure(row.id, reason, db);
      await logOperationalAuditEvent(
        {
          eventType: 'account_purge_failed',
          actorUserId: row.user_id,
          metadata: {
            deletionRequestId: row.id,
            failedAt: now.toISOString(),
            reason,
          },
        },
        db,
      ).catch(() => undefined);
    }
  }

  return {
    scannedCount: dueResult.rows.length,
    purgedCount,
    failedCount: failures.length,
    failures,
  };
};
