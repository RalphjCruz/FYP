import dotenv from 'dotenv';

dotenv.config();

const DEFAULT_JWT_SECRET = 'replace-this-jwt-secret-in-production';
const DEFAULT_DEV_CORS_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost'];

const parseCorsOrigins = (raw: string | undefined, nodeEnv: string) => {
  const fallback = nodeEnv === 'production' ? [] : DEFAULT_DEV_CORS_ORIGINS;
  const source = raw ?? fallback.join(',');

  return source
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
};

const nodeEnv = process.env.NODE_ENV ?? 'development';
const corsOrigins = parseCorsOrigins(process.env.CORS_ORIGIN, nodeEnv);
const jwtSecret = process.env.JWT_SECRET ?? DEFAULT_JWT_SECRET;
const parsePositiveIntEnv = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
};

const isWeakJwtSecret = (secret: string) => {
  if (secret.length < 32) {
    return true;
  }

  const normalizedSecret = secret.toLowerCase();
  const blockedPatterns = ['changeme', 'replace-this', 'dev_super_secret', 'secret', 'password'];

  return blockedPatterns.some((pattern) => normalizedSecret.includes(pattern));
};

export const env = {
  port: Number(process.env.PORT ?? 3000),
  nodeEnv,
  databaseUrl: process.env.DATABASE_URL ?? 'postgresql://user:password@db:5432/myslime',
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '30m',
  rateLimitSecret: process.env.RATE_LIMIT_SECRET ?? 'dev-rate-limit-secret',
  accountDeletionGraceDays: parsePositiveIntEnv(process.env.ACCOUNT_DELETION_GRACE_DAYS, 7),
  accountPurgeBatchSize: parsePositiveIntEnv(process.env.ACCOUNT_PURGE_BATCH_SIZE, 100),
  accountExportRateLimitPerWindow: parsePositiveIntEnv(process.env.ACCOUNT_EXPORT_RATE_LIMIT_PER_WINDOW, 1),
  accountExportRateLimitWindowSeconds: parsePositiveIntEnv(process.env.ACCOUNT_EXPORT_RATE_LIMIT_WINDOW_SECONDS, 3600),
  corsOrigins,
};

if (!process.env.JWT_SECRET) {
  console.warn('JWT_SECRET is not set. Using default dev secret.');
}

if (env.nodeEnv === 'production' && env.corsOrigins.length === 0) {
  throw new Error('Invalid production configuration: CORS_ORIGIN must be set.');
}

if (env.nodeEnv === 'production' && isWeakJwtSecret(env.jwtSecret)) {
  throw new Error('Invalid production configuration: JWT_SECRET is missing or too weak.');
}
