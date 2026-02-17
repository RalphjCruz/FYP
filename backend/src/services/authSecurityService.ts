import pool from '../config/database.js';

const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_WINDOW_MINUTES = 15;
const ACCOUNT_LOCK_MINUTES = 15;

type AuthLoginGuardRow = {
  email: string;
  failed_attempts: number;
  window_started_at: string;
  locked_until: string | null;
};

type AuthSecurityStatus = {
  isLocked: boolean;
  lockedUntil: string | null;
  failedAttempts: number;
  remainingAttempts: number;
};

type AuthAuditEvent = {
  eventType:
    | 'register_success'
    | 'register_failed'
    | 'login_success'
    | 'login_failure'
    | 'login_locked'
    | 'login_blocked_locked';
  email: string;
  ipAddress: string;
  userId?: number | null;
  details?: string | null;
};

let isSchemaReady = false;

const now = () => new Date();

const addMinutes = (date: Date, minutes: number) => new Date(date.getTime() + minutes * 60_000);

const isOlderThanWindow = (windowStartedAt: string, at: Date) => {
  const windowStart = new Date(windowStartedAt).getTime();
  return at.getTime() - windowStart > LOGIN_WINDOW_MINUTES * 60_000;
};

const isLockActive = (lockedUntil: string | null, at: Date) => {
  if (!lockedUntil) {
    return false;
  }

  return new Date(lockedUntil).getTime() > at.getTime();
};

const toStatus = (row: AuthLoginGuardRow, at: Date): AuthSecurityStatus => {
  const lockActive = isLockActive(row.locked_until, at);
  const attemptsInWindow = isOlderThanWindow(row.window_started_at, at) ? 0 : row.failed_attempts;
  const remainingAttempts = Math.max(0, MAX_LOGIN_ATTEMPTS - attemptsInWindow);

  return {
    isLocked: lockActive,
    lockedUntil: lockActive ? row.locked_until : null,
    failedAttempts: attemptsInWindow,
    remainingAttempts,
  };
};

