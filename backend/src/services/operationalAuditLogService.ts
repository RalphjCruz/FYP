import pool from '../config/database.js';

type DbClient = Pick<typeof pool, 'query'>;

export type OperationalAuditEventType =
  | 'account_export_requested'
  | 'account_deletion_requested'
  | 'account_deletion_cancelled'
  | 'account_purge_executed'
  | 'account_purge_failed';

export type OperationalAuditEvent = {
  eventType: OperationalAuditEventType;
  actorUserId?: number | null;
  metadata?: Record<string, unknown> | null;
};

let isOperationalAuditSchemaReady = false;

export const ensureOperationalAuditSchema = async (db: DbClient = pool) => {
  if (isOperationalAuditSchemaReady) {
    return;
  }

  await db.query(`
    CREATE TABLE IF NOT EXISTS operational_audit_logs (
      id BIGSERIAL PRIMARY KEY,
      event_type VARCHAR(128) NOT NULL,
      actor_user_id INTEGER NULL,
      metadata_json JSONB NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(
    `CREATE INDEX IF NOT EXISTS idx_operational_audit_logs_event_type_created_at
     ON operational_audit_logs(event_type, created_at DESC)`,
  );
  await db.query(
    `CREATE INDEX IF NOT EXISTS idx_operational_audit_logs_actor_created_at
     ON operational_audit_logs(actor_user_id, created_at DESC)`,
  );

  isOperationalAuditSchemaReady = true;
};

export const logOperationalAuditEvent = async (event: OperationalAuditEvent, db: DbClient = pool) => {
  await ensureOperationalAuditSchema(db);
  await db.query(
    `INSERT INTO operational_audit_logs (event_type, actor_user_id, metadata_json)
     VALUES ($1, $2, $3::jsonb)`,
    [event.eventType, event.actorUserId ?? null, JSON.stringify(event.metadata ?? null)],
  );
};
