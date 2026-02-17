import dotenv from 'dotenv';

dotenv.config();

const DEFAULT_JWT_SECRET = 'replace-this-jwt-secret-in-production';

export const env = {
  port: Number(process.env.PORT ?? 3000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  databaseUrl: process.env.DATABASE_URL ?? 'postgresql://user:password@db:5432/myslime',
  jwtSecret: process.env.JWT_SECRET ?? DEFAULT_JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '2h',
};

if (!process.env.JWT_SECRET) {
  console.warn('JWT_SECRET is not set. Using default dev secret.');
}
