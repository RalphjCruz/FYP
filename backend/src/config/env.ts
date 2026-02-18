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

export const env = {
  port: Number(process.env.PORT ?? 3000),
  nodeEnv,
  databaseUrl: process.env.DATABASE_URL ?? 'postgresql://user:password@db:5432/myslime',
  jwtSecret: process.env.JWT_SECRET ?? DEFAULT_JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '2h',
  corsOrigins,
};

if (!process.env.JWT_SECRET) {
  console.warn('JWT_SECRET is not set. Using default dev secret.');
}

if (env.nodeEnv === 'production' && env.corsOrigins.length === 0) {
  console.warn('CORS_ORIGIN is empty in production. Browser requests will be blocked.');
}
