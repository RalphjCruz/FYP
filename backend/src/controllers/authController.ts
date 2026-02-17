import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../config/database.js';
import { env } from '../config/env.js';
import {
  clearLoginFailures,
  getClientIp,
  getLoginSecurityPolicy,
  getLoginSecurityStatus,
  logAuthAuditEvent,
  recordFailedLoginAttempt,
} from '../services/authSecurityService.js';
import type { AuthenticatedRequest } from '../types/auth.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const BCRYPT_ROUNDS = 10;

type UserRow = {
  id: number;
  email: string;
  username: string;
  password_hash: string;
  created_at: string;
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const getMinutesRemaining = (lockedUntil: string | null) => {
  if (!lockedUntil) {
    return 0;
  }

  const remainingMs = new Date(lockedUntil).getTime() - Date.now();
  if (remainingMs <= 0) {
    return 0;
  }

  return Math.max(1, Math.ceil(remainingMs / 60_000));
};

const safeLogAuthAuditEvent = async (params: Parameters<typeof logAuthAuditEvent>[0]) => {
  try {
    await logAuthAuditEvent(params);
  } catch (error) {
    console.error('Failed to write auth audit log:', error);
  }
};

const createAccessToken = (user: { id: number; email: string; username: string }) =>
  jwt.sign(
    {
      sub: String(user.id),
      email: user.email,
      username: user.username,
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'] },
  );

const validateRegistrationPayload = (body: unknown) => {
  const payload = body as Record<string, unknown>;
  const username = typeof payload.username === 'string' ? payload.username.trim() : '';
  const email = typeof payload.email === 'string' ? normalizeEmail(payload.email) : '';
  const password = typeof payload.password === 'string' ? payload.password : '';

  if (username.length < 3) {
    return { error: 'Username must be at least 3 characters long' };
  }

  if (!EMAIL_REGEX.test(email)) {
    return { error: 'Please provide a valid email address' };
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long` };
  }

  return { username, email, password };
};

export const register = async (req: Request, res: Response) => {
  const ipAddress = getClientIp(req.ip, req.headers['x-forwarded-for']);
  const validated = validateRegistrationPayload(req.body);
  if ('error' in validated) {
    await safeLogAuthAuditEvent({
      eventType: 'register_failed',
      email: typeof (req.body as Record<string, unknown>)?.email === 'string' ? normalizeEmail((req.body as Record<string, string>).email) : 'unknown',
      ipAddress,
      details: validated.error,
    });
    return res.status(400).json({ success: false, message: validated.error });
  }

  const { username, email, password } = validated;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const userResult = await client.query<UserRow>(
      `INSERT INTO users (email, password_hash, username)
       VALUES ($1, $2, $3)
       RETURNING id, email, username, password_hash, created_at`,
      [email, passwordHash, username],
    );

    const user = userResult.rows[0];

    await client.query(
      `INSERT INTO slimes (user_id, name, level, experience, color, evolution_stage)
       VALUES ($1, $2, 1, 0, 'green', 1)`,
      [user.id, `${username}'s Slime`],
    );

    await client.query('COMMIT');

    const token = createAccessToken(user);
    await safeLogAuthAuditEvent({
      eventType: 'register_success',
      email: user.email,
      userId: user.id,
      ipAddress,
      details: 'User registration completed successfully.',
    });

    return res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          createdAt: user.created_at,
        },
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');

    const pgError = error as { code?: string; detail?: string };
    if (pgError.code === '23505') {
      if (pgError.detail?.includes('(email)')) {
        await safeLogAuthAuditEvent({
          eventType: 'register_failed',
          email,
          ipAddress,
          details: 'Registration failed because email is already in use.',
        });
        return res.status(409).json({ success: false, message: 'Email already in use' });
      }

      if (pgError.detail?.includes('(username)')) {
        await safeLogAuthAuditEvent({
          eventType: 'register_failed',
          email,
          ipAddress,
          details: 'Registration failed because username is already in use.',
        });
        return res.status(409).json({ success: false, message: 'Username already in use' });
      }

      await safeLogAuthAuditEvent({
        eventType: 'register_failed',
        email,
        ipAddress,
        details: 'Registration failed because user already exists.',
      });
      return res.status(409).json({ success: false, message: 'User already exists' });
    }

    console.error('Registration error:', error);
    await safeLogAuthAuditEvent({
      eventType: 'register_failed',
      email,
      ipAddress,
      details: 'Unexpected registration error.',
    });
    return res.status(500).json({ success: false, message: 'Failed to register user' });
  } finally {
    client.release();
  }
};