const ensureSchema = async () => {
  if (isSchemaReady) {
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS auth_login_guards (
      email VARCHAR(255) PRIMARY KEY,
      failed_attempts INTEGER NOT NULL DEFAULT 0,
      window_started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      locked_until TIMESTAMP NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS auth_audit_logs (
      id BIGSERIAL PRIMARY KEY,
      user_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
      email VARCHAR(255) NOT NULL,
      ip_address VARCHAR(128) NOT NULL,
      event_type VARCHAR(64) NOT NULL,
      details TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_auth_audit_logs_email_created_at
    ON auth_audit_logs(email, created_at DESC)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_auth_audit_logs_event_type_created_at
    ON auth_audit_logs(event_type, created_at DESC)
  `);

  isSchemaReady = true;
};

const getOrCreateGuard = async (email: string): Promise<AuthLoginGuardRow> => {
  const existing = await pool.query<AuthLoginGuardRow>(
    `SELECT email, failed_attempts, window_started_at, locked_until
     FROM auth_login_guards
     WHERE email = $1`,
    [email],
  );

  if (existing.rows[0]) {
    return existing.rows[0];
  }

  const inserted = await pool.query<AuthLoginGuardRow>(
    `INSERT INTO auth_login_guards (email, failed_attempts, window_started_at, locked_until)
     VALUES ($1, 0, CURRENT_TIMESTAMP, NULL)
     RETURNING email, failed_attempts, window_started_at, locked_until`,
    [email],
  );

  return inserted.rows[0];
};

const writeGuard = async (email: string, failedAttempts: number, windowStartedAt: Date, lockedUntil: Date | null) => {
  const result = await pool.query<AuthLoginGuardRow>(
    `UPDATE auth_login_guards
     SET failed_attempts = $2,
         window_started_at = $3,
         locked_until = $4,
         updated_at = CURRENT_TIMESTAMP
     WHERE email = $1
     RETURNING email, failed_attempts, window_started_at, locked_until`,
    [email, failedAttempts, windowStartedAt, lockedUntil],
  );

  return result.rows[0];
};

export const getClientIp = (requestIp: string | undefined, forwardedForHeader?: string | string[]) => {
  if (typeof forwardedForHeader === 'string' && forwardedForHeader.trim().length > 0) {
    const forwardedIp = forwardedForHeader.split(',')[0]?.trim();
    if (forwardedIp) {
      return forwardedIp;
    }
  }

  if (Array.isArray(forwardedForHeader) && forwardedForHeader.length > 0) {
    const first = forwardedForHeader[0]?.trim();
    if (first) {
      return first;
    }
  }

  return requestIp || 'unknown';
};

export const logAuthAuditEvent = async (event: AuthAuditEvent) => {
  await ensureSchema();

  await pool.query(
    `INSERT INTO auth_audit_logs (user_id, email, ip_address, event_type, details)
     VALUES ($1, $2, $3, $4, $5)`,
    [event.userId ?? null, event.email, event.ipAddress, event.eventType, event.details ?? null],
  );
};

export const getLoginSecurityStatus = async (email: string): Promise<AuthSecurityStatus> => {
  await ensureSchema();

  const currentGuard = await getOrCreateGuard(email);
  const currentTime = now();
  const currentlyLocked = isLockActive(currentGuard.locked_until, currentTime);

  if (currentlyLocked) {
    return toStatus(currentGuard, currentTime);
  }

  const lockExpired = Boolean(currentGuard.locked_until) && !currentlyLocked;
  const windowExpired = isOlderThanWindow(currentGuard.window_started_at, currentTime);

  if (lockExpired || windowExpired) {
    const resetGuard = await writeGuard(email, 0, currentTime, null);
    return toStatus(resetGuard, currentTime);
  }

  return toStatus(currentGuard, currentTime);
};

export const recordFailedLoginAttempt = async (
  email: string,
  ipAddress: string,
  userId?: number | null,
): Promise<AuthSecurityStatus> => {
  await ensureSchema();

  const currentGuard = await getOrCreateGuard(email);
  const currentTime = now();

  if (isLockActive(currentGuard.locked_until, currentTime)) {
    await logAuthAuditEvent({
      eventType: 'login_blocked_locked',
      email,
      ipAddress,
      userId,
      details: 'Login blocked because account is currently locked.',
    });

    return toStatus(currentGuard, currentTime);
  }

  const baseFailures = isOlderThanWindow(currentGuard.window_started_at, currentTime) ? 0 : currentGuard.failed_attempts;
  const failedAttempts = baseFailures + 1;
  const shouldLock = failedAttempts >= MAX_LOGIN_ATTEMPTS;
  const lockedUntil = shouldLock ? addMinutes(currentTime, ACCOUNT_LOCK_MINUTES) : null;
  const windowStartedAt = baseFailures === 0 ? currentTime : new Date(currentGuard.window_started_at);

  const updatedGuard = await writeGuard(email, failedAttempts, windowStartedAt, lockedUntil);

  await logAuthAuditEvent({
    eventType: shouldLock ? 'login_locked' : 'login_failure',
    email,
    ipAddress,
    userId,
    details: shouldLock
      ? `Too many failed logins. Account locked for ${ACCOUNT_LOCK_MINUTES} minutes.`
      : `Failed login attempt. ${Math.max(0, MAX_LOGIN_ATTEMPTS - failedAttempts)} attempts remaining in ${LOGIN_WINDOW_MINUTES} minutes.`,
  });

  return toStatus(updatedGuard, currentTime);
};

export const clearLoginFailures = async (email: string) => {
  await ensureSchema();

  await writeGuard(email, 0, now(), null);
};

export const getLoginSecurityPolicy = () => ({
  maxAttempts: MAX_LOGIN_ATTEMPTS,
  windowMinutes: LOGIN_WINDOW_MINUTES,
  lockMinutes: ACCOUNT_LOCK_MINUTES,
});
