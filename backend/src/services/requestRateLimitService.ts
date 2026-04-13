import crypto from 'crypto';
import pool from '../config/database.js';

type DbClient = Pick<typeof pool, 'query'>;

type ConsumeRateLimitInput = {
  keyHash: string;
  routeKey: string;
  limit: number;
  windowSeconds: number;
  now?: Date;
};

type ConsumeRateLimitResult = {
  allowed: boolean;
  requestCount: number;
  retryAfterSeconds: number;
};

let isRateLimitSchemaReady = false;

export const ensureRequestRateLimitSchema = async (db: DbClient = pool) => {
  if (isRateLimitSchemaReady) {
    return;
  }

  await db.query(`
    CREATE TABLE IF NOT EXISTS request_rate_limits (
      key_hash VARCHAR(128) NOT NULL,
      route_key VARCHAR(128) NOT NULL,
      window_start TIMESTAMP NOT NULL,
      request_count INTEGER NOT NULL DEFAULT 0,
      expires_at TIMESTAMP NOT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (key_hash, route_key, window_start)
    )
  `);

  await db.query(`CREATE INDEX IF NOT EXISTS idx_request_rate_limits_expires_at ON request_rate_limits(expires_at)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_request_rate_limits_route_key ON request_rate_limits(route_key)`);
  isRateLimitSchemaReady = true;
};

const normalizeWindowStart = (timestamp: Date, windowSeconds: number) => {
  const safeWindowSeconds = Math.max(1, Math.round(windowSeconds));
  const windowMs = safeWindowSeconds * 1000;
  return new Date(Math.floor(timestamp.getTime() / windowMs) * windowMs);
};

export const consumeRateLimit = async (
  input: ConsumeRateLimitInput,
  db: DbClient = pool,
): Promise<ConsumeRateLimitResult> => {
  const safeLimit = Math.max(1, Math.round(input.limit));
  const safeWindowSeconds = Math.max(1, Math.round(input.windowSeconds));
  const now = input.now ?? new Date();

  await ensureRequestRateLimitSchema(db);
  await db.query(`DELETE FROM request_rate_limits WHERE expires_at < CURRENT_TIMESTAMP - INTERVAL '1 day'`);

  const windowStart = normalizeWindowStart(now, safeWindowSeconds);
  const expiresAt = new Date(windowStart.getTime() + safeWindowSeconds * 1000);

  const result = await db.query<{ request_count: number; expires_at: string }>(
    `INSERT INTO request_rate_limits (key_hash, route_key, window_start, request_count, expires_at)
     VALUES ($1, $2, $3, 1, $4)
     ON CONFLICT (key_hash, route_key, window_start)
     DO UPDATE SET
       request_count = request_rate_limits.request_count + 1,
       updated_at = CURRENT_TIMESTAMP
     RETURNING request_count, expires_at`,
    [input.keyHash, input.routeKey, windowStart.toISOString(), expiresAt.toISOString()],
  );

  const requestCount = Number(result.rows[0]?.request_count ?? 0);
  const expiresAtIso = result.rows[0]?.expires_at ?? expiresAt.toISOString();
  const retryAfterSeconds = Math.max(1, Math.ceil((new Date(expiresAtIso).getTime() - now.getTime()) / 1000));

  return {
    allowed: requestCount <= safeLimit,
    requestCount,
    retryAfterSeconds,
  };
};

export const hashRateLimitKey = (raw: string, secret: string) => {
  return crypto.createHash('sha256').update(`${secret}:${raw}`).digest('hex');
};