export const login = async (req: Request, res: Response) => {
  const email = typeof req.body.email === 'string' ? normalizeEmail(req.body.email) : '';
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  const ipAddress = getClientIp(req.ip, req.headers['x-forwarded-for']);

  if (!EMAIL_REGEX.test(email) || password.length === 0) {
    return res.status(400).json({ success: false, message: 'Email and password are required' });
  }

  try {
    const securityStatus = await getLoginSecurityStatus(email);
    if (securityStatus.isLocked) {
      const minutesRemaining = getMinutesRemaining(securityStatus.lockedUntil);

      await safeLogAuthAuditEvent({
        eventType: 'login_blocked_locked',
        email,
        ipAddress,
        details: `Login blocked. Account locked until ${securityStatus.lockedUntil}.`,
      });

      return res.status(429).json({
        success: false,
        message: `Account temporarily locked due to repeated failed logins. Try again in about ${minutesRemaining} minute(s).`,
        data: {
          lockedUntil: securityStatus.lockedUntil,
          minutesRemaining,
        },
      });
    }

    const result = await pool.query<UserRow>(
      `SELECT id, email, username, password_hash, created_at
       FROM users
       WHERE email = $1`,
      [email],
    );

    const user = result.rows[0];
    if (!user) {
      const failedStatus = await recordFailedLoginAttempt(email, ipAddress);
      const policy = getLoginSecurityPolicy();

      if (failedStatus.isLocked) {
        const minutesRemaining = getMinutesRemaining(failedStatus.lockedUntil);

        return res.status(429).json({
          success: false,
          message: `Account temporarily locked after ${policy.maxAttempts} failed attempts in ${policy.windowMinutes} minutes. Try again in about ${minutesRemaining} minute(s).`,
          data: { lockedUntil: failedStatus.lockedUntil, minutesRemaining },
        });
      }

      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
      const failedStatus = await recordFailedLoginAttempt(email, ipAddress, user.id);
      const policy = getLoginSecurityPolicy();

      if (failedStatus.isLocked) {
        const minutesRemaining = getMinutesRemaining(failedStatus.lockedUntil);

        return res.status(429).json({
          success: false,
          message: `Account temporarily locked after ${policy.maxAttempts} failed attempts in ${policy.windowMinutes} minutes. Try again in about ${minutesRemaining} minute(s).`,
          data: { lockedUntil: failedStatus.lockedUntil, minutesRemaining },
        });
      }

      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    await clearLoginFailures(email);
    await safeLogAuthAuditEvent({
      eventType: 'login_success',
      email: user.email,
      userId: user.id,
      ipAddress,
      details: 'User login successful.',
    });

    const token = createAccessToken(user);

    return res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          createdAt: user.created_at,
        },
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    await safeLogAuthAuditEvent({
      eventType: 'login_failure',
      email,
      ipAddress,
      details: 'Unexpected login error.',
    });
    return res.status(500).json({ success: false, message: 'Failed to login' });
  }
};

export const getMe = async (req: AuthenticatedRequest, res: Response) => {
  const authenticatedUserId = req.user?.id;
  if (!authenticatedUserId) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  try {
    const result = await pool.query<{ id: number; email: string; username: string; created_at: string }>(
      `SELECT id, email, username, created_at
       FROM users
       WHERE id = $1`,
      [authenticatedUserId],
    );

    const user = result.rows[0];
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        username: user.username,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    console.error('GetMe error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch profile' });
  }
};
