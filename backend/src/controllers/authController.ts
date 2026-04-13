import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import {
  AuthAccountServiceError,
  findUserCredentialsByEmail,
  getUserProfileById,
  isPasswordMatch,
  registerUserWithSlime,
} from '../services/authAccountService.js';
import {
  clearLoginFailures,
  getClientIp,
  getLoginSecurityPolicy,
  getLoginSecurityStatus,
  logAuthAuditEvent,
  recordFailedLoginAttempt,
} from '../services/authSecurityService.js';
import type { AuthenticatedRequest } from '../types/auth.js';
import { getAuthenticatedUserId } from './validators/requestAuth.js';
import {
  isValidLoginPayload,
  parseLoginPayload,
  parseRegistrationEmailForAudit,
  validateRegistrationPayload,
} from './validators/authRequestValidators.js';
const BCRYPT_ROUNDS = 10;

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

export const register = async (req: Request, res: Response) => {
  const ipAddress = getClientIp(req.ip, req.headers['x-forwarded-for']);
  const validated = validateRegistrationPayload(req.body);
  if ('error' in validated) {
    await safeLogAuthAuditEvent({
      eventType: 'register_failed',
      email: parseRegistrationEmailForAudit(req.body),
      ipAddress,
      details: validated.error,
    });
    return res.status(400).json({ success: false, message: validated.error });
  }

  const { username, email, password } = validated;

  try {
    const { user } = await registerUserWithSlime({
      username,
      email,
      password,
      passwordHashRounds: BCRYPT_ROUNDS,
    });

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
          createdAt: user.createdAt,
        },
      },
    });
  } catch (error) {
    if (error instanceof AuthAccountServiceError) {
      if (error.code === 'EMAIL_IN_USE') {
        await safeLogAuthAuditEvent({
          eventType: 'register_failed',
          email,
          ipAddress,
          details: 'Registration failed because email is already in use.',
        });
        return res.status(409).json({ success: false, message: 'Email already in use' });
      }

      if (error.code === 'USERNAME_IN_USE') {
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
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = parseLoginPayload(req.body);
  const ipAddress = getClientIp(req.ip, req.headers['x-forwarded-for']);

  if (!isValidLoginPayload({ email, password })) {
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

    const user = await findUserCredentialsByEmail(email);
    if (!user || !user.isActive) {
      const failedStatus = await recordFailedLoginAttempt(email, ipAddress, user?.id);
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

    const passwordMatches = await isPasswordMatch(password, user.passwordHash);
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
          createdAt: user.createdAt,
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
  const authenticatedUserId = getAuthenticatedUserId(req);
  if (!authenticatedUserId) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  try {
    const user = await getUserProfileById(authenticatedUserId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        username: user.username,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('GetMe error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch profile' });
  }
};
